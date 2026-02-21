"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAudiusAuth } from "@/hooks/useAudiusAuth";
import { AudiusLoginButton } from "@/components/artist/AudiusLoginButton";
import { getUserTracks } from "@/services/audius";
import { useInitializeVault } from "@/hooks/useVault";
import { AudiusTrack } from "@/services/audius";
import { USDC_DECIMALS } from "@/lib/constants";
import {
  ArrowRight,
  CheckCircle,
  Music,
  Shield,
  Loader2,
  ChevronLeft,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Intro" },
  { id: 2, label: "Connect" },
  { id: 3, label: "Track" },
  { id: 4, label: "Terms" },
  { id: 5, label: "Create" },
];

export default function ArtistRegisterPage() {
  const router = useRouter();
  const { user: audiusUser } = useAudiusAuth();
  const { publicKey } = useWallet();
  const [step, setStep] = useState<Step>(1);
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<AudiusTrack | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [capInput, setCapInput] = useState("10000");

  const initVault = useInitializeVault(selectedTrack?.id ?? "");

  const goNext = () => setStep((s) => (Math.min(s + 1, 5) as Step));
  const goPrev = () => setStep((s) => (Math.max(s - 1, 1) as Step));

  const loadTracks = async () => {
    if (!audiusUser) return;
    setTracksLoading(true);
    try {
      const result = await getUserTracks(audiusUser.userId);
      setTracks(result);
    } catch {
      toast.error("Failed to load your tracks");
    } finally {
      setTracksLoading(false);
    }
  };

  const handleConnectAndNext = async () => {
    if (!audiusUser) {
      toast.error("Please connect your Audius account first");
      return;
    }
    await loadTracks();
    goNext();
  };

  const handleTrackSelectAndNext = async () => {
    if (!selectedTrack || !audiusUser) return;

    setVerifying(true);
    try {
      const res = await fetch("/api/audius/verify-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt: audiusUser.jwt, trackId: selectedTrack.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Track ownership verification failed");
      }
      goNext();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify track ownership");
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateVault = async () => {
    if (!selectedTrack || !publicKey) return;

    const trackId = selectedTrack.id;
    if (trackId.length > 32) {
      toast.error("Track ID exceeds 32 characters. Please select a different track.");
      return;
    }

    const cap = parseFloat(capInput);
    if (!cap || cap <= 0) {
      toast.error("Please enter a valid funding cap");
      return;
    }

    try {
      const capLamports = Math.floor(cap * 10 ** USDC_DECIMALS);
      await initVault.mutateAsync(capLamports);
      toast.success("Vault created successfully!");
      router.push("/artist");
    } catch (err: any) {
      toast.error(err.message || "Failed to create vault");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      {/* Back link */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      {/* Step progress */}
      <div className="mb-8 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step > s.id
                  ? "bg-accent-purple text-white"
                  : step === s.id
                  ? "border-2 border-accent-purple text-accent-purple"
                  : "border border-base-200 text-slate-500"
              }`}
            >
              {step > s.id ? <CheckCircle className="h-4 w-4" /> : s.id}
            </div>
            <span
              className={`hidden text-xs sm:block ${
                step === s.id ? "text-white" : "text-slate-500"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-px w-6 ${
                  step > s.id ? "bg-accent-purple" : "bg-base-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="glass-card p-8">
        {/* Step 1: Intro */}
        {step === 1 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
              <Music className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Artist Portal</h1>
            <p className="mt-3 text-slate-400">
              Create a music vault for your Audius tracks. Fans deposit USDC, earn
              DeFi yield, and you build a committed community of backers.
            </p>
            <div className="mt-6 space-y-3 text-left">
              {[
                "Connect your Audius account to prove track ownership",
                "Select which track to create a vault for",
                "Set a funding cap and launch your vault on Solana",
                "Fans back your music and earn yield while you grow",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-purple" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={goNext}
              className="btn-primary mt-8 inline-flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Connect Audius */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white">Connect Audius</h2>
            <p className="mt-2 text-sm text-slate-400">
              Connect your Audius account to prove you own the tracks you want to
              create vaults for.
            </p>
            <div className="mt-6">
              <AudiusLoginButton className="w-full justify-center" />
            </div>
            {audiusUser && (
              <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3">
                <p className="text-sm font-medium text-green-400">
                  ✓ Connected as @{audiusUser.handle}
                </p>
              </div>
            )}
            <div className="mt-6 flex justify-between">
              <button
                onClick={goPrev}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleConnectAndNext}
                disabled={!audiusUser || tracksLoading}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {tracksLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {tracksLoading ? "Loading tracks..." : "Next: Select Track"}
                {!tracksLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Track */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-white">Select Your Track</h2>
            <p className="mt-2 text-sm text-slate-400">
              Choose which track to create a vault for. Only tracks you own are shown.
            </p>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              {tracksLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-purple" />
                </div>
              ) : tracks.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No tracks found on your Audius account
                </p>
              ) : (
                tracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selectedTrack?.id === track.id
                        ? "border-accent-purple bg-accent-purple/10"
                        : "border-base-200 hover:border-accent-purple/30"
                    }`}
                  >
                    <img
                      src={track.artwork?.["150x150"] || "/placeholder-track.svg"}
                      alt={track.title}
                      className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {track.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {track.play_count.toLocaleString()} plays
                        {track.id.length > 32 && (
                          <span className="ml-2 text-yellow-400">(ID too long)</span>
                        )}
                      </p>
                    </div>
                    {selectedTrack?.id === track.id && (
                      <CheckCircle className="h-5 w-5 flex-shrink-0 text-accent-purple" />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={goPrev}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleTrackSelectAndNext}
                disabled={!selectedTrack || verifying || (selectedTrack?.id.length ?? 0) > 32}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying ownership...
                  </>
                ) : (
                  <>
                    Next: Terms
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Terms */}
        {step === 4 && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-accent-purple" />
              <h2 className="text-xl font-bold text-white">Terms & Conditions</h2>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-base-200 bg-base-50 p-4 text-sm text-slate-400">
              <p className="mb-3">By creating a vault on MusicValue, you agree to:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>You are the sole owner of the selected Audius track</li>
                <li>You will make good-faith efforts to distribute yield to backers</li>
                <li>Vault funds are held in a non-custodial Solana smart contract</li>
                <li>Fans may withdraw their deposits at any time</li>
                <li>MusicValue does not guarantee returns or specific yield rates</li>
                <li>This is experimental software running on Solana devnet</li>
                <li>You are responsible for tax and legal obligations in your jurisdiction</li>
              </ul>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#8b5cf6]"
              />
              <span className="text-sm text-slate-300">
                I agree to the terms and conditions and confirm I own this track
              </span>
            </label>
            <div className="mt-6 flex justify-between">
              <button
                onClick={goPrev}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={goNext}
                disabled={!termsAccepted}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Next: Create Vault
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Create Vault */}
        {step === 5 && selectedTrack && (
          <div>
            <h2 className="text-xl font-bold text-white">Create Your Vault</h2>
            <p className="mt-2 text-sm text-slate-400">
              Set a funding cap and launch your vault on Solana devnet.
            </p>

            {/* Selected track preview */}
            <div className="mt-4 rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedTrack.artwork?.["150x150"] || "/placeholder-track.svg"}
                  alt={selectedTrack.title}
                  className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                />
                <div>
                  <p className="font-semibold text-white">{selectedTrack.title}</p>
                  <p className="text-xs text-slate-400">
                    {selectedTrack.play_count.toLocaleString()} plays · ID: {selectedTrack.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Cap input */}
            <div className="mt-5">
              <label className="text-sm font-medium text-slate-300">
                Funding Cap (USDC)
              </label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  placeholder="10000"
                  min="1"
                  className="h-12 w-full rounded-xl border border-base-200 bg-base-50 pl-4 pr-16 text-lg text-white outline-none transition-colors focus:border-accent-purple/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  USDC
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Maximum total USDC fans can deposit into your vault
              </p>
            </div>

            {!publicKey && (
              <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                <p className="text-xs text-yellow-400">
                  Connect your Solana wallet to create the vault
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={goPrev}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleCreateVault}
                disabled={!publicKey || initVault.isPending}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {initVault.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating vault...
                  </>
                ) : (
                  <>
                    <Music className="h-4 w-4" />
                    Launch Vault
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
