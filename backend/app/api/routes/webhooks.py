"""
Webhook endpoint for Reloadly card transaction events.
Used to detect first charge and mark card as used/frozen.
"""
import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models import CardStatus, VirtualCard

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)

# Headers sent by Reloadly on every webhook delivery
SIGNATURE_HEADER = "X-Reloadly-Signature"
TIMESTAMP_HEADER = "X-Reloadly-Request-Timestamp"


def _verify_reloadly_signature(raw_body: bytes, signature: str | None, timestamp: str | None) -> None:
    """
    Verify the Reloadly HMAC-SHA256 webhook signature.

    Reloadly signs the concatenated string  ``<raw_body>:<timestamp>``
    with the webhook signing secret from your dashboard, and sends the
    resulting hex-digest in X-Reloadly-Signature.

    Raises HTTPException on any verification failure.
    """
    secret = settings.RELOADLY_WEBHOOK_SECRET
    if not secret:
        logger.error(
            "RELOADLY_WEBHOOK_SECRET is not configured. "
            "Set it from your Reloadly dashboard → Webhooks."
        )
        raise HTTPException(status_code=500, detail="Webhook secret not configured on the server.")

    if not signature:
        logger.warning("Reloadly webhook received without %s header.", SIGNATURE_HEADER)
        raise HTTPException(status_code=401, detail="Missing webhook signature.")

    if not timestamp:
        logger.warning("Reloadly webhook received without %s header.", TIMESTAMP_HEADER)
        raise HTTPException(status_code=401, detail="Missing webhook timestamp.")

    # data_to_sign = "<raw_payload>:<timestamp>"  (matches the Ruby example)
    data_to_sign = raw_body + b":" + timestamp.encode("utf-8")

    expected = hmac.new(
        secret.encode("utf-8"),
        data_to_sign,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        logger.warning("Reloadly webhook signature mismatch – request rejected.")
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")


@router.post("/reloadly/card-transaction")
async def reloadly_card_transaction(
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    """
    Called by Reloadly when a card is charged.

    1. Reads the raw body.
    2. Verifies the HMAC-SHA256 signature (payload + ":" + timestamp).
    3. On any charge event → marks the card as used.
    """
    raw_body = await request.body()

    _verify_reloadly_signature(
        raw_body,
        request.headers.get(SIGNATURE_HEADER),
        request.headers.get(TIMESTAMP_HEADER),
    )

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logger.info("Reloadly webhook received: %s", payload)

    card_id = payload.get("cardId") or payload.get("card_id")
    event_type = payload.get("event") or payload.get("type", "")

    if not card_id:
        logger.warning("Webhook missing cardId, ignoring")
        return {"status": "ignored"}

    result = await session.execute(
        select(VirtualCard).where(VirtualCard.reloadly_card_id == str(card_id))
    )
    card = result.scalars().first()

    if not card:
        logger.warning("Webhook: no card found for reloadly_card_id=%s", card_id)
        return {"status": "not_found"}

    if card.status in (CardStatus.active, CardStatus.awaiting_charge):
        card.status = CardStatus.used
        await session.flush()
        logger.info("Card %s (last4=%s) marked as used after charge event", card.id, card.last4)

    return {"status": "ok"}
