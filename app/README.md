# MusicValue — Frontend

Next.js 14 app (App Router). Lets fans browse and back Audius tracks via on-chain USDC vaults, and lets artists register vaults and distribute royalties.

---

## Prerequisites

- Node.js 18+
- npm or yarn
- A Solana wallet (Phantom, Backpack, etc.) configured for devnet
- Backend server running on port 3001

---

## Setup

```bash
cd app
npm install
```

Create a `.env` file:

```env
# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Audius public API key
NEXT_PUBLIC_AUDIUS_API_KEY=<your_audius_api_key>

# App URL (used in Blink links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Solana WebSocket (direct to node — no secrets)
NEXT_PUBLIC_SOLANA_WS_URL=wss://api.devnet.solana.com/
```

---

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

App runs on `http://localhost:3000`.

---

## Key Pages

| Path | Description |
|------|-------------|
| `/` | Landing page — browse live vaults, stats, how it works |
| `/track/[trackId]` | Individual track page with vault panel and deposit UI |
| `/artist` | Artist dashboard — manage vaults, distribute yield |
| `/artist/register` | 5-step wizard to create a vault (requires Audius OAuth + wallet) |

---

## Architecture Notes

- **RPC calls** go through `NEXT_PUBLIC_BACKEND_URL/rpc` (keeps the real RPC URL server-side)
- **WebSocket** goes directly to `NEXT_PUBLIC_SOLANA_WS_URL` (safe — only carries tx signatures)
- **Audius OAuth** uses a popup + `postMessage` flow; auth is stored in `localStorage` under `audius_auth`
- **On-chain data** is fetched via TanStack Query hooks in `src/hooks/useVault.ts`
- **Program IDL** lives in `src/lib/idl.json` — regenerate after any Anchor program changes

---

## Environment Notes

- The app is configured for **Solana devnet**. Do not point `NEXT_PUBLIC_SOLANA_WS_URL` or the backend `SOLANA_RPC_URL` at mainnet endpoints.
- USDC devnet mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Program ID: `4Axew2EExar585doSH8vpaFyT8Nu4wJ9xexN1WvgTZir`
