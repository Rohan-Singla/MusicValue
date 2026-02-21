import { AUDIUS_API_KEY, AUDIUS_API_BASE } from "@/lib/constants";

const BASE_URL = AUDIUS_API_BASE;

export interface AudiusUser {
  id: string;
  name: string;
  handle: string;
  profile_picture: {
    "150x150": string;
    "480x480": string;
    "1000x1000": string;
  } | null;
  follower_count: number;
}

export interface AudiusTrack {
  id: string;
  title: string;
  artwork: {
    "150x150": string;
    "480x480": string;
    "1000x1000": string;
  };
  description: string;
  genre: string;
  mood: string;
  play_count: number;
  favorite_count: number;
  repost_count: number;
  duration: number;
  user: AudiusUser;
}

async function audiusFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${AUDIUS_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Audius API error: ${response.status} ${response.statusText}`
    );
  }

  const json = await response.json();
  return json.data as T;
}

export async function getTrack(trackId: string): Promise<AudiusTrack> {
  return audiusFetch<AudiusTrack>(`/tracks/${trackId}`);
}

export async function getTrendingTracks(
  limit?: number,
  genre?: string,
  time?: "week" | "month" | "allTime"
): Promise<AudiusTrack[]> {
  const params: Record<string, string> = {};

  if (limit !== undefined) {
    params.limit = String(limit);
  }
  if (genre) {
    params.genre = genre;
  }
  if (time) {
    params.time = time;
  }

  return audiusFetch<AudiusTrack[]>("/tracks/trending", params);
}

export async function searchTracks(
  query: string,
  limit?: number
): Promise<AudiusTrack[]> {
  const params: Record<string, string> = { query };

  if (limit !== undefined) {
    params.limit = String(limit);
  }

  return audiusFetch<AudiusTrack[]>("/tracks/search", params);
}

export async function getUserTracks(userId: string): Promise<AudiusTrack[]> {
  return audiusFetch<AudiusTrack[]>(`/users/${userId}/tracks`, { limit: "100" });
}

/** Get the direct stream URL for a track */
export function getTrackStreamUrl(trackId: string): string {
  const url = new URL(`${BASE_URL}/tracks/${trackId}/stream`);
  if (AUDIUS_API_KEY) {
    url.searchParams.set("api_key", AUDIUS_API_KEY);
  }
  return url.toString();
}
