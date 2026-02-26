"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAudiusAuth } from "@/hooks/useAudiusAuth";
import { AudiusLoginButton } from "@/components/artist/AudiusLoginButton";
import { getUserTracks } from "@/services/audius";
import { useInitializeVault } from "@/hooks/useVault";
import { AudiusTrack } from "@/services/audius";
import { USDC_DECIMALS, BACKEND_URL } from "@/lib/constants";
import {
  ArrowRight,
  CheckCircle,
  Music,
  Shield,
  Loader2,
  ChevronLeft,
  ArrowLeft,
  Zap,
  Users,
  TrendingUp,
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

  // Royalty pledge state
  const [royaltyPct, setRoyaltyPct] = useState<number>(30);
  const [distributionInterval, setDistributionInterval] = useState<"monthly" | "quarterly" | "milestone">("monthly");
  const [vaultDurationMonths, setVaultDurationMonths] = useState<number | null>(12);
  const [pledgeNote, setPledgeNote] = useState("");

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
      const res = await fetch(`${BACKEND_URL}/api/audius/verify-track`, {
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
    if (!selectedTrack || !publicKey || !audiusUser) return;

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
      const intervalMap: Record<string, number> = { monthly: 0, quarterly: 1, milestone: 2 };
      await initVault.mutateAsync({
        cap: capLamports,
        royaltyPct,
        distributionInterval: intervalMap[distributionInterval] ?? 0,
        vaultDurationMonths: vaultDurationMonths ?? 0,
        pledgeNote,
      });

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
            <h1 className="text-2xl font-extrabold text-white">Launch a Music Vault</h1>
            <p className="mt-3 text-slate-400">
              Raise capital from fans who believe in your music. In return, you
              distribute a share of your royalties back to them on-chain — building
              a community that wins when you win.
            </p>

            {/* How the royalty model works */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-left">
              <div className="rounded-xl border border-base-200 bg-base-50 p-3">
                <Users className="mb-2 h-5 w-5 text-accent-purple" />
                <p className="text-xs font-semibold text-white">Fans Back You</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Fans deposit USDC and receive share tokens tied to your vault</p>
              </div>
              <div className="rounded-xl border border-base-200 bg-base-50 p-3">
                <TrendingUp className="mb-2 h-5 w-5 text-accent-cyan" />
                <p className="text-xs font-semibold text-white">You Earn Royalties</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Your music earns streaming revenue on Audius and other platforms</p>
              </div>
              <div className="rounded-xl border border-base-200 bg-base-50 p-3">
                <Zap className="mb-2 h-5 w-5 text-accent-pink" />
                <p className="text-xs font-semibold text-white">Distribute On-Chain</p>
                <p className="mt-0.5 text-[11px] text-slate-400">You push royalty yield to the vault — share holders earn proportionally</p>
              </div>
            </div>

            <div className="mt-6 space-y-2.5 text-left">
              {[
                "Connect your Audius account — we verify you own the track",
                "Set a funding cap (max USDC fans can deposit)",
                "After launch, distribute royalties anytime from your Artist Dashboard",
                "Fans can withdraw their USDC + earned royalties at any time",
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
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-track.svg"; }}
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
                disabled={!selectedTrack || verifying || (selectedTrack?.id?.length ?? 0) > 32}
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
                <li>You will periodically distribute a portion of your music royalties to vault backers via the Artist Dashboard</li>
                <li>Royalty distributions are artist-triggered — you decide the amount and timing</li>
                <li>Vault funds are held in a non-custodial Solana smart contract; MusicValue cannot access them</li>
                <li>Fans may withdraw their USDC deposit at any time</li>
                <li>MusicValue does not guarantee specific royalty yields or distribution schedules</li>
                <li>This is experimental software running on Solana devnet</li>
                <li>You are responsible for any tax and legal obligations in your jurisdiction</li>
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
                I agree to the terms, confirm I own this track, and commit to distributing royalties to my backers
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
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-track.svg"; }}
                />
                <div>
                  <p className="font-semibold text-white">{selectedTrack.title}</p>
                  <p className="text-xs text-slate-400">
                    {selectedTrack.play_count.toLocaleString()} plays · ID: {selectedTrack.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Royalty distribution info */}
            <div className="mt-5 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-4">
              <div className="flex items-start gap-3">
                <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-cyan" />
                <div>
                  <p className="text-sm font-semibold text-white">How royalty distribution works</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Once your vault is live and fans have backed it, go to your{" "}
                    <span className="text-accent-cyan">Artist Dashboard</span> to distribute royalties.
                    You transfer USDC into the vault — every share holder earns proportionally.
                    You control the amount and timing; fans can withdraw anytime.
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

            {/* Royalty pledge */}
            <div className="mt-6 rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">Public Royalty Pledge</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  This is shown publicly to backers before they invest. It's your commitment — be honest.
                </p>
              </div>

              {/* Royalty % */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  % of royalties you pledge to distribute
                </label>
                <div className="flex gap-2">
                  {[10, 20, 30, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setRoyaltyPct(pct)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                        royaltyPct === pct
                          ? "border-accent-purple bg-accent-purple/20 text-accent-purple"
                          : "border-base-200 text-slate-400 hover:border-accent-purple/40"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Distribution interval */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  How often will you distribute?
                </label>
                <div className="flex gap-2">
                  {(["monthly", "quarterly", "milestone"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDistributionInterval(v)}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                        distributionInterval === v
                          ? "border-accent-purple bg-accent-purple/20 text-accent-purple"
                          : "border-base-200 text-slate-400 hover:border-accent-purple/40"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Vault duration
                </label>
                <div className="flex gap-2">
                  {[{ label: "6 mo", value: 6 }, { label: "12 mo", value: 12 }, { label: "24 mo", value: 24 }, { label: "Ongoing", value: null }].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setVaultDurationMonths(opt.value)}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                        vaultDurationMonths === opt.value
                          ? "border-accent-purple bg-accent-purple/20 text-accent-purple"
                          : "border-base-200 text-slate-400 hover:border-accent-purple/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pledge note */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Message to backers <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  value={pledgeNote}
                  onChange={(e) => setPledgeNote(e.target.value)}
                  placeholder="e.g. I'll distribute 30% of my Audius streaming royalties every month for 12 months..."
                  rows={2}
                  maxLength={280}
                  className="w-full resize-none rounded-xl border border-base-200 bg-base-50 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-accent-purple/50 placeholder:text-slate-600"
                />
                <p className="mt-1 text-right text-[10px] text-slate-500">{pledgeNote.length}/280</p>
              </div>
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
