"use client";

import { useSyncExternalStore } from "react";
import { getBest, subscribeProgress } from "./progress";

const GUEST = "guest";

/**
 * The account's best scores for several minigames of one pack, or null for a
 * guest, who has none. The server snapshot is a guest, so nothing mismatches
 * on hydration.
 */
export function useBestScores(packId: string, minigameIds: string[]): Record<string, number> | null {
  const key = useSyncExternalStore(
    subscribeProgress,
    () => {
      const values = minigameIds.map((id) => getBest(packId, id));
      return values.some((v) => v == null) ? GUEST : values.join(",");
    },
    () => GUEST,
  );
  if (key === GUEST) return null;
  const values = key.split(",").map(Number);
  return Object.fromEntries(minigameIds.map((id, i) => [id, values[i] ?? 0]));
}
