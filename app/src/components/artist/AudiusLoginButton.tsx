"use client";

import { useState } from "react";
import { useAudiusAuth } from "@/hooks/useAudiusAuth";
import { Loader2, LogOut, Music, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface AudiusLoginButtonProps {
  className?: string;
  onSuccess?: () => void;
}

export function AudiusLoginButton({ className = "", onSuccess }: AudiusLoginButtonProps) {
  const { user, isLoading, login, logout } = useAudiusAuth();
  const [pending, setPending] = useState(false);

  const handleLogin = async () => {
    setPending(true);
    try {
      await login();
      toast.success("Connected to Audius!");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Audius login failed");
    } finally {
      setPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex h-10 items-center gap-2 rounded-xl border border-base-200 px-4 ${className}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-purple border-t-transparent" />
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2">
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="h-7 w-7 rounded-full object-cover ring-1 ring-green-500/30"
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-avatar.svg"; }}
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
              <Music className="h-3.5 w-3.5 text-green-400" />
            </div>
          )}
          <div className="leading-none">
            <p className="flex items-center gap-1 text-sm font-semibold text-white">
              <CheckCircle className="h-3 w-3 text-green-400" />
              {user.name}
            </p>
            <p className="text-[10px] text-slate-400">@{user.handle}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-xl border border-base-200 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-red-500/30 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={pending}
      className={`btn-primary flex items-center gap-2 ${className}`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
      {pending ? "Connecting..." : "Connect Audius"}
    </button>
  );
}
