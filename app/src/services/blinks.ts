import { BACKEND_URL } from "@/lib/constants";

/**
 * Blinks Service
 *
 * Generates Solana Action-compatible URLs and shareable Blink links
 * for the "Back this track" action. Uses the standard Solana Actions spec.
 *
 * Integration: OrbitFlare as RPC provider, @solana/actions for spec compliance.
 */

/** Generate the Action API URL for a track */
export function getActionUrl(trackId: string): string {
  return `${BACKEND_URL}/api/actions/back-track?trackId=${encodeURIComponent(trackId)}`;
}

/** Generate a shareable Blink URL using dial.to */
export function getBlinkUrl(trackId: string): string {
  const actionUrl = getActionUrl(trackId);
  return `https://dial.to/?action=${encodeURIComponent(`solana-action:${actionUrl}`)}`;
}

/** Generate the solana-action: protocol URL */
export function getSolanaActionUrl(trackId: string): string {
  return `solana-action:${getActionUrl(trackId)}`;
}

/** Copy a blink URL to clipboard and return success */
export async function copyBlinkToClipboard(trackId: string): Promise<boolean> {
  try {
    const url = getBlinkUrl(trackId);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
