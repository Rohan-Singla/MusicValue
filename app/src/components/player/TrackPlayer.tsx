"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, AlertCircle } from "lucide-react";
import { getTrackStreamUrl } from "@/services/audius";

interface TrackPlayerProps {
  trackId: string;
  title: string;
  artist: string;
  artwork: string;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TrackPlayer({
  trackId,
  title,
  artist,
  artwork,
  compact = false,
}: TrackPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true while metadata loads
  const [error, setError] = useState<string | null>(null);

  const streamUrl = getTrackStreamUrl(trackId);

  // Initialize audio and load metadata immediately so duration is available
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setError(null);

    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volume;
    // Set src immediately — this triggers the browser to fetch metadata
    // (including duration) without downloading the full stream.
    audio.src = streamUrl;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
      setIsLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError("Stream unavailable — the track may be restricted or offline.");
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (e: any) {
        setIsLoading(false);
        // NotAllowedError = browser autoplay policy, anything else is a real error
        if (e?.name !== "AbortError") {
          setError("Playback failed. The stream may not be available in your region.");
        }
      }
    }
  }, [isPlaying, error]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = progressRef.current;
      if (!audio || !bar || !duration) return;

      const rect = bar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = percent * duration;
    },
    [duration]
  );

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
    if (val > 0 && isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
    }
  }, [isMuted]);

  const skipBy = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration));
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ─── compact mode ────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!!error}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-primary text-white transition-transform hover:scale-105 disabled:opacity-40"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div
            ref={progressRef}
            onClick={seek}
            className="vault-progress h-1.5 cursor-pointer"
          >
            <div className="vault-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── full mode ───────────────────────────────────────────────────────────────
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-4">
        {/* Artwork */}
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
          <img
            src={artwork || "/placeholder-track.svg"}
            alt={title}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-track.svg"; }}
          />
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="flex items-end gap-0.5 h-4">
                {[0, 150, 300, 450].map((delay) => (
                  <div
                    key={delay}
                    className="w-0.5 animate-pulse bg-accent-cyan rounded-full"
                    style={{ height: delay % 300 === 0 ? "60%" : delay % 150 === 0 ? "100%" : "40%", animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="truncate text-xs text-slate-400">{artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skipBy(-10)}
            disabled={!duration}
            className="text-slate-400 transition-colors hover:text-white disabled:opacity-30"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!!error}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-white transition-transform hover:scale-105 disabled:opacity-40"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skipBy(10)}
            disabled={!duration}
            className="text-slate-400 transition-colors hover:text-white disabled:opacity-30"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Volume */}
        <div className="hidden items-center gap-2 sm:flex">
          <button onClick={toggleMute} className="text-slate-400 transition-colors hover:text-white">
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-base-200 accent-accent-purple"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div
          ref={progressRef}
          onClick={seek}
          className="vault-progress h-2 cursor-pointer"
        >
          <div className="vault-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>{formatTime(currentTime)}</span>
          <span>{isLoading && duration === 0 ? "—:——" : formatTime(duration)}</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
