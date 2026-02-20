// Loyalty Service for MusicValue
// TODO: Integrate Torque SDK for on-chain loyalty tracking.
// Currently uses localStorage as a fallback until Torque campaigns
// are configured via TORQUE_API_KEY and TORQUE_PUBLISHER_HANDLE.

import {
  TORQUE_API_KEY,
  TORQUE_PUBLISHER_HANDLE,
  SOLANA_RPC_URL,
  FAN_TIERS,
  POINTS,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FanTier {
  name: string;
  minPoints: number;
  color: string;
}

export interface LoyaltyAction {
  type: "back_track" | "hold_7_days" | "hold_30_days" | "share_blink";
  trackId: string;
  points: number;
  timestamp: number;
}

export interface UserLoyalty {
  points: number;
  tier: FanTier;
  actions: LoyaltyAction[];
}

// ---------------------------------------------------------------------------
// Internal storage shape
// ---------------------------------------------------------------------------

interface StoredLoyalty {
  points: number;
  actions: LoyaltyAction[];
}

// ---------------------------------------------------------------------------
// Points mapping helper
// ---------------------------------------------------------------------------

const ACTION_POINTS: Record<LoyaltyAction["type"], number> = {
  back_track: POINTS.BACK_TRACK,
  hold_7_days: POINTS.HOLD_7_DAYS,
  hold_30_days: POINTS.HOLD_30_DAYS,
  share_blink: POINTS.SHARE_BLINK,
};

// ---------------------------------------------------------------------------
// LoyaltyService
// ---------------------------------------------------------------------------

class LoyaltyService {
  private readonly storageKey = "musicvalue_loyalty";

  // ---- private helpers ---------------------------------------------------

  private read(walletAddress: string): StoredLoyalty {
    if (typeof window === "undefined") {
      return { points: 0, actions: [] };
    }

    try {
      const raw = localStorage.getItem(
        `${this.storageKey}_${walletAddress}`
      );
      if (!raw) return { points: 0, actions: [] };
      return JSON.parse(raw) as StoredLoyalty;
    } catch {
      return { points: 0, actions: [] };
    }
  }

  private write(walletAddress: string, data: StoredLoyalty): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      `${this.storageKey}_${walletAddress}`,
      JSON.stringify(data)
    );
  }

  // ---- public API --------------------------------------------------------

  /**
   * Return the current point balance for a wallet.
   */
  getPoints(walletAddress: string): number {
    return this.read(walletAddress).points;
  }

  /**
   * Record an action, add the corresponding points, persist, and return the
   * new total.
   */
  addPoints(
    walletAddress: string,
    action: LoyaltyAction["type"],
    trackId: string
  ): number {
    const data = this.read(walletAddress);
    const earned = ACTION_POINTS[action];

    const entry: LoyaltyAction = {
      type: action,
      trackId,
      points: earned,
      timestamp: Date.now(),
    };

    data.points += earned;
    data.actions.push(entry);
    this.write(walletAddress, data);

    return data.points;
  }

  /**
   * Determine the highest tier the user qualifies for based on points.
   */
  getTier(points: number): FanTier {
    let result: FanTier = {
      name: FAN_TIERS[0].name,
      minPoints: FAN_TIERS[0].minPoints,
      color: FAN_TIERS[0].color,
    };

    for (const tier of FAN_TIERS) {
      if (points >= tier.minPoints) {
        result = { name: tier.name, minPoints: tier.minPoints, color: tier.color };
      }
    }

    return result;
  }

  /**
   * Return the full action history for a wallet.
   */
  getHistory(walletAddress: string): LoyaltyAction[] {
    return this.read(walletAddress).actions;
  }

  /**
   * Convenience method that returns the combined loyalty state for a wallet.
   */
  getUserLoyalty(walletAddress: string): UserLoyalty {
    const points = this.getPoints(walletAddress);
    return {
      points,
      tier: this.getTier(points),
      actions: this.getHistory(walletAddress),
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const loyaltyService = new LoyaltyService();
