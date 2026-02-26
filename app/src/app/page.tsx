"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSearchTracks } from "@/hooks/useAudius";
import { useVaultedTracks } from "@/hooks/useVault";
import { TrackGrid } from "@/components/track/TrackGrid";
import { RaisingSection } from "@/components/track/RaisingSection";
import {
  Music,
  Zap,
  ArrowRight,
  Mic2,
  Shield,
  Users,
  TrendingUp,
  BadgePercent,
  Coins,
  Globe,
  ChevronDown,
  CheckCircle,
  Wallet,
} from "lucide-react";
import Link from "next/link";

// ─── Live stats bar ────────────────────────────────────────────────────────

function StatsBar() {
  const { data: items } = useVaultedTracks();
  const vaultCount = items?.length ?? 0;
  const totalBacked = items?.reduce((s, i) => s + i.vault.totalDeposited, 0) ?? 0;
  const totalBackers = items?.reduce((s, i) => s + i.vault.totalShares, 0) ?? 0;
  const totalYield = items?.reduce((s, i) => s + i.vault.totalYieldDistributed, 0) ?? 0;

  const fmt = (n: number) => {
    const usdc = n / 1_000_000;
    if (usdc >= 1000) return `$${(usdc / 1000).toFixed(1)}K`;
    return `$${usdc.toFixed(0)}`;
  };

  if (vaultCount === 0) return null;

  return (
    <div className="border-y border-base-200/60 bg-base-50/50 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 sm:px-6">
        {[
          { label: "Live Vaults", value: vaultCount.toString() },
          { label: "Total Backed", value: fmt(totalBacked) },
          { label: "Shares Minted", value: (totalBackers / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 0 }) },
          { label: "Yield Distributed", value: fmt(totalYield) },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-base font-bold text-white">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-16 pt-20">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 h-[600px] w-[900px] rounded-full bg-accent-purple/10 blur-[140px]" />
        <div className="absolute right-0 top-1/2 h-[400px] w-[500px] -translate-y-1/2 rounded-full bg-accent-cyan/6 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full bg-accent-pink/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-purple/20 bg-accent-purple/10 px-4 py-1.5 text-sm text-accent-purple">
          <Zap className="h-3.5 w-3.5" />
          On-Chain Music Funding · Built on Solana
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Back the music you believe in.
          <br />
          <span className="gradient-text">Earn when the artist wins.</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
          Artists raise production capital from fans via trustless on-chain vaults.
          Fans receive share tokens and earn a cut of the artist's royalties —
          distributed directly on-chain, no middlemen.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a href="#raising" className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3">
            See Live Vaults
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href="/artist/register"
            className="btn-secondary inline-flex items-center gap-2 text-base px-6 py-3"
          >
            <Mic2 className="h-4 w-4" />
            Launch Your Vault
          </Link>
        </div>

        {/* Scroll cue */}
        <div className="mt-10 flex justify-center">
          <a href="#how-it-works" className="flex flex-col items-center gap-1 text-slate-600 transition-colors hover:text-slate-400">
            <span className="text-xs uppercase tracking-widest">How it works</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ──────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: <Mic2 className="h-5 w-5 text-accent-purple" />,
      color: "purple",
      title: "Artist Creates a Vault",
      desc: "An artist verifies their Audius identity via OAuth, selects a track, sets a funding cap, and publicly pledges what percentage of royalties they'll distribute back to backers and on what schedule.",
    },
    {
      n: "02",
      icon: <Coins className="h-5 w-5 text-accent-cyan" />,
      color: "cyan",
      title: "Fans Deposit USDC",
      desc: "Fans deposit USDC into the vault and instantly receive share tokens proportional to their contribution. Every deposit and share issuance is recorded on Solana — fully transparent and non-custodial.",
    },
    {
      n: "03",
      icon: <BadgePercent className="h-5 w-5 text-accent-pink" />,
      color: "pink",
      title: "Royalties Flow On-Chain",
      desc: "As the track earns royalties on Audius and other platforms, the artist sends a portion directly into the vault. This increases the share price — backers can withdraw more USDC than they put in.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-white">How It Works</h2>
          <p className="mt-2 text-sm text-slate-400">Three steps. Fully on-chain. No trust required.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="glass-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-accent-${s.color}/10`}>
                  {s.icon}
                </div>
                <span className={`text-3xl font-extrabold text-accent-${s.color}/20`}>{s.n}</span>
              </div>
              <h3 className="font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── For Fans / For Artists split ──────────────────────────────────────────

function BenefitsSection() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* For Fans */}
          <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/10">
                <Users className="h-5 w-5 text-accent-cyan" />
              </div>
              <h2 className="text-lg font-bold text-white">For Fans</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Deposit USDC and receive share tokens instantly",
                "Earn a share of the artist's real royalty income",
                "Watch your share price grow with every distribution",
                "Withdraw your principal + yield at any time",
                "Every transaction visible on Solana Explorer",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-cyan" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* For Artists */}
          <div className="rounded-2xl border border-accent-purple/20 bg-accent-purple/5 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10">
                <Mic2 className="h-5 w-5 text-accent-purple" />
              </div>
              <h2 className="text-lg font-bold text-white">For Artists</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Raise production capital directly from your fanbase",
                "Verify track ownership via Audius OAuth — no paperwork",
                "Set your own funding cap, royalty %, and distribution schedule",
                "Pledge is recorded on-chain — publicly visible to all backers",
                "Build a community with real financial skin in the game",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-purple" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Why trustless ─────────────────────────────────────────────────────────

function TrustlessSection() {
  const pillars = [
    {
      icon: <Shield className="h-6 w-6 text-accent-purple" />,
      title: "Non-Custodial",
      desc: "Your USDC lives in a Solana PDA vault — not a company wallet. No one can freeze or take your funds.",
    },
    {
      icon: <Globe className="h-6 w-6 text-accent-cyan" />,
      title: "Fully Transparent",
      desc: "Every deposit, withdrawal, and royalty distribution is a public on-chain transaction. Verify anything on Solana Explorer.",
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-accent-pink" />,
      title: "Real Yield",
      desc: "Returns come from actual music royalties pushed by the artist, not from DeFi leverage or token inflation.",
    },
    {
      icon: <Wallet className="h-6 w-6 text-accent-cyan" />,
      title: "Exit Anytime",
      desc: "Withdraw your share tokens for their current USDC value at any time — no lock-up periods, no withdrawal fees.",
    },
  ];

  return (
    <section className="py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-white">Trustless by Design</h2>
          <p className="mt-2 text-sm text-slate-400">
            The smart contract enforces every rule. We can't change the terms, and neither can the artist.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="glass-card p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-base-100">
                {p.icon}
              </div>
              <h3 className="font-semibold text-white">{p.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────

function FAQ() {
  const items = [
    {
      q: "How does yield actually work?",
      a: "Depositing 100 USDC mints you 100 share tokens. When the artist distributes royalties into the vault, the share price increases — your 100 shares might now be worth 112 USDC. The difference is your yield. Withdraw anytime to realise it.",
    },
    {
      q: "What stops an artist from never distributing royalties?",
      a: "The artist's pledge (royalty %, schedule, duration) is stored on-chain at vault creation — permanently visible to anyone. The vault itself doesn't hold any royalties in escrow, but the public pledge creates social and reputational accountability. Future versions will integrate automatic royalty routing.",
    },
    {
      q: "Can I get my money back before the vault ends?",
      a: "Yes. You can withdraw your share tokens for their current USDC value at any time. If the artist has already distributed yield, you'll receive more than you deposited.",
    },
    {
      q: "Why Audius for artist verification?",
      a: "Audius is an on-chain music streaming platform. When an artist connects via Audius OAuth, we can cryptographically verify they own the track ID the vault is created for — preventing impersonation.",
    },
  ];

  return (
    <section className="py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.q} className="glass-card p-5">
              <h3 className="font-semibold text-white">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Artist CTA ────────────────────────────────────────────────────────────

function ArtistCTA() {
  return (
    <section className="pb-20 pt-4">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-accent-purple/20 bg-accent-purple/5 px-8 py-12 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-purple/15 via-transparent to-accent-cyan/8" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-purple/20">
              <Mic2 className="h-7 w-7 text-accent-purple" />
            </div>
            <h2 className="text-2xl font-bold text-white">Ready to launch your vault?</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
              Connect your Audius account, pick a track you own, set your funding goal and royalty pledge.
              Your vault goes live in minutes — fans can start backing immediately.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/artist/register" className="btn-primary inline-flex items-center gap-2">
                <Mic2 className="h-4 w-4" />
                Create a Vault
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/artist" className="btn-secondary inline-flex items-center gap-2">
                <Music className="h-4 w-4" />
                Artist Dashboard
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-600">
              Devnet only · No real funds at risk · Powered by Solana, Audius & OrbitFlare
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { data: searchResults, isLoading: searchLoading } = useSearchTracks(searchQuery);
  const isSearching = searchQuery.length > 2;

  return (
    <div>
      <HeroSection />
      <StatsBar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <HowItWorks />
        <BenefitsSection />
        <TrustlessSection />

        {isSearching && (
          <section className="pb-8">
            <TrackGrid
              tracks={searchResults || []}
              title={`Results for "${searchQuery}"`}
              isLoading={searchLoading}
            />
          </section>
        )}

        <RaisingSection />
        <FAQ />
        <ArtistCTA />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-purple border-t-transparent" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
