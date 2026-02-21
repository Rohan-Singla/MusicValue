"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAudiusAuth } from "@/hooks/useAudiusAuth";
import { AudiusLoginButton } from "@/components/artist/AudiusLoginButton";
import { ArtistVaultCard } from "@/components/artist/ArtistVaultCard";
import { WalletButton } from "@/components/wallet/WalletButton";
import { getUserTracks } from "@/services/audius";
import { AudiusTrack } from "@/services/audius";
import { Music, Plus, Loader2 } from "lucide-react";
import Link from "next/link";

function ArtistDashboard() {
  const { user: audiusUser } = useAudiusAuth();
  const { publicKey } = useWallet();
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tracks once; vault data is fetched per-card (no hooks in loop)
  useEffect(() => {
    if (!audiusUser) {
      setIsLoading(false);
      return;
    }
    getUserTracks(audiusUser.userId)
      .then(setTracks)
      .catch(() => setTracks([]))
      .finally(() => setIsLoading(false));
  }, [audiusUser]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Artist Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your music vaults and distribute yield to fans
          </p>
        </div>
        <Link
          href="/artist/register"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          New Vault
        </Link>
      </div>

      {/* Auth status cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="glass-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Audius Account
          </p>
          <AudiusLoginButton />
        </div>
        <div className="glass-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Solana Wallet
          </p>
          <WalletButton />
          {publicKey && (
            <p className="mt-1.5 text-xs text-slate-500">
              {publicKey.toBase58().slice(0, 8)}…{publicKey.toBase58().slice(-8)}
            </p>
          )}
        </div>
      </div>

      {/* Tracks & vaults */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-white">Your Tracks</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Music className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">
              No tracks found. Make sure your Audius account is connected.
            </p>
            <Link
              href="/artist/register"
              className="btn-primary mt-4 inline-flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Create Your First Vault
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tracks.map((track) => (
              <ArtistVaultCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArtistPage() {
  const { user: audiusUser, isLoading } = useAudiusAuth();
  const { publicKey } = useWallet();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
      </div>
    );
  }

  // Dual auth gate: need both Audius connected AND Solana wallet
  if (!audiusUser || !publicKey) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
          <Music className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Artist Portal</h1>
        <p className="mt-3 text-slate-400">
          Connect both your Audius account and Solana wallet to access your
          artist dashboard.
        </p>

        <div className="mt-8 space-y-4">
          <div className="glass-card p-4 text-left">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Step 1 — Audius Identity
            </p>
            <AudiusLoginButton className="w-full justify-center" />
          </div>
          <div className="glass-card p-4 text-left">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Step 2 — Solana Wallet
            </p>
            <WalletButton />
          </div>
        </div>

        <Link
          href="/artist/register"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent-purple hover:underline"
        >
          New to MusicValue? Register as an artist
        </Link>
      </div>
    );
  }

  return <ArtistDashboard />;
}
