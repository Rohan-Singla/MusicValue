"use client";

import { useLoyalty } from "@/hooks/useLoyalty";
import { Star } from "lucide-react";

export function PointsBadge() {
  const { points, tier, isConnected } = useLoyalty();

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-base-200 bg-base-50 px-3 py-1.5">
      <Star className="h-3.5 w-3.5" style={{ color: tier.color }} />
      <span className="text-xs font-medium text-slate-300">
        {points}
        <span className="ml-1 text-slate-500">pts</span>
      </span>
      <span
        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{
          color: tier.color,
          backgroundColor: `${tier.color}20`,
        }}
      >
        {tier.name}
      </span>
    </div>
  );
}
