import { STORAGE_NAMESPACE } from "@/config/game";

function bestKey(packId: string, minigameId: string) {
  return `${STORAGE_NAMESPACE}:best:${packId}:${minigameId}`;
}

export function loadBest(packId: string, minigameId: string): number {
  try {
    const raw = window.localStorage.getItem(bestKey(packId, minigameId));
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBest(packId: string, minigameId: string, score: number): void {
  try {
    window.localStorage.setItem(bestKey(packId, minigameId), String(score));
  } catch {
    // Storage unavailable (private mode, blocked): best score just won't persist.
  }
}
