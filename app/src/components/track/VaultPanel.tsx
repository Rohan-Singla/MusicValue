"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Share2,
  TrendingUp,
  Loader2,
  ExternalLink,
  Wallet,
  Music,
  Lock,
  Zap,
} from "lucide-react";
import { useVault, useUserPosition, useDeposit, useWithdraw } from "@/hooks/useVault";
import { useAudiusAuth } from "@/hooks/useAudiusAuth";
import { copyBlinkToClipboard } from "@/services/blinks";
import toast from "react-hot-toast";
import { USDC_DECIMALS, USDC_MINT_STR } from "@/lib/constants";
import Link from "next/link";

interface VaultPanelProps {
  trackId: string;
  trackTitle: string;
  artistUserId?: string;
}

function formatUSDC(amount: number): string {
  return `$${(amount / 10 ** USDC_DECIMALS).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function explorerUrl(txHash: string): string {
  return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
}

function useUsdcBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["usdc-balance", publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return null;
      try {
        const mint = new PublicKey(USDC_MINT_STR);
        const ata = await getAssociatedTokenAddress(mint, publicKey);
        const account = await getAccount(connection, ata);
        return Number(account.amount);
      } catch {
        return 0;
      }
    },
    enabled: !!publicKey,
    refetchInterval: 15_000,
  });
}

export function VaultPanel({ trackId, trackTitle, artistUserId }: VaultPanelProps) {
  const { publicKey } = useWallet();
  const { user: audiusUser } = useAudiusAuth();
  const isArtist = !!(audiusUser && artistUserId && audiusUser.userId === artistUserId);
  const { data: vault, isLoading: vaultLoading } = useVault(trackId);
  const { data: position } = useUserPosition(trackId);
  const deposit = useDeposit(trackId);
  const withdraw = useWithdraw(trackId);
  const { data: usdcBalance } = useUsdcBalance();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // ── Vault-level metrics ───────────────────────────────────────────────────
  const progress = vault ? Math.min((vault.totalDeposited / vault.cap) * 100, 100) : 0;
  const isCapReached = progress >= 100;

  // Since deposits are always 1:1 (1 USDC lamport = 1 share token),
  // total_shares == total principal ever deposited.
  // Any excess in total_deposited over total_shares is pure distributed yield.
  const totalYieldDistributed = vault
    ? Math.max(0, vault.totalDeposited - vault.totalShares)
    : 0;

  const sharePrice =
    vault && vault.totalShares > 0
      ? vault.totalDeposited / vault.totalShares
      : 1;

  // ── User position metrics ─────────────────────────────────────────────────
  const currentPositionValue =
    position && vault && vault.totalShares > 0
      ? (position.sharesHeld / vault.totalShares) * vault.totalDeposited
      : 0;

  const yieldEarned = position
    ? Math.max(0, currentPositionValue - position.totalDeposited)
    : 0;

  // Real APY: annualised return since first deposit
  const daysHeld =
    position && position.depositedAt > 0
      ? Math.max(1, (Date.now() / 1000 - position.depositedAt) / 86400)
      : 0;

  const realApy =
    yieldEarned > 0 && position && position.totalDeposited > 0 && daysHeld > 0
      ? (yieldEarned / position.totalDeposited) * (365 / daysHeld) * 100
      : null;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const balanceUSDC = usdcBalance != null ? usdcBalance / 10 ** USDC_DECIMALS : null;

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (balanceUSDC != null && amount > balanceUSDC) {
      toast.error(`Insufficient USDC. You have $${balanceUSDC.toFixed(2)}`);
      return;
    }
    try {
      const lamports = Math.floor(amount * 10 ** USDC_DECIMALS);
      const txHash = await deposit.mutateAsync(lamports);
      setDepositAmount("");
      setLastTxHash(txHash);
      toast.success(`Backed ${trackTitle} with $${amount} USDC`);
    } catch (err: any) {
      toast.error(err.message || "Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    try {
      const shares = Math.floor(amount * 10 ** USDC_DECIMALS);
      const txHash = await withdraw.mutateAsync(shares);
      setWithdrawAmount("");
      setLastTxHash(txHash);
      toast.success(`Withdrew from ${trackTitle}`);
    } catch (err: any) {
      toast.error(err.message || "Withdraw failed");
    }
  };

  const handleShareBlink = async () => {
    const success = await copyBlinkToClipboard(trackId);
    if (success) toast.success("Blink link copied!");
    else toast.error("Failed to copy link");
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

      {/* Wallet balance */}
      {publicKey && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-base-50 px-3 py-2">
          <Wallet className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Your USDC:</span>
          <span className="text-xs font-semibold text-white">
            {balanceUSDC != null ? `$${balanceUSDC.toFixed(2)}` : "..."}
          </span>
          {balanceUSDC != null && balanceUSDC === 0 && (
            <span className="ml-auto text-[10px] text-yellow-400">No USDC</span>
          )}
        </div>
      )}

      {/* Vault stats */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Backed</p>
          <p className="mt-1 text-lg font-bold text-white">
            {vault ? formatUSDC(vault.totalDeposited) : "--"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Vault Cap</p>
          <p className="mt-1 text-lg font-bold text-white">
            {vault ? formatUSDC(vault.cap) : "--"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Share Price</p>
          <p className="mt-1 flex items-center gap-1 text-lg font-bold text-accent-cyan">
            <TrendingUp className="h-4 w-4" />
            ${sharePrice.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Yield distributed row */}
      {vault && totalYieldDistributed > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-2">
          <Zap className="h-3.5 w-3.5 text-accent-cyan" />
          <span className="text-xs text-slate-400">Yield distributed by artist:</span>
          <span className="ml-auto text-xs font-semibold text-accent-cyan">
            {formatUSDC(totalYieldDistributed)}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className={isCapReached ? "font-semibold text-yellow-400" : ""}>
            {isCapReached ? "Vault Full" : `${progress.toFixed(1)}% funded`}
          </span>
          <span>{vault ? `${(vault.totalShares / 10 ** USDC_DECIMALS).toFixed(0)} shares minted` : ""}</span>
        </div>
        <div className="vault-progress mt-1.5 h-2">
          <div
            className={`vault-progress-bar ${isCapReached ? "bg-yellow-400" : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {isCapReached && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-yellow-400">
            <Lock className="h-3 w-3" />
            This vault has reached its funding cap — no new deposits accepted.
          </p>
        )}
      </div>

      {/* User position */}
      {position && (
        <div className="mt-4 rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-accent-purple">Your Position</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {(position.sharesHeld / 10 ** USDC_DECIMALS).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                shares
              </p>
              <p className="text-xs text-slate-400">
                {formatUSDC(position.totalDeposited)} deposited
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${yieldEarned > 0 ? "text-accent-cyan" : "text-slate-400"}`}>
                +{formatUSDC(yieldEarned)}
              </p>
              <p className="text-xs text-slate-400">
                {realApy !== null
                  ? `${formatPct(realApy)} APY`
                  : yieldEarned === 0
                  ? "yield pending"
                  : "yield earned"}
              </p>
            </div>
          </div>
          {currentPositionValue > 0 && (
            <div className="mt-2 border-t border-accent-purple/10 pt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Current value</span>
              <span className="font-semibold text-white">{formatUSDC(currentPositionValue)}</span>
            </div>
          )}
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
            {isCapReached ? (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
                <Lock className="mx-auto mb-2 h-5 w-5 text-yellow-400" />
                <p className="text-sm font-medium text-yellow-400">Vault is full</p>
                <p className="mt-1 text-xs text-slate-500">
                  This vault has reached its funding cap. No new deposits are accepted.
                </p>
              </div>
            ) : (
              <>
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
                  disabled={!publicKey || !vault || deposit.isPending || !depositAmount || parseFloat(depositAmount) <= 0}
                  className="btn-primary mt-3 flex w-full items-center justify-center gap-2"
                >
                  {deposit.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="h-4 w-4" />
                  )}
                  {!publicKey ? "Connect Wallet" : !vault ? "No Vault Yet" : deposit.isPending ? "Backing..." : "Back This Track"}
                </button>
              </>
            )}
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
                onClick={() => setWithdrawAmount((position.sharesHeld / 10 ** USDC_DECIMALS).toString())}
                className="mt-2 text-xs text-accent-cyan hover:underline"
              >
                Max: {(position.sharesHeld / 10 ** USDC_DECIMALS).toFixed(2)} shares
                {yieldEarned > 0 && ` (+${formatUSDC(yieldEarned)} yield)`}
              </button>
            )}
            <button
              onClick={handleWithdraw}
              disabled={!publicKey || withdraw.isPending || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
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

      {/* Last transaction */}
      {lastTxHash && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-2">
          <span className="text-xs text-slate-400">Last tx:</span>
          <a
            href={explorerUrl(lastTxHash)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-accent-cyan hover:underline"
          >
            {lastTxHash.slice(0, 8)}...{lastTxHash.slice(-8)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Vault not initialized */}
      {!vaultLoading && !vault && (
        <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
          {isArtist ? (
            <>
              <p className="text-xs text-yellow-400 mb-3">
                No vault exists for this track yet. Create one via the Artist Portal.
              </p>
              <Link href="/artist/register" className="btn-primary inline-flex items-center gap-2 text-sm">
                Create Vault in Artist Portal
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs text-yellow-400 mb-2">No vault exists for this track yet.</p>
              <p className="text-[11px] text-slate-500">
                Only the artist can create a vault.{" "}
                <Link href="/artist" className="text-accent-purple hover:underline">
                  Are you the artist?
                </Link>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
