"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  loyaltyService,
  type FanTier,
  type LoyaltyAction,
} from "@/services/loyalty";
import { FAN_TIERS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Default values when no wallet is connected
// ---------------------------------------------------------------------------

const DEFAULT_TIER: FanTier = {
  name: FAN_TIERS[0].name,
  minPoints: FAN_TIERS[0].minPoints,
  color: FAN_TIERS[0].color,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLoyalty() {
  const { publicKey, connected } = useWallet();

  const [points, setPoints] = useState<number>(0);
  const [tier, setTier] = useState<FanTier>(DEFAULT_TIER);
  const [history, setHistory] = useState<LoyaltyAction[]>([]);

  // Sync state from localStorage whenever the wallet changes
  useEffect(() => {
    if (!connected || !publicKey) {
      setPoints(0);
      setTier(DEFAULT_TIER);
      setHistory([]);
      return;
    }

    const address = publicKey.toBase58();
    const loyalty = loyaltyService.getUserLoyalty(address);
    setPoints(loyalty.points);
    setTier(loyalty.tier);
    setHistory(loyalty.actions);
  }, [connected, publicKey]);

  // Wrapper that records an action and refreshes local state
  const addPoints = useCallback(
    (action: LoyaltyAction["type"], trackId: string): number => {
      if (!connected || !publicKey) return 0;

      const address = publicKey.toBase58();
      const newTotal = loyaltyService.addPoints(address, action, trackId);

      setPoints(newTotal);
      setTier(loyaltyService.getTier(newTotal));
      setHistory(loyaltyService.getHistory(address));

      return newTotal;
    },
    [connected, publicKey]
  );

  return {
    points,
    tier,
    history,
    addPoints,
    isConnected: connected,
  } as const;
}
