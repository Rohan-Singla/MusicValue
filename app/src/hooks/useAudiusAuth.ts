"use client";

import { useContext } from "react";
import { AudiusAuthContext } from "@/providers/AudiusAuthProvider";

export function useAudiusAuth() {
  const ctx = useContext(AudiusAuthContext);
  if (!ctx) {
    throw new Error("useAudiusAuth must be used inside AudiusAuthProvider");
  }
  return ctx;
}
