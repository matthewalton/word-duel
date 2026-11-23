import type {
  FeedbackPhrases,
  GapEntry,
  LanguagePack,
  MatchingSettings,
  PackMeta,
  WordEntry,
} from "./types";

import koEnMeta from "./ko-en/meta.json";
import koEnWords from "./ko-en/words.json";
import koEnGaps from "./ko-en/gaps.json";
import koEnFeedback from "./ko-en/feedback.json";
import koEnMatching from "./ko-en/matching.json";

/**
 * Pack registry. To add a language: create a folder with the same five JSON
 * files and add one entry here. Nothing else in the game needs to change.
 */
const PACKS: Record<string, LanguagePack> = {
  "ko-en": {
    meta: koEnMeta as PackMeta,
    words: koEnWords as WordEntry[],
    gaps: koEnGaps as GapEntry[],
    feedback: koEnFeedback as FeedbackPhrases,
    matching: koEnMatching as MatchingSettings,
  },
};

export function listPacks(): PackMeta[] {
  return Object.values(PACKS).map((p) => p.meta);
}

export function getPack(id: string): LanguagePack {
  const pack = PACKS[id];
  if (!pack) throw new Error(`Unknown language pack: ${id}`);
  return pack;
}

/** Google Fonts stylesheet URL for the pack's font, or null if it is local. */
export function packFontsHref(pack: LanguagePack): string | null {
  const family = pack.meta.fonts.words.google;
  if (!family) return null;
  const query = `family=${encodeURIComponent(family).replace(/%20/g, "+")}`;
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

export function fontStack(spec: { family: string; fallback: string }): string {
  return `"${spec.family}", ${spec.fallback}`;
}
