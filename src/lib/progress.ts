"use client";

import { saveAccountBest } from "@/server/progress";
import { loadBest, saveBest } from "./storage";

/**
 * Where best scores are read from and written to: this browser's storage for
 * a guest, the account while signed in (ADR 0006). The account's scores are
 * held here after the guest merge; writes also go to the server.
 */
type Mode = { kind: "guest" } | { kind: "account"; packId: string; bests: Record<string, number> };

let mode: Mode = { kind: "guest" };
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function subscribeProgress(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function setGuestProgress() {
  if (mode.kind === "guest") return;
  mode = { kind: "guest" };
  notify();
}

export function setAccountProgress(packId: string, bests: Record<string, number>) {
  mode = { kind: "account", packId, bests };
  notify();
}

export function getBest(packId: string, minigameId: string): number {
  if (mode.kind === "account" && mode.packId === packId) return mode.bests[minigameId] ?? 0;
  return loadBest(packId, minigameId);
}

export function recordBest(packId: string, minigameId: string, score: number) {
  if (mode.kind === "account" && mode.packId === packId) {
    mode = { ...mode, bests: { ...mode.bests, [minigameId]: Math.max(score, mode.bests[minigameId] ?? 0) } };
    saveAccountBest({ packId, minigameId, score }).catch(() => {
      // Offline or signed out elsewhere: the score shows this session only.
    });
  } else {
    saveBest(packId, minigameId, score);
  }
  notify();
}
