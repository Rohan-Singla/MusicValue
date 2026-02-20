// Program - exported as strings to avoid PublicKey prototype loss across module boundaries
export const PROGRAM_ID_STR = "rj7W3p82B8xKoQRb5dVDCkmGJu4uY3LPvR8uZBGmh6c";

// Solana
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
export const SOLANA_NETWORK = "devnet" as const;

// USDC on devnet
export const USDC_MINT_STR = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_DECIMALS = 6;

// Audius
export const AUDIUS_API_BASE = "https://api.audius.co/v1";
export const AUDIUS_API_KEY =
  process.env.NEXT_PUBLIC_AUDIUS_API_KEY || "";

// Torque
export const TORQUE_API_KEY =
  process.env.NEXT_PUBLIC_TORQUE_API_KEY || "";
export const TORQUE_PUBLISHER_HANDLE =
  process.env.NEXT_PUBLIC_TORQUE_PUBLISHER_HANDLE || "";

// Blinks
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Fan tiers
export const FAN_TIERS = [
  { name: "Listener", minPoints: 0, color: "#94a3b8" },
  { name: "Supporter", minPoints: 100, color: "#8b5cf6" },
  { name: "Superfan", minPoints: 500, color: "#06b6d4" },
  { name: "Patron", minPoints: 1000, color: "#ec4899" },
] as const;

// Points per action
export const POINTS = {
  BACK_TRACK: 50,
  HOLD_7_DAYS: 25,
  HOLD_30_DAYS: 100,
  SHARE_BLINK: 10,
} as const;
