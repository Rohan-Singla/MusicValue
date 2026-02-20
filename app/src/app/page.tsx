"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTrendingTracks, useSearchTracks } from "@/hooks/useAudius";
import { TrackGrid } from "@/components/track/TrackGrid";
import { Music, TrendingUp, Zap, Shield, ArrowRight } from "lucide-react";

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
          Back the music you love.
          <br />
          <span className="gradient-text">Earn while you listen.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
          Deposit USDC into music vaults, receive share tokens, and earn DeFi
          yield. Support artists from Audius while your funds work for you.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <a href="#trending" className="btn-primary inline-flex items-center gap-2">
            Explore Tracks
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="https://audius.co"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Music className="h-4 w-4" />
            Browse Audius
          </a>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-6">
          {[
            { label: "Total Backed", value: "$0", icon: TrendingUp },
            { label: "Active Vaults", value: "0", icon: Shield },
            { label: "Fan Backers", value: "0", icon: Music },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="mx-auto h-5 w-5 text-accent-purple" />
              <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const {
    data: trending,
    isLoading: trendingLoading,
  } = useTrendingTracks(10);

  const {
    data: searchResults,
    isLoading: searchLoading,
  } = useSearchTracks(searchQuery);

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
              title: "Find a Track",
              desc: "Browse trending tracks from Audius or search for your favorites",
              color: "purple",
            },
            {
              step: "02",
              title: "Back the Vault",
              desc: "Deposit USDC and receive share tokens representing your stake",
              color: "cyan",
            },
            {
              step: "03",
              title: "Earn Yield",
              desc: "Your funds generate DeFi yield while you support the music",
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

      {/* Tracks */}
      <section id="trending" className="pb-16 pt-4">
        {isSearching ? (
          <TrackGrid
            tracks={searchResults || []}
            title={`Results for "${searchQuery}"`}
            isLoading={searchLoading}
          />
        ) : (
          <TrackGrid
            tracks={trending || []}
            title="Trending on Audius"
            subtitle="Discover popular tracks and back your favorites"
            isLoading={trendingLoading}
          />
        )}
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
