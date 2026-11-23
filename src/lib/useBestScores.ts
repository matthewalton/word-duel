"use client";

import { useSyncExternalStore } from "react";
import { loadBest } from "./storage";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Best scores for several minigames of one pack, read from storage without a
 * hydration mismatch (the server snapshot is all zeros).
 */
export function useBestScores(packId: string, minigameIds: string[]): Record<string, number> {
  const key = useSyncExternalStore(
    subscribe,
    () => minigameIds.map((id) => loadBest(packId, id)).join(","),
    () => minigameIds.map(() => 0).join(","),
  );
  const values = key.split(",").map(Number);
  return Object.fromEntries(minigameIds.map((id, i) => [id, values[i] ?? 0]));
}
