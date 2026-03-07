from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import base64
import bcrypt
from jose import JWTError, jwt
from cryptography.fernet import Fernet
from app.core.config import settings
fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())


# ── Password ──────────────────────────────────────────────────────────────────

def _prepare_password(password: str) -> bytes:
    """SHA-256 pre-hash so passwords > 72 bytes are handled safely."""
    digest = hashlib.sha256(password.encode()).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare_password(password), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prepare_password(plain), hashed.encode())


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# ── Field Encryption (for card data at rest) ──────────────────────────────────

def encrypt_field(value: str) -> str:
    """Encrypt a string field for storage."""
    return fernet.encrypt(value.encode()).decode()


def decrypt_field(value: str) -> str:
    """Decrypt a stored encrypted field."""
    return fernet.decrypt(value.encode()).decode()
