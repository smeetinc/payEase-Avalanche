# PayEase Backend — Avalanche integration

**Bridging DeFi and SaaS**: Convert USDC on Avalanche into prepaid virtual cards for global SaaS subscriptions.

## 🏆 Hackathon Submission Overview

PayEase solves the problem of crypto-native users wanting to pay for everyday web2 SaaS services (like ChatGPT Plus, X Premium, Claude Pro) using their stablecoin holdings, without needing to offramp through centralized exchanges or traditional bank accounts.

This backend powers the Avalanche C-Chain listener, the REST API for the frontend client, and the integration with the Reloadly Virtual Card API to issue programmable, single-use debit cards.

## 🏗️ Architecture

```mermaid
flowchart TD
    User([User]) -- "USDC Transfer" --> Treasury[Avalanche Treasury Wallet]
    Listener[Blockchain Listener\n(Standalone Process)] -. "Polls Blocks" .-> Treasury
    Listener -- "Matches Intent\n(3 Confirmations)" --> DB[(PostgreSQL)]
    API[FastAPI Backend] -- "On-demand verification\n(Fallback)" --> Treasury
    API -- "Creates Intent" --> DB
    Listener -- "Triggers Card Issuance" --> Reloadly[Reloadly API]
    API -- "Issues Request" --> Reloadly
    Reloadly -- "Virtual Card Details" --> API
    API -- "Encrypted Card stored,\ndelivered via API" --> DB
```

### Key Services

| Service | Description | Tech Stack |
|---|---|---|
| `api` | Main REST API serving the frontend | FastAPI, Uvicorn, SQLAlchemy |
| `listener` | Background process watching the Avalanche C-Chain for USDC transfers | Web3.py, Asyncio |
| `db` | Relational database mapping intents, users, and encrypted cards | PostgreSQL, Asyncpg |

## 🚀 Key Features

*   **Non-Custodial Payments**: Users send standard USDC directly from their self-custodial wallets to the protocol treasury to fund their intents.
*   **On-Chain Event Listener**: A standalone asynchronous script (`app.listeners.avalanche`) that watches for ERC-20 Transfer events in real-time, matching them to pending payment intents.
*   **On-Demand On-Chain Verification**: In addition to the background listener, the backend provides an active `verify` endpoint to scan recent blocks and guarantee instant checkout flows for the end user if the background listener is delayed.
*   **Idempotent Processing**: Uses database-level locks (`SELECT ... FOR UPDATE SKIP LOCKED`) and `tx_hash` unique constraints to completely eliminate the risk of double-processing or double-card issuance.
*   **Secure Virtual Cards**: Card details (PAN, CVV) are encrypted at rest using AES (Fernet) and are designed to be revealed strictly **once** to the end user.
*   **Crash Recovery**: The background listener saves `ListenerCheckpoint`s to the database. Upon restart, it resumes securely from the last processed Avalanche block, preventing missed payments.

---

## 🏁 Quick Start

### 1. Requirements
*   Docker & Docker Compose (Recommended)
*   Python 3.11+ (If running bare-metal)
*   PostgreSQL (If running bare-metal)

### 2. Configure Environment

```bash
cp .env.example .env
# Fill in all necessary values in your .env file
```

### 3. Generate Encryption Key
The backend encrypts sensitive card data at rest. You must generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Place the output in `.env` as `FIELD_ENCRYPTION_KEY`.

### 4. Run the Stack (Docker)

```bash
docker-compose up --build
```

### 5. Run Database Migrations

```bash
docker-compose exec api alembic upgrade head
```

The API will be available at `http://localhost:8000`. Full OpenAPI documentation can be found at `http://localhost:8000/docs`.

---

## 🛠️ Bare-Metal Setup (Without Docker)

If you prefer to run the services manually:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the REST API
uvicorn app.main:app --reload --port 8000

# Run the Avalanche Listener (in a separate terminal)
python -m app.listeners.avalanche
```

---

## 📖 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/login` | Authenticate and obtain JWT token |
| GET | `/auth/me` | Fetch current user profile |

### Services
| Method | Endpoint | Description |
|---|---|---|
| GET | `/services` | List available SaaS subscription services |
| GET | `/services/{id}` | Get specific service details |

### Subscriptions (Intents)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/subscriptions/intent` | Create a new payment intent |
| GET | `/subscriptions/intent/{id}` | Poll payment intent status |
| POST | `/subscriptions/intent/{id}/verify` | **On-demand blockchain verification** for instant settlement |
| GET | `/subscriptions/intents` | List all historical user intents |

**Create intent request:**
```json
{
  "service_id": "uuid",
  "wallet_address": "0xUserWalletAddress"
}
```

**Workflow:**
Upon creating an intent, the exact required USDC amount (e.g., `8.000347`) and the `treasury_wallet` are returned. The user must send **exactly** this amount from their registered wallet address within 15 minutes. The fractional offset uniquely identifies the payment on-chain without requiring smart contract memos.

### Cards
| Method | Endpoint | Description |
|---|---|---|
| GET | `/cards` | List all user virtual cards (masked details only) |
| GET | `/cards/{id}/reveal` | **One-time** reveal of full card PAN & CVV. Payload deleted after. |
| GET | `/cards/dashboard/history` | Full transaction and payment history |

### Webhooks
| Method | Endpoint | Description |
|---|---|---|
| POST | `/webhooks/reloadly/card-transaction` | Receiver for Reloadly external events. Marks card as `used` upon first charge. |

---

## 🌐 Environment Variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing key (generate randomly) |
| `DATABASE_URL` | Async PostgreSQL connection string |
| `SYNC_DATABASE_URL` | Sync PostgreSQL connection string (required for Alembic) |
| `AVALANCHE_RPC_URL` | Avalanche C-Chain RPC endpoint |
| `USDC_CONTRACT_ADDRESS` | USDC token contract on Avalanche |
| `TREASURY_WALLET_ADDRESS` | Protocol treasury receiving wallet |
| `RELOADLY_CLIENT_ID` | Reloadly Sandbox/Production API Client ID |
| `RELOADLY_CLIENT_SECRET` | Reloadly Sandbox/Production API Client Secret |
| `RELOADLY_WEBHOOK_SECRET`| Secret used to verify Reloadly signatures |
| `FIELD_ENCRYPTION_KEY` | Symmetric key for database-level card encryption |

---

## 🧪 Testing

The backend suite is fully tested using `pytest` and `pytest-asyncio`.

```bash
pytest tests/ -v
```

---

## 🚢 Integrating Paycrest (Future Roadmap)

To fully decentralize and automate the fiat off-ramping component:

1. After `intent.status == confirmed`, trigger the Paycrest API passing the collected USDC.
2. Paycrest converts the USDC → Local Fiat (e.g. NGN) and funds the connected virtual card issuer.
3. Reloadly is called to mint the card based on the available fiat balance.
4. Logic can be extended in `app/services/treasury.py` for seamless execution.
