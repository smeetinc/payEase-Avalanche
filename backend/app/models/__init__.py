import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Numeric,
    Enum as SAEnum, Boolean, Integer, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base


def utcnow():
    return datetime.now(timezone.utc)


class IntentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    expired = "expired"
    fulfilled = "fulfilled"
    unallocated = "unallocated"  # payment received after expiry


class CardStatus(str, enum.Enum):
    active = "active"
    awaiting_charge = "awaiting_charge"
    used = "used"
    revoked = "revoked"


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    intents = relationship("SubscriptionIntent", back_populates="user")
    cards = relationship("VirtualCard", back_populates="user")


# ── Service (X Premium, Replit Pro, etc.) ─────────────────────────────────────

class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    price_usd = Column(Numeric(10, 6), nullable=False)  # 6 places to match USDC and SubscriptionIntent.expected_amount
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    intents = relationship("SubscriptionIntent", back_populates="service")


# ── Subscription Intent ───────────────────────────────────────────────────────

class SubscriptionIntent(Base):
    __tablename__ = "subscription_intents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False)

    wallet_address = Column(String(42), nullable=False)
    expected_amount = Column(Numeric(18, 6), nullable=False)  # USDC has 6 decimals
    tx_hash = Column(String(66), nullable=True, unique=True)

    status = Column(
        SAEnum(IntentStatus, name="intent_status"),
        default=IntentStatus.pending,
        nullable=False,
        index=True,
    )

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="intents")
    service = relationship("Service", back_populates="intents")
    card = relationship("VirtualCard", back_populates="intent", uselist=False)


# ── Virtual Card ──────────────────────────────────────────────────────────────

class VirtualCard(Base):
    __tablename__ = "virtual_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    subscription_intent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscription_intents.id"),
        nullable=False,
        unique=True,
    )

    reloadly_card_id = Column(String(100), nullable=False)
    last4 = Column(String(4), nullable=False)
    expiry_month = Column(String(2), nullable=False)
    expiry_year = Column(String(4), nullable=False)

    # Encrypted fields
    encrypted_card_number = Column(Text, nullable=True)   # shown once, then cleared
    encrypted_cvv = Column(Text, nullable=True)           # shown once, then cleared

    status = Column(
        SAEnum(CardStatus, name="card_status"),
        default=CardStatus.active,
        nullable=False,
        index=True,
    )

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="cards")
    intent = relationship("SubscriptionIntent", back_populates="card")


# ── Listener Checkpoint ───────────────────────────────────────────────────────

class ListenerCheckpoint(Base):
    """Tracks the last processed block so the listener can resume after crashes."""
    __tablename__ = "listener_checkpoints"

    id = Column(Integer, primary_key=True, autoincrement=True)
    network = Column(String(50), nullable=False, unique=True, default="avalanche")
    last_block = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
