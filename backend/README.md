# MusicValue — Backend

Express.js API server. Proxies Solana RPC (keeping API keys server-side), handles Audius track verification, serves Solana Actions (Blinks), and manages Supabase database writes.

---

## Prerequisites

- Node.js 18+
- npm or yarn

---

## Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=3001

SOLANA_RPC_URL=https://api.devnet.solana.com

AUDIUS_API_BASE=https://api.audius.co/v1
AUDIUS_API_KEY=<your_audius_api_key>
AUDIUS_API_SECRET=<your_audius_api_secret>

PROGRAM_ID=4Axew2EExar585doSH8vpaFyT8Nu4wJ9xexN1WvgTZir
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
USDC_DECIMALS=6

APP_URL=http://localhost:3001

SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

---

## Running

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

The server starts on `http://localhost:3001`.

---

## API Routes

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ ok: true }` |

### RPC Proxy
| Method | Path | Description |
|--------|------|-------------|
| POST | `/rpc` | Proxies Solana JSON-RPC to `SOLANA_RPC_URL` |

### Audius
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/audius/verify-track` | Verifies a track belongs to the authenticated Audius user |

### Solana Actions (Blinks)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/actions/back-track` | Returns Blink metadata for backing a track |
| POST | `/api/actions/back-track` | Builds and returns an unsigned deposit transaction |

### Database
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/db/artists` | Upsert artist record |
| GET | `/api/db/artists/:wallet` | Fetch artist by wallet |
| POST | `/api/db/vaults` | Upsert vault record |
| GET | `/api/db/vaults/:trackId` | Fetch vault by Audius track ID |
| POST | `/api/db/deposits` | Record a deposit |
| GET | `/api/db/deposits/:wallet` | Fetch deposits by wallet |
