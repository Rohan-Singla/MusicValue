// Program - exported as strings to avoid PublicKey prototype loss across module boundaries
export const PROGRAM_ID_STR = "rj7W3p82B8xKoQRb5dVDCkmGJu4uY3LPvR8uZBGmh6c";

// Backend URL — all sensitive RPC/API calls go through here
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// Solana RPC proxied through the backend (keeps the real RPC URL + API key server-side only)
export const SOLANA_RPC_URL = `${BACKEND_URL}/rpc`;
export const SOLANA_NETWORK = "devnet" as const;

// USDC on devnet
export const USDC_MINT_STR = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_DECIMALS = 6;

// Audius (public read-only)
export const AUDIUS_API_BASE = "https://api.audius.co/v1";
export const AUDIUS_API_KEY =
  process.env.NEXT_PUBLIC_AUDIUS_API_KEY || "";

// App URL
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

