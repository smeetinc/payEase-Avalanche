from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timezone
import logging

from web3 import AsyncWeb3
from web3.providers import AsyncHTTPProvider

from app.db.session import get_db
from app.models import User, SubscriptionIntent, IntentStatus
from app.schemas import IntentCreate, IntentResponse, IntentStatusOut
from app.api.deps import get_current_user
from app.services import subscription as svc
from app.core.config import settings
from app.listeners.avalanche import TRANSFER_ABI, wei_to_usdc

logger = logging.getLogger(__name__)
logger.setLevel(logging.ERROR)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.post("/intent", response_model=IntentResponse, status_code=status.HTTP_201_CREATED)
async def create_intent(
    payload: IntentCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        intent = await svc.create_intent(
            session=session,
            user_id=current_user.id,
            service_id=payload.service_id,
            wallet_address=payload.wallet_address,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return IntentResponse(
        intent_id=intent.id,
        treasury_wallet=settings.TREASURY_WALLET_ADDRESS,
        exact_amount=intent.expected_amount,
        expiry_time=intent.expires_at,
        service_name=intent.service.name,
        status=intent.status,
    )


@router.get("/intent/{intent_id}", response_model=IntentStatusOut)
async def get_intent_status(
    intent_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    intent = await svc.get_intent(session, intent_id, current_user.id)
    if not intent:
        raise HTTPException(status_code=404, detail="Intent not found")

    await session.refresh(intent, ["service"])
    return IntentStatusOut(
        intent_id=intent.id,
        status=intent.status,
        service_name=intent.service.name,
        created_at=intent.created_at,
        expires_at=intent.expires_at,
        confirmed_at=intent.confirmed_at,
        tx_hash=intent.tx_hash,
    )


@router.get("/intents", response_model=List[IntentStatusOut])
async def list_intents(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(SubscriptionIntent)
        .where(SubscriptionIntent.user_id == current_user.id)
        .order_by(SubscriptionIntent.created_at.desc())
    )
    intents = result.scalars().all()

    out = []
    for intent in intents:
        await session.refresh(intent, ["service"])
        out.append(IntentStatusOut(
            intent_id=intent.id,
            status=intent.status,
            service_name=intent.service.name,
            created_at=intent.created_at,
            expires_at=intent.expires_at,
            confirmed_at=intent.confirmed_at,
            tx_hash=intent.tx_hash,
        ))
    return out


@router.post("/intent/{intent_id}/verify", response_model=IntentStatusOut)
async def verify_intent_payment(
    intent_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    On-demand blockchain verification for a pending intent.
    Checks recent blocks for a matching USDC Transfer to our treasury.
    This supplements the background listener so payments are detected
    even when the listener process isn't running.
    """
    intent = await svc.get_intent(session, intent_id, current_user.id)
    if not intent:
        raise HTTPException(status_code=404, detail="Intent not found")

    
    # Only verify pending intents
    if intent.status != IntentStatus.pending:
        await session.refresh(intent, ["service"])
        return IntentStatusOut(
            intent_id=intent.id,
            status=intent.status,
            service_name=intent.service.name,
            created_at=intent.created_at,
            expires_at=intent.expires_at,
            confirmed_at=intent.confirmed_at,
            tx_hash=intent.tx_hash,
        )

    # Scan the last ~200 blocks (~7 minutes on Fuji at 2s/block)
    try:
        w3 = AsyncWeb3(AsyncHTTPProvider(settings.AVALANCHE_RPC_URL))
        usdc_contract = w3.eth.contract(
            address=w3.to_checksum_address(settings.USDC_CONTRACT_ADDRESS),
            abi=TRANSFER_ABI,
        )
        current_block = await w3.eth.block_number
        from_block = max(0, current_block - 200)

        events = await usdc_contract.events.Transfer.get_logs(
            from_block=from_block,
            to_block=current_block,
            argument_filters={"to": w3.to_checksum_address(settings.TREASURY_WALLET_ADDRESS)},
        )

        tolerance = Decimal("0.001")
        for event in events:
            from_addr = event["args"]["from"].lower()
            value_raw = event["args"]["value"]
            amount_usdc = wei_to_usdc(value_raw)
            tx_hash = event["transactionHash"].hex()

            # Check wallet match and amount within tolerance
            if (
                from_addr == intent.wallet_address
                and abs(amount_usdc - intent.expected_amount) <= tolerance
            ):
                # Check confirmations
                confirmations = current_block - event["blockNumber"]
                if confirmations < settings.AVALANCHE_CONFIRMATIONS:
                    continue

                # Check not already used
                existing = await session.execute(
                    select(SubscriptionIntent).where(SubscriptionIntent.tx_hash == tx_hash)
                )
                if existing.scalars().first():
                    continue

                # Confirm the intent
                now = datetime.now(timezone.utc)
                intent.status = IntentStatus.confirmed
                intent.tx_hash = tx_hash
                intent.confirmed_at = now
                await session.flush()

                # Issue card
                try:
                    from app.services.subscription import issue_card_for_intent
                    await issue_card_for_intent(session, intent.id)
                    await session.commit()
                    logger.info(f"Verify: Card issued for intent {intent.id}")
                    # Refresh intent data from DB to get the updated status and card association
                    intent = await svc.get_intent(session, intent.id, current_user.id)
                except Exception as e:
                    await session.commit()  # commit the confirmation at least
                    logger.error(f"Verify: Card issuance failed for intent {intent.id}: {e}")
                break

    except Exception as e:
        logger.error(f"On-demand verify failed for intent {intent_id}: {e}")
        # Don't fail the request — just return current status

    await session.refresh(intent, ["service"])
    return IntentStatusOut(
        intent_id=intent.id,
        status=intent.status,
        service_name=intent.service.name,
        created_at=intent.created_at,
        expires_at=intent.expires_at,
        confirmed_at=intent.confirmed_at,
        tx_hash=intent.tx_hash,
    )
