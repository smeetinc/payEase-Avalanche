from decimal import Decimal

from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    DATABASE_URL: str
    SYNC_DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Avalanche
    AVALANCHE_RPC_URL: str
    # Fuji testnet USDC — override with mainnet address (0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6) in production .env
    USDC_CONTRACT_ADDRESS: str = "0x5425890298aed601595a70AB815c96711a31Bc65"
    TREASURY_WALLET_ADDRESS: str
    AVALANCHE_CONFIRMATIONS: int = 3
    LISTENER_POLL_INTERVAL: int = 3  # seconds
    SERVICE_FEE_USDC: Decimal = Decimal("0.50")  # flat service fee added to every subscription

    # Reloadly
    RELOADLY_CLIENT_ID: str
    RELOADLY_CLIENT_SECRET: str
    RELOADLY_BASE_URL: str = "https://giftcards-sandbox.reloadly.com"
    RELOADLY_AUTH_URL: str = "https://auth.reloadly.com/oauth/token"
    RELOADLY_AUDIENCE: str = "https://giftcards-sandbox.reloadly.com"
    # Webhook signing secret (set this from your Reloadly dashboard)
    RELOADLY_WEBHOOK_SECRET: str = ""
    RELOADLY_PRODUCT_ID: int = 20308  # override in .env


    # Encryption
    FIELD_ENCRYPTION_KEY: str

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
