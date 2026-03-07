# PayEase Backend — MVP

Convert USDC on Avalanche into prepaid virtual cards for global SaaS subscriptions.

## Architecture

```
User ──USDC──► Avalanche Treasury Wallet
                      │
              Blockchain Listener (standalone process)
                      │ (3 confirmations)
              Subscription Intent confirmed
                      │
              Reloadly Card Issued
                      │
              Encrypted card stored, delivered to user via API
```

## Services

| Service | Description |
|---|---|
| `api` | FastAPI REST API (uvicorn) |
| `listener` | Avalanche block watcher (standalone Python process) |
| `db` | PostgreSQL |
| `redis` | Ready for Celery if you want to migrate listener later |

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Fill in all values in .env
```

### 2. Generate a Fernet encryption key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Paste output as FIELD_ENCRYPTION_KEY in .env
```

### 3. Start with Docker

```bash
docker-compose up --build
```

### 4. Run migrations

```bash
docker-compose exec api alembic upgrade head
```

### 5. Test the API

```
http://localhost:8000/docs
```

---

## Running Without Docker

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run API
uvicorn app.main:app --reload --port 8000

# Run listener (separate terminal)
python -m app.listeners.avalanche
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user info |

### Services

| Method | Endpoint | Description |
|---|---|---|
| GET | `/services` | List available SaaS services |
| GET | `/services/{id}` | Get service details |

### Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/subscriptions/intent` | Create payment intent |
| GET | `/subscriptions/intent/{id}` | Poll intent status |
| GET | `/subscriptions/intents` | List all user intents |

**Create intent request:**
```json
{
  "service_id": "uuid",
  "wallet_address": "0x..."
}
```

**Response:**
```json
{
  "intent_id": "uuid",
  "treasury_wallet": "0xYOUR_TREASURY",
  "exact_amount": "8.000347",
  "expiry_time": "2024-01-01T00:15:00Z",
  "service_name": "X Premium",
  "status": "pending"
}
```

User must send **exactly** `exact_amount` USDC to `treasury_wallet` from their registered `wallet_address` within 15 minutes.

### Cards

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cards` | List user's cards (masked) |
| GET | `/cards/{id}/reveal` | **One-time** reveal of full card + CVV |
| GET | `/cards/dashboard/history` | Full transaction history |

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| POST | `/webhooks/reloadly/card-transaction` | Reloadly card charge event |

---

## Key Design Decisions

### Unique Amount Tracking
Since Avalanche ERC-20 transfers have no memo field, payments are matched by:
- `from` address (user's registered wallet)
- `to` address (treasury wallet)
- **exact amount** (base price + tiny random fractional offset, e.g. `$8.000347`)

### Single-Use Cards
- Card loaded with exact subscription amount
- Sensitive data (card number, CVV) encrypted with Fernet at rest
- `/cards/{id}/reveal` decrypts and returns data **once**, then clears encrypted fields from DB
- Reloadly webhook marks card `used` on first charge

### Listener Crash Recovery
The `listener_checkpoints` table stores the last processed block. On restart, the listener resumes from that block. Checkpoints are saved after every batch.

### Idempotency Guards
- `tx_hash` unique constraint prevents double-processing
- `SELECT ... FOR UPDATE SKIP LOCKED` on intent matching
- Duplicate card issuance check before calling Reloadly
- Intent status must be `confirmed` before card issuance proceeds

---

## Environment Variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing key (generate randomly) |
| `DATABASE_URL` | Async PostgreSQL URL |
| `SYNC_DATABASE_URL` | Sync PostgreSQL URL (for Alembic) |
| `AVALANCHE_RPC_URL` | Your Avalanche C-Chain RPC endpoint |
| `USDC_CONTRACT_ADDRESS` | USDC contract on Avalanche (default: mainnet) |
| `TREASURY_WALLET_ADDRESS` | Your receiving wallet address |
| `RELOADLY_CLIENT_ID` | Reloadly API client ID |
| `RELOADLY_CLIENT_SECRET` | Reloadly API client secret |
| `FIELD_ENCRYPTION_KEY` | Fernet key for card data encryption |

---

## Adding New Services

Insert a row into the `services` table:

```sql
INSERT INTO services (id, name, slug, price_usd, description, is_active, created_at)
VALUES (gen_random_uuid(), 'Claude Pro', 'claude-pro', 20.00, 'Claude AI Pro plan', true, NOW());
```

---

## Integrating Paycrest (Future)

When ready to automate USDC → fiat conversion:

1. After `intent.status = confirmed`, call Paycrest API with the USDC amount
2. Paycrest converts USDC → NGN and funds your Reloadly wallet
3. Then call Reloadly to issue card
4. Make the treasury service module in `app/services/treasury.py`

---

## Tests

```bash
pytest tests/ -v
```

---

## Production Checklist

- [ ] Set `APP_ENV=production` (disables `/docs`)
- [ ] Use a secrets manager (AWS Secrets Manager, etc.) instead of `.env`
- [ ] Set up Reloadly webhook URL and verify signature header
- [ ] Monitor `unallocated` intents — these are late payments needing manual refund
- [ ] Alert if treasury Reloadly wallet balance drops below threshold
- [ ] Run listener behind a process supervisor (systemd, supervisord)
- [ ] Set up database connection pooling (PgBouncer) for high traffic
