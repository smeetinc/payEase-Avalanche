"""
Tests for subscription intent creation and unique amount generation.
Run with: pytest tests/ -v
"""
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone, timedelta

from app.models import IntentStatus


# ── Amount generation tests ───────────────────────────────────────────────────

class TestUniqueAmount:
    @pytest.mark.asyncio
    async def test_amount_has_offset(self):
        """Generated amount should differ from base price."""
        from app.services.subscription import _generate_unique_amount
        session = AsyncMock()
        session.execute.return_value.scalars.return_value.first.return_value = None

        base = Decimal("8.00")
        result = await _generate_unique_amount(session, base)
        assert result != base
        assert result > base
        assert result < base + Decimal("0.001")

    @pytest.mark.asyncio
    async def test_collision_retry(self):
        """Should retry when amount collides with existing pending intent."""
        from app.services.subscription import _generate_unique_amount
        session = AsyncMock()

        # First 3 calls return a collision, 4th returns None (no collision)
        mock_intent = MagicMock()
        session.execute.return_value.scalars.return_value.first.side_effect = [
            mock_intent, mock_intent, mock_intent, None
        ]

        base = Decimal("20.00")
        result = await _generate_unique_amount(session, base)
        assert result > base
        assert session.execute.call_count == 4


# ── Intent creation tests ─────────────────────────────────────────────────────

class TestCreateIntent:
    @pytest.mark.asyncio
    async def test_invalid_service_raises(self):
        from app.services.subscription import create_intent
        session = AsyncMock()
        session.get.return_value = None  # service not found

        with pytest.raises(ValueError, match="Service not found"):
            await create_intent(session, uuid4(), uuid4(), "0x" + "a" * 40)

    @pytest.mark.asyncio
    async def test_duplicate_intent_raises(self):
        from app.services.subscription import create_intent
        from app.models import Service

        mock_service = MagicMock(spec=Service)
        mock_service.is_active = True
        mock_service.price_usd = Decimal("8.00")

        session = AsyncMock()
        session.get.return_value = mock_service
        # existing pending intent found
        session.execute.return_value.scalars.return_value.first.return_value = MagicMock()

        with pytest.raises(ValueError, match="pending intent"):
            await create_intent(session, uuid4(), uuid4(), "0x" + "a" * 40)


# ── Listener tests ────────────────────────────────────────────────────────────

class TestListener:
    def test_wei_to_usdc_conversion(self):
        from app.listeners.avalanche import wei_to_usdc
        # 8.000123 USDC = 8_000_123 units
        assert wei_to_usdc(8_000_123) == Decimal("8.000123")
        assert wei_to_usdc(20_000_000) == Decimal("20.000000")

    @pytest.mark.asyncio
    async def test_wrong_treasury_returns_none(self):
        from app.listeners.avalanche import find_matching_intent
        session = AsyncMock()

        with patch("app.listeners.avalanche.settings") as mock_settings:
            mock_settings.TREASURY_WALLET_ADDRESS = "0xTREASURY"
            result = await find_matching_intent(
                session,
                from_address="0xUSER",
                to_address="0xOTHER",  # wrong destination
                amount_usdc=Decimal("8.000123"),
            )
        assert result is None
        session.execute.assert_not_called()
