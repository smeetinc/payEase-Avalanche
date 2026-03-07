from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.api.routes import auth, services, subscriptions, cards, webhooks

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"PayEase API starting in {settings.APP_ENV} mode")
    yield
    logger.info("PayEase API shutting down")


app = FastAPI(
    title="PayEase API",
    description="Convert USDC on Avalanche into prepaid virtual cards for SaaS subscriptions",
    version="1.0.0-mvp",
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
)

# ── Middleware ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(services.router)
app.include_router(subscriptions.router)
app.include_router(cards.router)
app.include_router(webhooks.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "payease-api"}
