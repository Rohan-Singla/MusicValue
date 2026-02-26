"use client";

import { useParams } from "next/navigation";
import { useTrack } from "@/hooks/useAudius";
import { VaultPanel } from "@/components/track/VaultPanel";
import { TrackPlayer } from "@/components/player/TrackPlayer";
import {
  ArrowLeft,
  Play,
  Heart,
  Share2,
  Users,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TrackPage() {
  const params = useParams();
  const trackId = params.id as string;
  const { data: track, isLoading } = useTrack(trackId);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-purple border-t-transparent" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-400">Track not found</p>
        <Link href="/" className="btn-secondary text-sm">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to explore
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left: Track info */}
        <div>
          {/* Track header */}
          <div className="flex gap-6">
            {/* Artwork */}
            <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-accent-purple/20">
              <img
                src={track.artwork?.["480x480"] || "/placeholder-track.svg"}
                alt={track.title}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-track.svg"; }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                <Play className="h-12 w-12 text-white" />
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col justify-center">
              {track.genre && (
                <span className="mb-2 w-fit rounded-lg bg-accent-purple/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent-purple">
                  {track.genre}
                </span>
              )}
              <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                {track.title}
              </h1>
              <Link
                href={`https://audius.co/${track.user.handle}`}
                target="_blank"
                className="mt-1 flex items-center gap-2 text-slate-400 transition-colors hover:text-accent-cyan"
              >
                <img
                  src={track.user.profile_picture?.["150x150"] || "/placeholder-avatar.svg"}
                  alt={track.user.name}
                  className="h-6 w-6 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-avatar.svg"; }}
                />
                <span className="font-medium">{track.user.name}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              {/* Stats */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Play className="h-4 w-4 text-accent-cyan" />
                  {formatNumber(track.play_count)} plays
                </span>
                <span className="flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-accent-pink" />
                  {formatNumber(track.favorite_count)} favorites
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-accent-purple" />
                  {formatNumber(track.repost_count)} reposts
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-500" />
                  {formatDuration(track.duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Player */}
          <div className="mt-6">
            <TrackPlayer
              trackId={trackId}
              title={track.title}
              artist={track.user.name}
              artwork={track.artwork?.["150x150"] || "/placeholder-track.svg"}
            />
          </div>

          {/* Description */}
          {track.description && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-slate-300">About</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {track.description}
              </p>
            </div>
          )}

          {/* Popularity signal */}
          <div className="mt-8 glass-card p-5">
            <h3 className="text-sm font-semibold text-white">
              Popularity Signal
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Track metrics from Audius used to calculate yield boost
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: "Play Score",
                  value: Math.min(Math.floor(track.play_count / 100), 100),
                  max: 100,
                },
                {
                  label: "Fan Score",
                  value: Math.min(
                    Math.floor(track.favorite_count / 10),
                    100
                  ),
                  max: 100,
                },
                {
                  label: "Viral Score",
                  value: Math.min(
                    Math.floor(track.repost_count / 10),
                    100
                  ),
                  max: 100,
                },
                {
                  label: "Boost",
                  value: Math.min(
                    Math.floor(
                      (track.play_count + track.favorite_count * 5) / 500
                    ),
                    50
                  ),
                  max: 50,
                  suffix: "%",
                },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{metric.label}</span>
                    <span className="font-medium text-white">
                      {metric.value}
                      {metric.suffix || `/${metric.max}`}
                    </span>
                  </div>
                  <div className="vault-progress mt-1.5 h-1.5">
                    <div
                      className="vault-progress-bar"
                      style={{
                        width: `${(metric.value / metric.max) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Vault panel */}
        <div className="space-y-4">
          <VaultPanel trackId={trackId} trackTitle={track.title} artistUserId={track.user.id} />
        </div>
      </div>
    </div>
  );
}
