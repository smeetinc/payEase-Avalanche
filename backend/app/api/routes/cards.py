from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models import User, VirtualCard, SubscriptionIntent
from app.schemas import CardOut, CardSensitiveOut, TransactionHistoryItem
from app.api.deps import get_current_user
from app.services.subscription import get_card_with_sensitive_data

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("", response_model=List[CardOut])
async def list_cards(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all cards for the current user (masked, no sensitive data)."""
    result = await session.execute(
        select(VirtualCard)
        .where(VirtualCard.user_id == current_user.id)
        .order_by(VirtualCard.created_at.desc())
    )
    cards = result.scalars().all()

    out = []
    for card in cards:
        await session.refresh(card, ["intent"])
        await session.refresh(card.intent, ["service"])
        out.append(CardOut(
            id=card.id,
            last4=card.last4,
            expiry_month=card.expiry_month,
            expiry_year=card.expiry_year,
            status=card.status,
            created_at=card.created_at,
            service_name=card.intent.service.name,
        ))
    return out


@router.get("/{card_id}/reveal", response_model=CardSensitiveOut)
async def reveal_card(
    card_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reveal full card number and CVV. This is a one-time operation —
    after this call, sensitive data is cleared from the database.
    """
    try:
        data = await get_card_with_sensitive_data(session, card_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return CardSensitiveOut(
        id=data["id"],
        last4=data["last4"],
        expiry_month=data["expiry_month"],
        expiry_year=data["expiry_year"],
        status=data["status"],
        created_at=data["created_at"],
        card_number=data.get("card_number"),
        cvv=data.get("cvv"),
    )


@router.get("/dashboard/history", response_model=List[TransactionHistoryItem])
async def transaction_history(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full transaction history with intent + card info."""
    result = await session.execute(
        select(SubscriptionIntent)
        .where(SubscriptionIntent.user_id == current_user.id)
        .order_by(SubscriptionIntent.created_at.desc())
    )
    intents = result.scalars().all()

    history = []
    for intent in intents:
        await session.refresh(intent, ["service", "card"])
        history.append(TransactionHistoryItem(
            intent_id=intent.id,
            service_name=intent.service.name,
            amount_usdc=intent.expected_amount,
            status=intent.status,
            created_at=intent.created_at,
            tx_hash=intent.tx_hash,
            card_last4=intent.card.last4 if intent.card else None,
            card_id=intent.card.id if intent.card else None,
        ))
    return history
