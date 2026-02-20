"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getTrack,
  getTrendingTracks,
  searchTracks,
} from "@/services/audius";

export function useTrack(trackId: string | undefined) {
  return useQuery({
    queryKey: ["audius", "track", trackId],
    queryFn: () => getTrack(trackId!),
    enabled: trackId !== undefined,
  });
}

export function useTrendingTracks(limit?: number) {
  return useQuery({
    queryKey: ["audius", "trending", limit],
    queryFn: () => getTrendingTracks(limit),
  });
}

export function useSearchTracks(query: string) {
  return useQuery({
    queryKey: ["audius", "search", query],
    queryFn: () => searchTracks(query),
    enabled: query.length > 2,
  });
}
