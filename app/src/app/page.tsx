"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSearchTracks } from "@/hooks/useAudius";
import { TrackGrid } from "@/components/track/TrackGrid";
import { RaisingSection } from "@/components/track/RaisingSection";
import { Music, Zap, ArrowRight, Mic2 } from "lucide-react";
import Link from "next/link";

function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20">
      {/* Background glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[500px] w-[800px] rounded-full bg-accent-purple/10 blur-[120px]" />
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <div className="h-[300px] w-[400px] rounded-full bg-accent-cyan/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-purple/20 bg-accent-purple/10 px-4 py-1.5 text-sm text-accent-purple">
          <Zap className="h-3.5 w-3.5" />
          Powered by Solana DeFi
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Back artists you believe in.
          <br />
          <span className="gradient-text">Earn when they win.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
          Artists raise capital from fans via on-chain vaults. Fans receive
          share tokens and earn yield as artists distribute royalties back to
          their backers — all on Solana.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <a href="#raising" className="btn-primary inline-flex items-center gap-2">
            See Live Vaults
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href="/artist/register"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Mic2 className="h-4 w-4" />
            Launch Your Vault
          </Link>
        </div>

      </div>
    </section>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const { data: searchResults, isLoading: searchLoading } = useSearchTracks(searchQuery);

  const isSearching = searchQuery.length > 2;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <HeroSection />

      {/* How it works */}
      <section className="py-12">
        <h2 className="text-center text-xl font-bold text-white">
          How It Works
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Artist Creates Vault",
              desc: "Artists verify their Audius identity and launch a vault for their track with a funding cap",
              color: "purple",
            },
            {
              step: "02",
              title: "Fans Back the Track",
              desc: "Fans deposit USDC and receive share tokens proportional to their contribution",
              color: "cyan",
            },
            {
              step: "03",
              title: "Royalties Flow Back",
              desc: "Artists distribute royalty yield on-chain — share holders earn proportionally and can withdraw anytime",
              color: "pink",
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-5 text-center">
              <span
                className={`text-3xl font-extrabold text-accent-${item.color}/30`}
              >
                {item.step}
              </span>
              <h3 className="mt-2 text-sm font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search results — shown above Raising section when searching */}
      {isSearching && (
        <section className="pb-8">
          <TrackGrid
            tracks={searchResults || []}
            title={`Results for "${searchQuery}"`}
            isLoading={searchLoading}
          />
        </section>
      )}

      {/* Live MusicValue marketplace */}
      <RaisingSection />

      {/* Artist CTA */}
      <section className="pb-16">
        <div className="relative overflow-hidden rounded-2xl border border-accent-purple/20 bg-accent-purple/5 px-8 py-10 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 via-transparent to-accent-cyan/5 pointer-events-none" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-purple/20 mx-auto mb-4">
              <Mic2 className="h-6 w-6 text-accent-purple" />
            </div>
            <h2 className="text-xl font-bold text-white">Launch Your Music Vault</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
              Prove track ownership via Audius OAuth, set a funding cap, and let fans invest in your music.
              Distribute royalty yield on-chain to build a loyal community of backers.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
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
          </div>
        </div>
      </section>
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
