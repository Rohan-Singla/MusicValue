"use client";

import Link from "next/link";
import { Play, Users, Heart, Lock } from "lucide-react";
import type { AudiusTrack } from "@/services/audius";

interface TrackCardProps {
  track: AudiusTrack;
  vaultStats?: {
    totalDeposited: number;
    cap: number;
  } | null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatUSDC(amount: number): string {
  return `$${(amount / 1_000_000).toFixed(0)}`;
}

export function TrackCard({ track, vaultStats }: TrackCardProps) {
  const progress = vaultStats
    ? Math.min((vaultStats.totalDeposited / vaultStats.cap) * 100, 100)
    : 0;

  return (
    <Link href={`/track/${track.id}`}>
      <div className="glass-card group cursor-pointer overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-accent-purple/10">
        {/* Artwork */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={track.artwork?.["480x480"] || "/placeholder-track.svg"}
            alt={track.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-track.svg"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-base/80 via-transparent to-transparent" />

          {/* Play count overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 backdrop-blur-sm">
            <Play className="h-3 w-3 text-accent-cyan" />
            <span className="text-xs font-medium text-white">
              {formatNumber(track.play_count)}
            </span>
          </div>

          {/* Genre tag */}
          {track.genre && (
            <div className="absolute right-3 top-3 rounded-lg bg-accent-purple/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-purple backdrop-blur-sm">
              {track.genre}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="truncate text-sm font-semibold text-white">
            {track.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {track.user.name}
          </p>

          {/* Stats row */}
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatNumber(track.favorite_count)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatNumber(track.repost_count)}
            </span>
          </div>

          {/* Vault progress */}
          {vaultStats ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                {progress >= 100 ? (
                  <span className="flex items-center gap-1 font-medium text-yellow-400">
                    <Lock className="h-2.5 w-2.5" />
                    Vault Full
                  </span>
                ) : (
                  <span>{formatUSDC(vaultStats.totalDeposited)} backed</span>
                )}
                <span>{formatUSDC(vaultStats.cap)} cap</span>
              </div>
              <div className="vault-progress mt-1 h-1.5">
                <div
                  className={`vault-progress-bar ${progress >= 100 ? "!bg-yellow-400" : ""}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <span className="text-[10px] font-medium text-accent-purple">
                No vault yet - Be the first backer
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
