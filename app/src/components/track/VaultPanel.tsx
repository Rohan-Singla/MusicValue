"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Share2,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useVault, useUserPosition, useDeposit, useWithdraw } from "@/hooks/useVault";
import { useLoyalty } from "@/hooks/useLoyalty";
import { copyBlinkToClipboard } from "@/services/blinks";
import toast from "react-hot-toast";
import { USDC_DECIMALS } from "@/lib/constants";

interface VaultPanelProps {
  trackId: string;
  trackTitle: string;
}

function formatUSDC(amount: number): string {
  return `$${(amount / 10 ** USDC_DECIMALS).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function VaultPanel({ trackId, trackTitle }: VaultPanelProps) {
  const { publicKey } = useWallet();
  const { data: vault, isLoading: vaultLoading } = useVault(trackId);
  const { data: position } = useUserPosition(trackId);
  const deposit = useDeposit(trackId);
  const withdraw = useWithdraw(trackId);
  const { addPoints } = useLoyalty();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  const progress = vault
    ? Math.min((vault.totalDeposited / vault.cap) * 100, 100)
    : 0;

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      const lamports = Math.floor(amount * 10 ** USDC_DECIMALS);
      await deposit.mutateAsync(lamports);
      addPoints("back_track", trackId);
      setDepositAmount("");
      toast.success(`Backed ${trackTitle} with $${amount} USDC`);
    } catch (err: any) {
      toast.error(err.message || "Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      const shares = Math.floor(amount * 10 ** USDC_DECIMALS);
      await withdraw.mutateAsync(shares);
      setWithdrawAmount("");
      toast.success(`Withdrew $${amount} from ${trackTitle}`);
    } catch (err: any) {
      toast.error(err.message || "Withdraw failed");
    }
  };

  const handleShareBlink = async () => {
    const success = await copyBlinkToClipboard(trackId);
    if (success) {
      addPoints("share_blink", trackId);
      toast.success("Blink link copied to clipboard!");
    } else {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Music Vault</h3>
        <button
          onClick={handleShareBlink}
          className="flex items-center gap-1.5 rounded-lg border border-base-200 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-accent-purple/50 hover:text-accent-purple"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share Blink
        </button>
      </div>

      {/* Vault stats */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Total Backed
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {vault ? formatUSDC(vault.totalDeposited) : "--"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Vault Cap
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {vault ? formatUSDC(vault.cap) : "--"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Est. APY
          </p>
          <p className="mt-1 flex items-center gap-1 text-lg font-bold text-accent-cyan">
            <TrendingUp className="h-4 w-4" />
            ~5.2%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{progress.toFixed(1)}% funded</span>
          <span>{vault ? `${vault.totalShares} shares minted` : ""}</span>
        </div>
        <div className="vault-progress mt-1.5 h-2">
          <div
            className="vault-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* User position */}
      {position && (
        <div className="mt-4 rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-accent-purple">
            Your Position
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {formatUSDC(position.sharesHeld)} shares
              </p>
              <p className="text-xs text-slate-400">
                {formatUSDC(position.totalDeposited)} deposited
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-accent-cyan">
                +{formatUSDC(0)}
              </p>
              <p className="text-xs text-slate-400">yield earned</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex gap-1 rounded-xl bg-base-50 p-1">
        <button
          onClick={() => setActiveTab("deposit")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            activeTab === "deposit"
              ? "bg-accent-purple/20 text-accent-purple"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveTab("withdraw")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            activeTab === "withdraw"
              ? "bg-accent-cyan/20 text-accent-cyan"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Input */}
      <div className="mt-4">
        {activeTab === "deposit" ? (
          <div>
            <div className="relative">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="h-12 w-full rounded-xl border border-base-200 bg-base-50 pl-4 pr-16 text-lg text-white outline-none transition-colors focus:border-accent-purple/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                USDC
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt.toString())}
                  className="flex-1 rounded-lg border border-base-200 py-1.5 text-xs text-slate-400 transition-colors hover:border-accent-purple/30 hover:text-accent-purple"
                >
                  ${amt}
                </button>
              ))}
            </div>
            <button
              onClick={handleDeposit}
              disabled={
                !publicKey ||
                deposit.isPending ||
                !depositAmount ||
                parseFloat(depositAmount) <= 0
              }
              className="btn-primary mt-3 flex w-full items-center justify-center gap-2"
            >
              {deposit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              {!publicKey
                ? "Connect Wallet"
                : deposit.isPending
                  ? "Backing..."
                  : "Back This Track"}
            </button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="h-12 w-full rounded-xl border border-base-200 bg-base-50 pl-4 pr-20 text-lg text-white outline-none transition-colors focus:border-accent-cyan/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                Shares
              </span>
            </div>
            {position && (
              <button
                onClick={() =>
                  setWithdrawAmount(
                    (position.sharesHeld / 10 ** USDC_DECIMALS).toString()
                  )
                }
                className="mt-2 text-xs text-accent-cyan hover:underline"
              >
                Max: {(position.sharesHeld / 10 ** USDC_DECIMALS).toFixed(2)}
              </button>
            )}
            <button
              onClick={handleWithdraw}
              disabled={
                !publicKey ||
                withdraw.isPending ||
                !withdrawAmount ||
                parseFloat(withdrawAmount) <= 0
              }
              className="btn-secondary mt-3 flex w-full items-center justify-center gap-2"
            >
              {withdraw.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
              {withdraw.isPending ? "Withdrawing..." : "Withdraw"}
            </button>
          </div>
        )}
      </div>

      {/* Vault not initialized notice */}
      {!vaultLoading && !vault && (
        <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
          <p className="text-xs text-yellow-400">
            Vault not yet initialized for this track. First deposit will create
            it.
          </p>
        </div>
      )}
    </div>
  );
}
