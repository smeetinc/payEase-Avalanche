"""
Avalanche USDC Transfer event listener.

Run as a standalone process:
    python -m app.listeners.avalanche

- Polls for new blocks every LISTENER_POLL_INTERVAL seconds
- Parses ERC-20 Transfer events on the USDC contract
- Matches transfers to pending SubscriptionIntents
- Waits AVALANCHE_CONFIRMATIONS blocks before confirming
- Checkpoints last processed block to DB for crash recovery
- Idempotent: tx_hash unique constraint prevents double processing
"""

import asyncio
import logging
import sys
from decimal import Decimal
from datetime import datetime, timezone

from web3 import AsyncWeb3
from web3.providers import AsyncHTTPProvider
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import (
    SubscriptionIntent, IntentStatus,
    ListenerCheckpoint, VirtualCard
)
from app.services.subscription import issue_card_for_intent

logging.basicConfig(
    level=logging.ERROR,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("payease.listener")

# USDC ERC-20 Transfer event ABI
TRANSFER_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"},
        ],
        "name": "Transfer",
        "type": "event",
    }
]

USDC_DECIMALS = 6  # USDC uses 6 decimal places


def wei_to_usdc(amount: int) -> Decimal:
    return Decimal(amount) / Decimal(10 ** USDC_DECIMALS)


async def get_or_create_checkpoint(session: AsyncSession) -> ListenerCheckpoint:
    result = await session.execute(
        select(ListenerCheckpoint).where(ListenerCheckpoint.network == "avalanche")
    )
    checkpoint = result.scalars().first()
    if not checkpoint:
        checkpoint = ListenerCheckpoint(network="avalanche", last_block=0)
        session.add(checkpoint)
        await session.flush()
    return checkpoint


async def save_checkpoint(session: AsyncSession, block_number: int):
    await session.execute(
        update(ListenerCheckpoint)
        .where(ListenerCheckpoint.network == "avalanche")
        .values(last_block=block_number, updated_at=datetime.now(timezone.utc))
    )
    await session.commit()


async def find_matching_intent(
    session: AsyncSession,
    from_address: str,
    to_address: str,
    amount_usdc: Decimal,
) -> SubscriptionIntent | None:
    """Find a pending intent matching this transfer's from, to, and amount."""
    treasury = settings.TREASURY_WALLET_ADDRESS.lower()
    if to_address.lower() != treasury:
        return None

    # Use a tight tolerance for amount matching (±0.001 USDC) to handle
    # only the fractional precision offset, not whole-cent differences.
    tolerance = Decimal("0.001")
    result = await session.execute(
        select(SubscriptionIntent)
        .where(
            and_(
                SubscriptionIntent.wallet_address == from_address.lower(),
                SubscriptionIntent.expected_amount >= (amount_usdc - tolerance),
                SubscriptionIntent.expected_amount <= (amount_usdc + tolerance),
                SubscriptionIntent.status == IntentStatus.pending,
                SubscriptionIntent.tx_hash.is_(None),
            )
        )
        .with_for_update(skip_locked=True)
    )
    return result.scalars().first()


async def process_transfer_event(
    session: AsyncSession,
    event: dict,
    current_block: int,
):
    """Process a single Transfer event log."""
    tx_hash = event["transactionHash"].hex()
    from_addr = event["args"]["from"].lower()
    to_addr = event["args"]["to"].lower()
    value_raw = event["args"]["value"]
    amount_usdc = wei_to_usdc(value_raw)
    event_block = event["blockNumber"]

    # Check confirmations
    confirmations = current_block - event_block
    if confirmations < settings.AVALANCHE_CONFIRMATIONS:
        logger.debug(f"tx {tx_hash} only has {confirmations} confirmations, skipping")
        return

    # Check for already-processed tx
    existing = await session.execute(
        select(SubscriptionIntent).where(SubscriptionIntent.tx_hash == tx_hash)
    )
    if existing.scalars().first():
        logger.debug(f"tx {tx_hash} already processed, skipping")
        return

    intent = await find_matching_intent(session, from_addr, to_addr, amount_usdc)

    if not intent:
        # Check if this is a late payment (expired intent)
        result = await session.execute(
            select(SubscriptionIntent).where(
                and_(
                    SubscriptionIntent.wallet_address == from_addr,
                    SubscriptionIntent.expected_amount == amount_usdc,
                    SubscriptionIntent.status == IntentStatus.expired,
                )
            )
        )
        expired_intent = result.scalars().first()
        if expired_intent:
            expired_intent.status = IntentStatus.unallocated
            expired_intent.tx_hash = tx_hash
            await session.flush()
            logger.warning(
                f"Late payment detected for expired intent {expired_intent.id}. "
                f"tx={tx_hash}, amount={amount_usdc} USDC. Marked as unallocated."
            )
        else:
            logger.info(f"No matching intent for tx {tx_hash} (from={from_addr}, amount={amount_usdc})")
        return

    # Confirm the intent
    now = datetime.now(timezone.utc)
    if intent.expires_at < now:
        intent.status = IntentStatus.unallocated
        intent.tx_hash = tx_hash
        await session.flush()
        logger.warning(f"Payment arrived after expiry for intent {intent.id}. Marked unallocated.")
        return

    intent.status = IntentStatus.confirmed
    intent.tx_hash = tx_hash
    intent.confirmed_at = now
    await session.flush()
    logger.info(
        f"Intent {intent.id} confirmed: expected={intent.expected_amount}, "
        f"received={amount_usdc}, diff={amount_usdc - intent.expected_amount}, tx={tx_hash}"
    )

    # Issue card
    try:
        await issue_card_for_intent(session, intent.id)
        await session.commit()
        logger.info(f"Card issued for intent {intent.id}")
    except Exception as e:
        await session.rollback()
        logger.error(f"Card issuance failed for intent {intent.id}: {e}")
        # Intent stays confirmed — can be retried by a reconciliation job


async def scan_block_range(
    w3: AsyncWeb3,
    usdc_contract,
    session: AsyncSession,
    from_block: int,
    to_block: int,
):
    """Fetch and process Transfer events in a block range."""
    try:
        current_block = await w3.eth.block_number
        events = await usdc_contract.events.Transfer.get_logs(
            from_block=from_block,
            to_block=to_block,
            # Must use checksum-cased address — many RPC nodes reject lowercase in topic filters
            argument_filters={"to": w3.to_checksum_address(settings.TREASURY_WALLET_ADDRESS)},
        )
        logger.info(f"Scanned blocks {from_block}–{to_block}: {len(events)} Transfer events")
        for event in events:
            await process_transfer_event(session, event, current_block)
    except Exception as e:
        logger.error(f"Error scanning blocks {from_block}–{to_block}: {e}")
        raise


async def run_listener():
    logger.info("PayEase Avalanche listener starting…")

    w3 = AsyncWeb3(AsyncHTTPProvider(settings.AVALANCHE_RPC_URL))
    usdc_contract = w3.eth.contract(
        address=w3.to_checksum_address(settings.USDC_CONTRACT_ADDRESS),
        abi=TRANSFER_ABI,
    )

    async with AsyncSessionLocal() as session:
        checkpoint = await get_or_create_checkpoint(session)
        await session.commit()
        last_block = checkpoint.last_block

        if last_block == 0:
            # Start from current block on first run
            last_block = await w3.eth.block_number
            logger.info(f"First run: starting from block {last_block}")

    logger.info(f"Resuming from block {last_block}")

    while True:
        try:
            current_block = await w3.eth.block_number

            if current_block > last_block:
                # Scan in chunks of 500 blocks to avoid RPC limits
                chunk_size = 500
                scan_from = last_block + 1
                scan_to = min(current_block, last_block + chunk_size)

                async with AsyncSessionLocal() as session:
                    await scan_block_range(w3, usdc_contract, session, scan_from, scan_to)
                    await session.commit()

                last_block = scan_to
                async with AsyncSessionLocal() as session:
                    await save_checkpoint(session, last_block)

            else:
                logger.info(f"No new blocks (current={current_block}, last={last_block})")

        except Exception as e:
            logger.error(f"Listener loop error: {e}", exc_info=True)

        await asyncio.sleep(settings.LISTENER_POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(run_listener())
