"use client";

import Link from "next/link";
import { useVaultedTracks, VaultedTrack } from "@/hooks/useVault";
import { USDC_DECIMALS } from "@/lib/constants";
import {
  Users,
  Zap,
  ArrowRight,
  Mic2,
  Music,
  Lock,
  BadgePercent,
} from "lucide-react";

// ─── helpers ───────────────────────────────────────────────────────────────

function formatUSDC(raw: number) {
  const n = raw / 10 ** USDC_DECIMALS;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(deposited: number, cap: number) {
  return cap > 0 ? Math.min((deposited / cap) * 100, 100) : 0;
}

// ─── skeleton card ──────────────────────────────────────────────────────────

function SkeletonRaisingCard() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-base-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-base-100" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded-full bg-base-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-base-100" />
        </div>
        <div className="h-1.5 w-full animate-pulse rounded-full bg-base-100" />
        <div className="flex justify-between">
          <div className="h-3 w-1/4 animate-pulse rounded bg-base-100" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-base-100" />
        </div>
      </div>
    </div>
  );
}

// ─── single raising card ─────────────────────────────────────────────────────

function RaisingCard({ item }: { item: VaultedTrack }) {
  const { vault, track } = item;
  const progress = pct(vault.totalDeposited, vault.cap);
  const raised = formatUSDC(vault.totalDeposited);
  const cap = formatUSDC(vault.cap);
  const backers = vault.totalShares;

  return (
    <Link href={`/track/${track.id}`}>
      <div className="glass-card group cursor-pointer overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-accent-purple/10">
        {/* Artwork */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={track.artwork?.["480x480"] || "/placeholder-track.svg"}
            alt={track.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-track.svg"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-base/90 via-base/20 to-transparent" />

          {/* Genre + royalty pledge badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {track.genre && (
              <span className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-purple backdrop-blur-sm">
                {track.genre}
              </span>
            )}
            {vault.royaltyPct > 0 && (
              <span className="flex items-center gap-0.5 rounded-md bg-accent-cyan/20 px-2 py-0.5 text-[10px] font-semibold text-accent-cyan backdrop-blur-sm">
                <BadgePercent className="h-2.5 w-2.5" />
                {vault.royaltyPct}% royalties
              </span>
            )}
          </div>

          {/* Progress pill overlay at bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              {progress >= 100 ? (
                <span className="flex items-center gap-1 font-semibold text-yellow-400">
                  <Lock className="h-2.5 w-2.5" />
                  Vault Full
                </span>
              ) : (
                <span className="font-semibold text-white">{raised} raised</span>
              )}
              <span className="text-slate-400">cap {cap}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 100
                    ? "bg-yellow-400"
                    : "bg-gradient-to-r from-accent-purple to-accent-cyan"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="truncate font-semibold text-white">{track.title}</h3>

          {/* Artist row */}
          <div className="mt-1.5 flex items-center gap-2">
            {track.user.profile_picture ? (
              <img
                src={track.user.profile_picture["150x150"]}
                alt={track.user.name}
                className="h-5 w-5 flex-shrink-0 rounded-full object-cover ring-1 ring-accent-purple/30"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-avatar.svg"; }}
              />
            ) : (
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-purple/20">
                <Music className="h-2.5 w-2.5 text-accent-purple" />
              </div>
            )}
            <span className="truncate text-xs text-slate-400">{track.user.name}</span>
          </div>

          {/* Stats */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {backers.toLocaleString()} backers
            </span>
            <span className="font-semibold text-accent-cyan">
              {progress.toFixed(0)}% funded
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── artist chip row ─────────────────────────────────────────────────────────

function ArtistChips({ items }: { items: VaultedTrack[] }) {
  // Deduplicate by artist id
  const artists = Array.from(
    new Map(items.map((i) => [i.track.user.id, i.track.user])).values()
  );

  if (artists.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Artists on MusicValue
      </h3>
      <div className="flex flex-wrap gap-2">
        {artists.map((artist) => (
          <a
            key={artist.id}
            href={`https://audius.co/${artist.handle}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full border border-base-200 bg-base-50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-accent-purple/40 hover:text-white"
          >
            {artist.profile_picture ? (
              <img
                src={artist.profile_picture["150x150"]}
                alt={artist.name}
                className="h-5 w-5 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-avatar.svg"; }}
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-purple/20">
                <Mic2 className="h-2.5 w-2.5 text-accent-purple" />
              </div>
            )}
            {artist.name}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-base-200 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-purple/10">
        <Zap className="h-8 w-8 text-accent-purple" />
      </div>
      <h3 className="text-lg font-bold text-white">No vaults yet</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        Be the first artist to launch a music vault on MusicValue. Connect your
        Audius account and let fans back your tracks.
      </p>
      <Link
        href="/artist/register"
        className="btn-primary mt-6 inline-flex items-center gap-2 text-sm"
      >
        <Mic2 className="h-4 w-4" />
        Launch Your Vault
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ─── main section ─────────────────────────────────────────────────────────────

export function RaisingSection() {
  const { data: items, isLoading } = useVaultedTracks();

  return (
    <section id="raising" className="pb-16 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Raising Now</h2>
          <p className="mt-1 text-sm text-slate-400">
            Tracks actively raising on MusicValue — back them to earn yield
          </p>
        </div>
        {items && items.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-1.5 text-xs font-medium text-accent-cyan">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-cyan opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-cyan" />
            </span>
            {items.length} live vault{items.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRaisingCard key={i} />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <RaisingCard key={item.vault.audiusTrackId} item={item} />
            ))}
          </div>
          <ArtistChips items={items} />
        </>
      )}
    </section>
  );
}
