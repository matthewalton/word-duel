/** Random index in [0, length), never equal to `avoid` when there is a choice. */
export function pickIndex(length: number, avoid: number | null): number {
  if (length <= 1) return 0;
  if (avoid === null || avoid < 0 || avoid >= length) return Math.floor(Math.random() * length);
  let i = Math.floor(Math.random() * (length - 1));
  if (i >= avoid) i += 1;
  return i;
}

/** Random entry, never the one with id `avoidId` when there is a choice. */
export function pickEntry<T extends { id: string }>(entries: readonly T[], avoidId: string | null): T {
  const avoid = avoidId === null ? null : entries.findIndex((e) => e.id === avoidId);
  return entries[pickIndex(entries.length, avoid)];
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
