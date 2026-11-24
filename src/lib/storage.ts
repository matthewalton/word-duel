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

/** Every best score kept in this browser, for the guest merge. */
export function listGuestBests(): { packId: string; minigameId: string; score: number }[] {
  const prefix = `${STORAGE_NAMESPACE}:best:`;
  const out: { packId: string; minigameId: string; score: number }[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const [packId, minigameId] = key.slice(prefix.length).split(":");
      const score = packId && minigameId ? loadBest(packId, minigameId) : 0;
      if (score > 0) out.push({ packId, minigameId, score });
    }
  } catch {
    // Storage unavailable: nothing to merge.
  }
  return out;
}

/** Delete these guest best scores from this browser, once the account has them. */
export function clearGuestBests(entries: { packId: string; minigameId: string }[]): void {
  try {
    for (const e of entries) window.localStorage.removeItem(bestKey(e.packId, e.minigameId));
  } catch {
    // Storage unavailable: nothing was kept to delete.
  }
}
