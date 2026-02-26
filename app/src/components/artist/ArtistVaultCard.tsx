"use client";

import { useState } from "react";
import { AudiusTrack } from "@/services/audius";
import { useVault, useDistributeYield } from "@/hooks/useVault";
import { Loader2, TrendingUp, Users, Zap, X, Lock, ArrowRight } from "lucide-react";
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
  const [distributeAmount, setDistributeAmount] = useState("");

  const progress = vault ? Math.min((vault.totalDeposited / vault.cap) * 100, 100) : 0;
  const isCapReached = progress >= 100;

  // Total yield already distributed = total_deposited - total_shares (since deposits are 1:1)
  const totalYieldDistributed = vault
    ? Math.max(0, vault.totalDeposited - vault.totalShares)
    : 0;

  const sharePrice =
    vault && vault.totalShares > 0
      ? vault.totalDeposited / vault.totalShares
      : 1;

  // Preview: what share price will be after this distribution
  const previewAmount = parseFloat(distributeAmount) || 0;
  const previewLamports = Math.floor(previewAmount * 10 ** USDC_DECIMALS);
  const previewSharePrice =
    vault && vault.totalShares > 0 && previewLamports > 0
      ? (vault.totalDeposited + previewLamports) / vault.totalShares
      : null;

  const handleDistribute = async () => {
    if (!previewAmount || previewAmount <= 0) {
      toast.error("Enter a valid amount to distribute");
      return;
    }
    try {
      await distributeYield.mutateAsync(previewLamports);
      setShowModal(false);
      setDistributeAmount("");
      toast.success(`Distributed ${formatUSDC(previewLamports)} to all backers!`);
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
            <div className="grid grid-cols-2 gap-2">
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
                <p className="text-[10px] text-slate-500">Share Price</p>
                <p className="mt-0.5 text-sm font-bold text-accent-cyan">
                  ${(sharePrice).toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg bg-base-50 p-2.5 text-center">
                <p className="text-[10px] text-slate-500">Yield Sent</p>
                <p className="mt-0.5 text-sm font-bold text-accent-cyan">
                  {formatUSDC(totalYieldDistributed)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                <span className={isCapReached ? "text-yellow-400 font-medium" : ""}>
                  {isCapReached ? "Vault Full" : `${progress.toFixed(1)}% funded`}
                </span>
                <span>{(vault.totalShares / 10 ** USDC_DECIMALS).toFixed(0)} shares minted</span>
              </div>
              <div className="vault-progress h-1.5">
                <div
                  className={`vault-progress-bar ${isCapReached ? "!bg-yellow-400" : ""}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Vault full notice */}
            {isCapReached && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                <Lock className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                <p className="text-[11px] text-yellow-400">
                  Vault is full — closed to new backers. You can still distribute yield.
                </p>
              </div>
            )}

            {/* Distribute yield button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 py-2.5 text-sm font-medium text-accent-cyan transition-colors hover:bg-accent-cyan/20"
            >
              <Zap className="h-4 w-4" />
              Distribute Royalties
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
            <p className="text-xs text-yellow-400">No vault created for this track yet</p>
          </div>
        )}
      </div>

      {/* Distribute yield modal */}
      {showModal && vault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Distribute Royalties</h3>
              <button
                onClick={() => { setShowModal(false); setDistributeAmount(""); }}
                className="text-slate-400 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Send USDC from your wallet into the vault. Every backer's share
              automatically increases in value — proportional to their holdings.
            </p>

            {/* Current state */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-base-50 p-3 text-center">
                <p className="text-[10px] text-slate-500">Current share price</p>
                <p className="mt-1 text-lg font-bold text-white">
                  ${(sharePrice).toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg bg-base-50 p-3 text-center">
                <p className="text-[10px] text-slate-500">Yield sent so far</p>
                <p className="mt-1 text-lg font-bold text-accent-cyan">
                  {formatUSDC(totalYieldDistributed)}
                </p>
              </div>
            </div>

            {/* Amount input */}
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Amount to distribute (USDC from your wallet)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={distributeAmount}
                  onChange={(e) => setDistributeAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="h-12 w-full rounded-xl border border-base-200 bg-base-50 pl-4 pr-16 text-lg text-white outline-none transition-colors focus:border-accent-cyan/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  USDC
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                {[50, 100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDistributeAmount(amt.toString())}
                    className="flex-1 rounded-lg border border-base-200 py-1 text-xs text-slate-400 transition-colors hover:border-accent-cyan/30 hover:text-accent-cyan"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Share price preview */}
            {previewSharePrice !== null && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-500">Current price</p>
                  <p className="text-sm font-bold text-white">${sharePrice.toFixed(4)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-accent-cyan flex-shrink-0" />
                <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-500">After distribution</p>
                  <p className="text-sm font-bold text-accent-cyan">
                    ${previewSharePrice.toFixed(4)}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setShowModal(false); setDistributeAmount(""); }}
                className="flex-1 rounded-xl border border-base-200 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDistribute}
                disabled={distributeYield.isPending || !previewAmount || previewAmount <= 0}
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
