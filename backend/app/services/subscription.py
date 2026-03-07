"""
Subscription intent business logic.
Handles unique amount generation, intent creation, expiry, and card issuance trigger.
"""
import random
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SubscriptionIntent, IntentStatus, Service, User, VirtualCard, CardStatus
from app.core.config import settings
from app.core.security import encrypt_field, decrypt_field
from app.services import reloadly

logger = logging.getLogger(__name__)
logger.setLevel(logging.ERROR)

INTENT_EXPIRY_MINUTES = 15
AMOUNT_OFFSET_RANGE = (0.000001, 0.000999)  # fractional USDC offset for uniqueness


# ── Pricing ───────────────────────────────────────────────────────────────────

def compute_subtotal(base_price: Decimal) -> Decimal:
    """Apply the service fee before any precision offset.
    Formula: subtotal = base_amount + service_fee
    """
    return (base_price + settings.SERVICE_FEE_USDC).quantize(Decimal("0.000001"))


# ── Amount Generation ─────────────────────────────────────────────────────────

async def _generate_unique_amount(session: AsyncSession, base_amount: Decimal) -> Decimal:
    """
    Add a small random fractional offset to make the payment amount unique.
    Retries up to 10 times to avoid collision with existing pending intents.
    """
    for _ in range(10):
        offset = Decimal(str(round(random.uniform(*AMOUNT_OFFSET_RANGE), 6)))
        candidate = (base_amount + offset).quantize(Decimal("0.000001"))

        # Check no pending intent with same expected_amount exists
        result = await session.execute(
            select(SubscriptionIntent).where(
                and_(
                    SubscriptionIntent.expected_amount == candidate,
                    SubscriptionIntent.status == IntentStatus.pending,
                )
            )
        )
        if not result.scalars().first():
            return candidate

    raise RuntimeError("Failed to generate unique payment amount after 10 attempts")


# ── Create Intent ─────────────────────────────────────────────────────────────

async def create_intent(
    session: AsyncSession,
    user_id: UUID,
    service_id: UUID,
    wallet_address: str,
) -> SubscriptionIntent:
    # Validate service
    service = await session.get(Service, service_id)
    if not service or not service.is_active:
        raise ValueError("Service not found or inactive")

    # Prevent duplicate open intents for same user+service
    existing = await session.execute(
        select(SubscriptionIntent).where(
            and_(
                SubscriptionIntent.user_id == user_id,
                SubscriptionIntent.service_id == service_id,
                SubscriptionIntent.status == IntentStatus.pending,
            )
        )
    )
    if existing.scalars().first():
        raise ValueError("You already have a pending intent for this service. Complete or wait for it to expire.")

    subtotal = compute_subtotal(service.price_usd)
    unique_amount = await _generate_unique_amount(session, subtotal)
    now = datetime.now(timezone.utc)

    intent = SubscriptionIntent(
        user_id=user_id,
        service_id=service_id,
        wallet_address=wallet_address.lower(),
        expected_amount=unique_amount,
        status=IntentStatus.pending,
        created_at=now,
        expires_at=now + timedelta(minutes=INTENT_EXPIRY_MINUTES),
    )
    session.add(intent)
    await session.flush()
    await session.refresh(intent, ["service"])
    return intent


# ── Get Intent Status ─────────────────────────────────────────────────────────

async def get_intent(session: AsyncSession, intent_id: UUID, user_id: UUID) -> Optional[SubscriptionIntent]:
    result = await session.execute(
        select(SubscriptionIntent).where(
            and_(
                SubscriptionIntent.id == intent_id,
                SubscriptionIntent.user_id == user_id,
            )
        )
    )
    return result.scalars().first()


# ── Expire Stale Intents ──────────────────────────────────────────────────────

async def expire_stale_intents(session: AsyncSession) -> int:
    """Mark all pending intents past their expiry as expired. Called periodically."""
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(SubscriptionIntent).where(
            and_(
                SubscriptionIntent.status == IntentStatus.pending,
                SubscriptionIntent.expires_at < now,
            )
        )
    )
    intents = result.scalars().all()
    for intent in intents:
        intent.status = IntentStatus.expired
    await session.flush()
    if intents:
        logger.info(f"Expired {len(intents)} stale intents")
    return len(intents)


# ── Issue Card After Payment Confirmation ─────────────────────────────────────

async def issue_card_for_intent(session: AsyncSession, intent_id: UUID) -> VirtualCard:
    """
    Called after blockchain confirmation.
    Issues a Reloadly virtual card and stores it (idempotent).
    """
    logger.info(f"Starting card issuance for intent {intent_id}")
    # Lock the intent row to prevent duplicate issuance
    result = await session.execute(
        select(SubscriptionIntent)
        .where(SubscriptionIntent.id == intent_id)
        .with_for_update()
    )
    intent = result.scalars().first()

    if not intent:
        logger.error(f"Intent {intent_id} not found")
        raise ValueError(f"Intent {intent_id} not found")

    if intent.status == IntentStatus.fulfilled:
        logger.warning(f"Intent {intent_id} already fulfilled, skipping card issuance")
        return intent.card

    if intent.status != IntentStatus.confirmed:
        logger.error(f"Intent {intent_id} is in status {intent.status}, cannot issue card")
        raise ValueError(f"Intent {intent_id} is in status {intent.status}, cannot issue card")

    # Check for existing card (extra idempotency guard)
    existing_card = await session.execute(
        select(VirtualCard).where(VirtualCard.subscription_intent_id == intent_id)
    )
    if existing_card.scalars().first():
        logger.warning(f"Card already exists for intent {intent_id}")
        intent.status = IntentStatus.fulfilled
        await session.flush()
        return existing_card.scalars().first()

    await session.refresh(intent, ["service"])
    amount = intent.expected_amount

    logger.info(f"Issuing Reloadly card for intent {intent_id}, amount={amount} USD")

    try:
        card_data = await reloadly.issue_virtual_card(amount_usd=amount)
        logger.info(f"Reloadly card data received: {card_data}")
    except Exception as e:
        logger.error(f"Reloadly card issuance failed for intent {intent_id}: {e}", exc_info=True)
        raise RuntimeError(f"Card issuance failed: {e}") from e

    card = VirtualCard(
        user_id=intent.user_id,
        subscription_intent_id=intent.id,
        reloadly_card_id=card_data["card_id"],
        last4=card_data["last4"],
        expiry_month=card_data["expiry_month"],
        expiry_year=card_data["expiry_year"],
        encrypted_card_number=encrypt_field(card_data["card_number"]) if card_data.get("card_number") else None,
        encrypted_cvv=encrypt_field(card_data["cvv"]) if card_data.get("cvv") else None,
        status=CardStatus.awaiting_charge,
    )
    session.add(card)
    intent.status = IntentStatus.fulfilled
    await session.flush()

    logger.info(f"Card issued successfully for intent {intent_id}, last4={card.last4}")
    return card


# ── Retrieve Card (sensitive, one-time) ───────────────────────────────────────

async def get_card_with_sensitive_data(session: AsyncSession, card_id: UUID, user_id: UUID) -> dict:
    """
    Returns card details including decrypted number + CVV.
    After retrieval, clears encrypted fields from DB (show-once).
    """
    result = await session.execute(
        select(VirtualCard).where(
            and_(VirtualCard.id == card_id, VirtualCard.user_id == user_id)
        ).with_for_update()
    )
    card = result.scalars().first()
    if not card:
        raise ValueError("Card not found")

    card_number = decrypt_field(card.encrypted_card_number) if card.encrypted_card_number else None
    cvv = decrypt_field(card.encrypted_cvv) if card.encrypted_cvv else None

    # Clear sensitive fields after first retrieval
    if card.encrypted_card_number or card.encrypted_cvv:
        card.encrypted_card_number = None
        card.encrypted_cvv = None
        await session.flush()

    return {
        "id": card.id,
        "last4": card.last4,
        "expiry_month": card.expiry_month,
        "expiry_year": card.expiry_year,
        "status": card.status,
        "created_at": card.created_at,
        "card_number": card_number,
        "cvv": cvv,
    }
