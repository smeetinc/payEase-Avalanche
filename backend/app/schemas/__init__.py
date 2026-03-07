from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import re


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Services ──────────────────────────────────────────────────────────────────

class ServiceOut(BaseModel):
    id: UUID
    name: str
    slug: str
    price_usd: Decimal
    description: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Subscription Intent ───────────────────────────────────────────────────────

class IntentCreate(BaseModel):
    service_id: UUID
    wallet_address: str

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Invalid Avalanche wallet address")
        return v.lower()


class IntentResponse(BaseModel):
    intent_id: UUID
    treasury_wallet: str
    exact_amount: Decimal
    expiry_time: datetime
    service_name: str
    status: str

    model_config = {"from_attributes": True}


class IntentStatusOut(BaseModel):
    intent_id: UUID
    status: str
    service_name: str
    created_at: datetime
    expires_at: datetime
    confirmed_at: Optional[datetime] = None
    tx_hash: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Virtual Card ──────────────────────────────────────────────────────────────

class CardOut(BaseModel):
    id: UUID
    last4: str
    expiry_month: str
    expiry_year: str
    status: str
    created_at: datetime
    service_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CardSensitiveOut(CardOut):
    """Returned exactly once after issuance. Contains full card number + CVV."""
    card_number: Optional[str] = None
    cvv: Optional[str] = None


# ── Dashboard ─────────────────────────────────────────────────────────────────

class TransactionHistoryItem(BaseModel):
    intent_id: UUID
    service_name: str
    amount_usdc: Decimal
    status: str
    created_at: datetime
    tx_hash: Optional[str] = None
    card_last4: Optional[str] = None
    card_id: Optional[UUID] = None

    model_config = {"from_attributes": True}
