"use client";

import { useSyncExternalStore } from "react";
import { getBest, subscribeProgress } from "./progress";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  const unsubscribe = subscribeProgress(onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    unsubscribe();
  };
}

/**
 * Best scores for several minigames of one pack, read from the guest or account store without a
 * hydration mismatch (the server snapshot is all zeros).
 */
export function useBestScores(packId: string, minigameIds: string[]): Record<string, number> {
  const key = useSyncExternalStore(
    subscribe,
    () => minigameIds.map((id) => getBest(packId, id)).join(","),
    () => minigameIds.map(() => 0).join(","),
  );
  const values = key.split(",").map(Number);
  return Object.fromEntries(minigameIds.map((id, i) => [id, values[i] ?? 0]));
}
