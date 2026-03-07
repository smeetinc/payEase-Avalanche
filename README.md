## PayEase Demo – Subscriptions With USDC on Avalanche (Frontend Only)

PayEase is a **frontend-only demo** that shows how users could pay for subscriptions (like X Blue and Replit Pro) with **USDC on Avalanche**, without using real cards or real crypto transfers.

The goal of this repo is to:

- Demonstrate a polished marketing/landing experience.
- Walk through a realistic subscription checkout flow.
- Simulate payments, receipts, and subscription history entirely in the browser.
- Provide a clear abstraction for a backend or on‑chain developer to plug in real systems later.

> Important: This is **not** a production payment system. No real debit cards are issued, and no real USDC is moved. All data is stored in the browser’s `localStorage`.

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [User Flows](#user-flows)
  - [1. Session & Authentication](#1-session--authentication)
  - [2. Homepage & Service Selection](#2-homepage--service-selection)
  - [3. Subscription Selection Flow (`/subscribe`)](#3-subscription-selection-flow-subscribe)
  - [4. USDC Payment Simulation (`/subscribe/payment`)](#4-usdc-payment-sulation-subscribepayment)
  - [5. Virtual Card Flow for X (Card Demo)](#5-virtual-card-flow-for-x-card-demo)
  - [6. Replit Invite Flow](#6-replit-invite-flow)
  - [7. Summary & History Dashboard](#7-summary--history-dashboard)
- [Data Storage & Persistence Model](#data-storage--persistence-model)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running the App](#running-the-app)
- [How a Backend/On-Chain Dev Can Integrate](#how-a-backendon-chain-dev-can-integrate)
- [Current Limitations](#current-limitations)
- [Next Steps](#next-steps)

---

## High-Level Overview

- **Product concept**: Pay for well-known tech subscriptions using **USDC on Avalanche** instead of cards.
- **Demo services**:
  - `X Blue` – subscription to X (Twitter) premium.
  - `Replit Pro` – subscription to Replit’s pro tools.
- **Core demo ideas**:
  - Simple email-based “login” modal; no real emails are sent.
  - A **fake USDC wallet address** that users are instructed to pay to.
  - Automatic “payment confirmed” logic and redirect to receipts.
  - A **virtual card** screen that behaves like a single-use card with an expiry countdown.
  - A summary dashboard of subscriptions and payment history, stored locally.

There is **no backend**. All “state” lives in the browser and is persisted via `localStorage`.

---

## User Flows

### 1. Session & Authentication

The app uses a very lightweight session model built around an email and an auth method:

- `AuthMethod` is `'magic-link'` or `'otp'`.
- Session identity is handled by `getSessionIdentity` and `persistSessionIdentity` in  
  [`src/lib/payeaseAccountStore.ts`](src/lib/payeaseAccountStore.ts).
- Two keys in `localStorage` represent the session:
  - `payease_account_email` – normalized email address (lowercased).
  - `payease_auth_method` – `'magic-link'` or `'otp'`.

**Homepage auth modal**

- Triggered by “Get Started” on the homepage or header when there is no active session.
- User enters an email and chooses **Send Magic Link** or **Send OTP**.
- No email is actually sent. The choice only affects the stored `authMethod`.
- On success:
  - `persistSessionIdentity(email, method)` is called.
  - The user is redirected to `/subscribe` with `account` and `auth` in the query string and optionally `service` if they picked a service card first.

**Session-aware homepage**

Once the user has a session (email stored):

- The **header CTA** changes from “Get Started” to showing the user’s email (truncated).
  - Clicking it routes straight to `/subscribe?account=...&auth=...`.
- The primary “Get Started” buttons (hero, CTA section) do the same.
- Service cards:
  - If session exists, “Select” routes to `/subscribe?service=<id>&account=...&auth=...`.
  - If not, they open the auth modal and preselect the chosen service for after login.

### 2. Homepage & Service Selection

File: [`src/app/page.tsx`](src/app/page.tsx)

Key sections:

- **Hero**: Explains paying for subscriptions with USDC on Avalanche. Background has a patterned gradient plus a noise overlay, matching the design.
- **Supported Services**:
  - Two cards: X Blue and Replit Pro.
  - Each uses real logos from `public/twitter.png` and `public/replit.png`.
  - Cards lift with a shadow and transform on hover.
- **How PayEase Work**: 4-step explanation.
- **Call-to-action**: Encourages getting started and re-uses the same `handleGetStarted` logic.
- **Footer**: Navigation links and social links; scroll-to-top button.

The homepage is purely presentational **except** for:

- The auth modal logic.
- Session-aware routing behavior for Get Started and service selections.

### 3. Subscription Selection Flow (`/subscribe`)

File: [`src/app/subscribe/page.tsx`](src/app/subscribe/page.tsx)

This is the main subscription selection screen:

- Uses `useSearchParams` to read:
  - `service` – optional preselected service (`x-blue` or `replit-pro`).
  - `account`, `auth` – session identity from querystring.
- Calls `getSessionIdentity(search)` to merge:
  - Query params (`account`, `auth`) **or** stored session from `localStorage`.

Behavior:

- **Step indicator** shows:
  1. Select Service (highlighted).
  2. Account Details.
  3. Payment.
- **Service cards**:
  - Two cards, similar to the homepage, with descriptive perks.
  - Clicking a card sets `selected`.
  - If `service` is present in the URL and valid, that card is preselected.
- **Signed in as** banner:
  - If `session.email` exists, it displays “Signed in as <email>”.
- **Continue** button:
  - Disabled until a service is selected.
  - On click:
    - Persists session identity if available.
    - Builds a query with `service`, and optionally `account` + `auth`.
    - Routes to:
      - `/subscribe/replit/details` for `replit-pro`.
      - `/subscribe/payment` for `x-blue`.

### 4. USDC Payment Simulation (`/subscribe/payment`)

File: [`src/app/subscribe/payment/page.tsx`](src/app/subscribe/payment/page.tsx)

This page **simulates** paying with USDC on Avalanche.

- A static `walletAddress` constant is used:

  ```ts
  const walletAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  ```

  This is **not** connected to any real on-chain logic in the frontend.

- The page:
  - Shows subscription summary (service name, account, amount, fee, total).
  - Displays the Avalanche network badge and the wallet address.
  - Has a **Copy** button that copies the address to clipboard (purely a UI affordance).

**Auto-confirmation logic**

- Uses `useEffect` to:
  - Wait ~2.2s.
  - Mark status as `confirmed`.
  - If a `session.email` exists:
    - Calls `recordSubscriptionPayment` from `payeaseAccountStore`:
      - Writes one active `SubscriptionRecord` for the chosen service.
      - Adds a `HistoryRecord` entry representing the payment.
  - After another ~1.2s, the user is redirected to `/subscribe/payment/receipt`.

The **status badge** at the bottom transitions from:

- “Waiting for payment...” with a blue pulsing dot →
- “Payment confirmed, redirecting...” with a green indicator.

No real USDC transfer is validated; this is pure front-end simulation.

### 5. Virtual Card Flow for X (Card Demo)

File: [`src/app/subscribe/payment/card/page.tsx`](src/app/subscribe/payment/card/page.tsx)

This flow mimics a **single-use virtual card** experience:

- Triggered from the receipt page when the service is `x-blue`.
- Shows:
  - A “virtual card” with cardholder, card number, expiry, and CVV.
  - A small banner explaining it’s locked to x.com and single-use.
  - A usage guide (“Open x.com”, “Go to X Premium checkout”, etc.).

**Countdown behavior**

- `initialSeconds = 20` for the demo.
- `secondsLeft` is decremented every second via `setInterval`.
- Derived values: `mm`, `ss` displayed as `MM:SS` inside the card.
- When `secondsLeft <= 0`:
  - `expired` becomes `true`.
  - The primary button shows `"Card expired"` and becomes disabled.

**Continue behavior**

- If the card has not expired:
  - Clicking “Continue”:
    - Persists the session identity (if present).
    - Redirects to `/subscribe/summary`, preserving `account` and `auth` in the querystring where available.

This is all visual/demo logic; no card network or BIN range is invoked.

### 6. Replit Invite Flow

Files:

- [`src/app/subscribe/replit/details/page.tsx`](src/app/subscribe/replit/details/page.tsx)
- [`src/app/subscribe/replit/invite/page.tsx`](src/app/subscribe/replit/invite/page.tsx)

**Account details screen**

- Asks the user for email/username for Replit.
- Validates that the field looks like an email/username before enabling the button.
- On “Continue payment”:
  - Redirects into the same `/subscribe/payment` screen with `service=replit-pro` and the captured account.

**Invite screen**

- Shown after a successful Replit Pro payment (via receipt screen).
- Communicates “Team invite sent”.
- Shows the account email from the previous step.
- “Done” returns the user to the summary/dashboard.

Again, no real Replit invite is sent; this is a simulated post-payment UX.

### 7. Summary & History Dashboard

File: [`src/app/subscribe/summary/page.tsx`](src/app/subscribe/summary/page.tsx)

This page is the **account dashboard** showing:

- A success banner (“Subscription Activated!” or “Account Ready!”).
- A list of active subscriptions.
- A call-to-action to “Add Another Subscription”.
- A detailed payment history.

It reads data from `localStorage` via `getAccountData(email, authMethod)`:

- Subscriptions:
  - ID, name, account, price, status (always `"Active"`), start date, next renewal, and method (“Avalanche”).
- History entries:
  - Title (e.g., `"X Blue - Monthly"`), date, amount, and status (“Completed”).

The “Add Another Subscription” button links back to `/subscribe` with the current session identity preserved in the URL.

---

## Data Storage & Persistence Model

All long-lived data is stored in the browser’s `localStorage`. There is no server, database, or external API.

Key pieces live in [`src/lib/payeaseAccountStore.ts`](src/lib/payeaseAccountStore.ts):

### Storage Keys

- `payease_accounts_v1`
  - A JSON object mapping normalized email → `AccountData`.
- `payease_account_email`
  - The current session’s normalized email.
- `payease_auth_method`
  - The current session’s auth method.

### AccountData Shape

Conceptually:

- `account`: normalized email.
- `authMethod`: `'magic-link' | 'otp' | null`.
- `subscriptions`: array of `SubscriptionRecord`.
- `history`: array of `HistoryRecord`.

### SubscriptionRecord

- `id`: `'x-blue' | 'replit-pro'`
- `name`: human-readable service name.
- `account`: the email/account used for the subscription.
- `price`: e.g. `$8/ month`.
- `status`: currently always `"Active"`.
- `started`: formatted start date.
- `renewal`: next renewal date.
- `method`: `"Avalanche"` (network).

### HistoryRecord

- `id`: unique string (`serviceId-timestamp`).
- `title`: e.g. `"X Blue - Monthly"`.
- `date`: formatted date.
- `amount`: formatted string like `"$8 USDC"`.
- `status`: `"Completed"`.
- `serviceId`: `'x-blue' | 'replit-pro'`.

### Persistence Notes

- Data is **per browser and per device**. Clearing site data or localStorage resets everything.
- There is no multi-device sync, no user accounts, and no server reconciliation.
- This design makes the frontend self-contained for demos and easy to plug into a real backend later.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, TypeScript).
- **Language**: TypeScript + modern React.
- **Styling**:
  - [Tailwind CSS v4](https://tailwindcss.com/) (via `@tailwindcss/postcss`).
  - Custom background patterns and gradients via CSS + Tailwind.
- **Animation**: [Framer Motion](https://www.framer.com/motion/) for hero/section transitions.
- **Icons**:
  - [lucide-react](https://lucide.dev/) for system icons (X, check, alerts, etc.).
  - [react-icons](https://react-icons.github.io/react-icons/) for some branded icons.
- **State & Persistence**:
  - React hooks (`useState`, `useEffect`, `useMemo`, `useRef`).
  - Browser `localStorage` for all persistent data.

---

## Project Structure

Key files/folders:

- `src/app/layout.tsx` – Root layout, fonts, and global metadata.
- `src/app/page.tsx` – Homepage and session-aware CTA + auth modal.
- `src/app/subscribe/page.tsx` – Subscription selection.
- `src/app/subscribe/payment/page.tsx` – USDC payment simulation.
- `src/app/subscribe/payment/receipt/page.tsx` – Payment receipt.
- `src/app/subscribe/payment/card/page.tsx` – Virtual card demo for X Blue.
- `src/app/subscribe/replit/details/page.tsx` – Replit account details.
- `src/app/subscribe/replit/invite/page.tsx` – Replit invite-after-payment screen.
- `src/app/subscribe/summary/page.tsx` – Dashboard for subscriptions and history.
- `src/lib/payeaseAccountStore.ts` – Local account store, session identity, subscription/history logic.
- `src/app/globals.css` – Tailwind v4 setup and global styles (fonts, hero background, typography utilities).

---

## Running the App

### Prerequisites

- Node.js 18+ (Next 16 requirement).
- npm (or pnpm / yarn / bun if you prefer).

### Install Dependencies

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Lint the Code

```bash
npm run lint
```

This runs ESLint with Next’s recommended rules for React and TypeScript.

### Build for Production

```bash
npm run build
npm start
```

`npm start` runs the built app with `next start`.

---

## How a Backend/On-Chain Dev Can Integrate

This project is structured to make it straightforward to replace the in-browser simulation with real systems.

### Where to plug in real USDC payments

- Current simulated payment logic lives in:
  - [`src/app/subscribe/payment/page.tsx`](src/app/subscribe/payment/page.tsx)
  - [`recordSubscriptionPayment`](src/lib/payeaseAccountStore.ts) in the account store.
- Integration idea:
  - Replace the timer-based auto-confirmation with:
    - A call to a backend API that initiates a payment or monitors an on-chain transaction.
    - Webhooks or polling-based confirmation.
  - Once confirmed:
    - Call a backend (or on-chain indexer) to write the subscription.
    - Optionally still mirror data into localStorage for a snappy UI.

### Where to plug in real auth

- Replace the auth modal in `src/app/page.tsx` with:
  - OAuth (X, Replit, etc.).
  - Passwordless email login using a real provider.
  - Wallet-based login (e.g., signing with an EOA).
- Persisting tokens:
  - Instead of writing email + `authMethod` directly into localStorage, delegate to a proper auth library (NextAuth, custom JWT, etc.).

### Where to plug in real card issuing

- The virtual card view in `src/app/subscribe/payment/card/page.tsx` is a pure UI simulation.
- A real integration would:
  - Fetch virtual card details from a card issuing API (Stripe Issuing, Lithic, etc.) via a backend.
  - Replace the hardcoded card number, expiry, and CVV.
  - Enforce real-time expiry and usage rules server-side.

### Where to change services and pricing

- Homepage services: `services` array in `src/app/page.tsx`.
- Subscribe selection services: `services` array in `src/app/subscribe/page.tsx`.
- Payment services and pricing: `services` array in `src/app/subscribe/payment/page.tsx`.
- Account store service metadata: `servicesMeta` in `src/lib/payeaseAccountStore.ts`.

In a production backend, these would likely come from a shared config or database table.

---

## Current Limitations

- No real payments:
  - USDC address is static and unchecked.
  - Payment success is based on a timer, not on-chain events.
- No real authentication:
  - Email + “magic link” or “OTP” is just a front-end toggle.
  - There is no password, token, or backend verification.
- Single-browser persistence:
  - All data is stored in `localStorage`.
  - Clearing storage or switching devices resets the account.
- Limited error states:
  - Payment and card flows assume “happy path” with minimal failure handling.
- No admin or management UI:
  - No way to refund, cancel, or update subscriptions beyond what’s represented in the simple dashboard.

---

## Next Steps

Some concrete next steps to evolve this demo into a production-ready frontend:

1. **Real authentication**
   - Integrate OAuth, passwordless email, or wallet-based auth.
   - Replace localStorage-only session with a proper auth/session layer.

2. **Real payment integration**
   - Connect to a real USDC on Avalanche payment flow:
     - On-chain transfers + indexer.
     - Off-chain processor (Coinbase Commerce, etc.).
   - Replace timer-based confirmation with actual transaction status.

3. **Backend for subscriptions**
   - Store subscriptions and payment history in a database.
   - Expose APIs for:
     - Creating subscriptions.
     - Updating/canceling.
     - Fetching history per account.

4. **Virtual card issuing**
   - Integrate with a card issuing provider for the X Blue flow.
   - Fetch live card details from the backend and enforce expiry/usage there.

5. **Consolidated service configuration**
   - Move service metadata (names, prices, descriptions, icons) into a single shared module or backend endpoint.
   - Ensure data is not duplicated across multiple components.

6. **Production hardening**
   - Add test coverage for core flows (Jest/RTL or Playwright).
   - Improve error handling and UX for network failures.
   - Optimize bundle size and performance (code splitting, image optimization).
   - Add accessibility passes (focus states, ARIA attributes, keyboard flows).

7. **SEO & deployment**
   - Finalize metadata, sitemaps, and robots configuration.
   - Deploy to a production host (e.g., Vercel) and configure a custom domain like `payease.app`.

This frontend is intentionally self-contained and strongly typed so another developer—especially a backend or on-chain engineer—can plug in the real pieces without having to reverse-engineer the UI. It serves as a clean reference for the desired user journey and state transitions.
