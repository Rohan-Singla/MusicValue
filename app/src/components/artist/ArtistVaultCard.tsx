"use client";

import { useState } from "react";
import { AudiusTrack } from "@/services/audius";
import { useVault, useDistributeYield } from "@/hooks/useVault";
import { Loader2, TrendingUp, Users, Zap, X } from "lucide-react";
import { USDC_DECIMALS } from "@/lib/constants";
import toast from "react-hot-toast";

interface ArtistVaultCardProps {
  track: AudiusTrack;
}

function formatUSDC(amount: number): string {
  return `$${(amount / 10 ** USDC_DECIMALS).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ArtistVaultCard({ track }: ArtistVaultCardProps) {
  const { data: vault, isLoading } = useVault(track.id);
  const distributeYield = useDistributeYield(track.id);
  const [showModal, setShowModal] = useState(false);

  const progress = vault
    ? Math.min((vault.totalDeposited / vault.cap) * 100, 100)
    : 0;

  const estimatedYield = vault
    ? Math.floor((vault.totalDeposited * 0.052) / 12)
    : 0;

  const handleDistribute = async () => {
    try {
      await distributeYield.mutateAsync(estimatedYield);
      setShowModal(false);
      toast.success("Yield distribution initiated!");
    } catch (err: any) {
      toast.error(err.message || "Distribution failed");
    }
  };

  return (
    <>
      <div className="glass-card p-5">
        {/* Track header */}
        <div className="flex items-start gap-4">
          <img
            src={track.artwork?.["150x150"] || "/placeholder-track.svg"}
            alt={track.title}
            className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-track.svg"; }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-white">{track.title}</h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {track.play_count.toLocaleString()} plays
              </span>
              {track.genre && (
                <span className="rounded bg-accent-purple/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-purple">
                  {track.genre}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vault info */}
        {isLoading ? (
          <div className="mt-4 flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : vault ? (
          <div className="mt-4 space-y-3">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-base-50 p-2.5 text-center">
                <p className="text-[10px] text-slate-500">Raised</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {formatUSDC(vault.totalDeposited)}
                </p>
              </div>
              <div className="rounded-lg bg-base-50 p-2.5 text-center">
                <p className="text-[10px] text-slate-500">Cap</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {formatUSDC(vault.cap)}
                </p>
              </div>
              <div className="rounded-lg bg-base-50 p-2.5 text-center">
                <p className="text-[10px] text-slate-500">Shares</p>
                <p className="mt-0.5 text-sm font-bold text-accent-cyan">
                  {vault.totalShares.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                <span>{progress.toFixed(1)}% funded</span>
                <span className="flex items-center gap-1 text-accent-cyan">
                  <TrendingUp className="h-3 w-3" />
                  ~5.2% APY
                </span>
              </div>
              <div className="vault-progress h-1.5">
                <div
                  className="vault-progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Distribute yield button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 py-2.5 text-sm font-medium text-accent-cyan transition-colors hover:bg-accent-cyan/20"
            >
              <Zap className="h-4 w-4" />
              Distribute Yield
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
            <p className="text-xs text-yellow-400">No vault created for this track yet</p>
          </div>
        )}
      </div>

      {/* Distribute yield modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Distribute Yield</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Distribute accumulated yield from your vault proportionally to all backers based on their share holdings.
            </p>

            <div className="mt-4 rounded-xl bg-accent-cyan/10 p-4">
              <p className="text-xs text-slate-400">Estimated distributable yield</p>
              <p className="mt-1 text-2xl font-bold text-accent-cyan">
                {formatUSDC(estimatedYield)}
              </p>
              <p className="text-[10px] text-slate-500">~5.2% APY · monthly estimate</p>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-base-200 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDistribute}
                disabled={distributeYield.isPending}
                className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
              >
                {distributeYield.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {distributeYield.isPending ? "Distributing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
