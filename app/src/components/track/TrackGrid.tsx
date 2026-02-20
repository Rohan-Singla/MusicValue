"use client";

import { TrackCard } from "./TrackCard";
import type { AudiusTrack } from "@/services/audius";

interface TrackGridProps {
  tracks: AudiusTrack[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="aspect-square animate-pulse bg-base-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-base-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-base-100" />
        <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-base-100" />
      </div>
    </div>
  );
}

export function TrackGrid({
  tracks,
  title,
  subtitle,
  isLoading,
}: TrackGridProps) {
  return (
    <section>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-xl font-bold text-white">{title}</h2>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
          : tracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
      </div>

      {!isLoading && tracks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-slate-400">No tracks found</p>
          <p className="mt-1 text-sm text-slate-500">
            Try searching for something else
          </p>
        </div>
      )}
    </section>
  );
}
