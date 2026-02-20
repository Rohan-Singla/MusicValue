"use client";

import { Music } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-base-200/50 bg-base-50/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Music className="h-4 w-4" />
          <span>FanFi Music Vault</span>
          <span className="text-slate-700">|</span>
          <span>Built on Solana</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>Powered by</span>
          <span className="text-accent-purple">Audius</span>
          <span className="text-slate-700">+</span>
          <span className="text-accent-cyan">Torque</span>
        </div>
      </div>
    </footer>
  );
}
