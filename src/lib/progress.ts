"use client";

import { saveAccountBest } from "@/server/progress";

/**
 * Best scores, for accounts only (ADR 0008). A guest has none: nothing is
 * tracked, in the browser or in memory. The account's scores are held here
 * once loaded, and new bests are written to the server.
 */
let account: { packId: string; bests: Record<string, number> } | null = null;
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

/** Signed out or a guest: no best scores. */
export function setGuestProgress() {
  if (!account) return;
  account = null;
  notify();
}

export function setAccountProgress(packId: string, bests: Record<string, number>) {
  account = { packId, bests };
  notify();
}

/** The account's best score, or null for a guest (no best score is tracked). */
export function getBest(packId: string, minigameId: string): number | null {
  if (!account || account.packId !== packId) return null;
  return account.bests[minigameId] ?? 0;
}

export function recordBest(packId: string, minigameId: string, score: number) {
  if (!account) return;
  if (account.packId === packId)
    account = { ...account, bests: { ...account.bests, [minigameId]: Math.max(score, account.bests[minigameId] ?? 0) } };
  saveAccountBest({ packId, minigameId, score }).catch(() => {
    // Offline or signed out elsewhere: the score shows this session only.
  });
  notify();
}

/** Whether a signed-in account's progress is loaded; false for a guest. */
export function hasAccount(): boolean {
  return account != null;
}
