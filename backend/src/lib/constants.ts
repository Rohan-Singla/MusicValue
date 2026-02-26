import "dotenv/config";

export const PORT = parseInt(process.env.PORT || "3001", 10);

export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const AUDIUS_API_BASE =
  process.env.AUDIUS_API_BASE || "https://api.audius.co/v1";
export const AUDIUS_API_KEY = process.env.AUDIUS_API_KEY || "";

export const PROGRAM_ID_STR =
  process.env.PROGRAM_ID || "rj7W3p82B8xKoQRb5dVDCkmGJu4uY3LPvR8uZBGmh6c";
export const USDC_MINT_STR =
  process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_DECIMALS = parseInt(process.env.USDC_DECIMALS || "6", 10);

export const APP_URL = process.env.APP_URL || "http://localhost:3001";

export const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
};
