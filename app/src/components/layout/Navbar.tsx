"use client";

import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { PointsBadge } from "@/components/loyalty/PointsBadge";
import { Music, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-base-200/50 bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
            <Music className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">
            <span className="gradient-text">FanFi</span>
            <span className="ml-1 text-slate-400 font-normal">Vault</span>
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks..."
              className="h-9 w-64 rounded-xl border border-base-200 bg-base-50 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-accent-purple/50"
            />
          </div>
        </form>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <PointsBadge />
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
