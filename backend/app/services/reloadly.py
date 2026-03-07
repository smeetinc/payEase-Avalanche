"""
Reloadly Virtual Card API client.
Handles OAuth token management and card issuance.
"""
import httpx
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.ERROR)

_token_cache: dict = {"token": None, "expires_at": None}


async def _get_access_token() -> str:
    """Fetch or return cached Reloadly OAuth token."""
    now = datetime.now(timezone.utc)
    if _token_cache["token"] and _token_cache["expires_at"] > now:
        return _token_cache["token"]

    logger.info("Fetching new Reloadly OAuth token")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            settings.RELOADLY_AUTH_URL,
            json={
                "client_id": settings.RELOADLY_CLIENT_ID,
                "client_secret": settings.RELOADLY_CLIENT_SECRET,
                "grant_type": "client_credentials",
                "audience": settings.RELOADLY_AUDIENCE,
            },
        )
        logger.info(f"Reloadly token request status: {resp.status_code}")
        logger.info(f"Reloadly token request response: {resp.text}")
        resp.raise_for_status()
        data = resp.json()

    token = data["access_token"]
    expires_in = data.get("expires_in", 3600)
    _token_cache["token"] = token
    _token_cache["expires_at"] = now + timedelta(seconds=expires_in - 60)

    logger.info("Reloadly OAuth token refreshed")
    return token


async def issue_virtual_card(amount_usd: Decimal, currency_code: str = "USD") -> dict:
    """
    Issue a virtual prepaid card loaded with the given amount.

    Returns dict with:
        card_id, card_number, cvv, expiry_month, expiry_year, last4
    """
    token = await _get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/com.reloadly.giftcards-v1+json",
    }

    payload = {
    "productId": settings.RELOADLY_PRODUCT_ID,
    "countryCode": "US",
    "quantity": 1,
    "unitPrice": float(amount_usd),
    "customIdentifier": None,
    "preOrder": False,
    "senderName": "PayEase",
    "recipientEmail": None,  # optionally pass user email
    "recipientPhoneDetails": None,
}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.RELOADLY_BASE_URL}/orders",
            json=payload,
            headers=headers,
        )

        logger.error(f"Reloadly order request status: {resp.status_code}")
        logger.error(f"Reloadly order request response: {resp.text}")

        if resp.status_code == 401:
            # Token expired mid-flight, clear cache and retry once
            _token_cache["token"] = None
            token = await _get_access_token()
            headers["Authorization"] = f"Bearer {token}"
            resp = await client.post(
                f"{settings.RELOADLY_BASE_URL}/orders",
                json=payload,
                headers=headers,
            )
            logger.error(f"Reloadly order retry status: {resp.status_code}")
            logger.error(f"Reloadly order retry response: {resp.text}")

        resp_text = resp.text  # capture before raise_for_status
        if not resp.is_success:
            logger.error(f"Reloadly /orders error {resp.status_code}: {resp_text}")
        resp.raise_for_status()
        data = resp.json()
        transaction_id = data["transactionId"]

        # Fetch the actual card details
        card_resp = await client.get(
            f"{settings.RELOADLY_BASE_URL}/orders/transactions/{transaction_id}/cards",
            headers=headers,
        )
        logger.error(f"Reloadly card details status: {card_resp.status_code}")
        logger.error(f"Reloadly card details response: {card_resp.text}")
        card_resp.raise_for_status()
        cards = card_resp.json()

    card_info = cards[0] if isinstance(cards, list) and cards else {}
    card_number = str(card_info.get("cardNumber", ""))
    return {
        "card_id": str(transaction_id),
        "card_number": card_number,
        "cvv": str(card_info.get("pinCode", card_info.get("cvv", ""))),  # Reloadly uses "pinCode" for some products
        "expiry_month": str(card_info.get("expiryMonth", card_info.get("expirationMonth", ""))),
        "expiry_year": str(card_info.get("expiryYear", card_info.get("expirationYear", ""))),
        "last4": card_number[-4:] if len(card_number) >= 4 else "****",
    }


async def get_card_balance(card_id: str) -> Optional[Decimal]:
    """Check remaining balance on a card (used for webhook reconciliation)."""
    try:
        token = await _get_access_token()
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.RELOADLY_BASE_URL}/cards/{card_id}/balance",
                headers=headers,
            )
            resp.raise_for_status()
            return Decimal(str(resp.json().get("balance", 0)))
    except Exception as e:
        logger.error(f"Failed to fetch card balance for {card_id}: {e}")
        return None
