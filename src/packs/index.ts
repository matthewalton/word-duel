import type {
  FeedbackPhrases,
  GapPrompt,
  GrammarItem,
  LanguagePack,
  MatchingSettings,
  PackMeta,
  WordItem,
} from "./types";

import koEnMeta from "./ko-en/meta.json";
import koEnWords from "./ko-en/words.json";
import koEnGrammar from "./ko-en/grammar.json";
import koEnGaps from "./ko-en/gaps.json";
import koEnFeedback from "./ko-en/feedback.json";
import koEnMatching from "./ko-en/matching.json";
import esEnMeta from "./es-en/meta.json";
import esEnWords from "./es-en/words.json";
import esEnGrammar from "./es-en/grammar.json";
import esEnGaps from "./es-en/gaps.json";
import esEnFeedback from "./es-en/feedback.json";
import esEnMatching from "./es-en/matching.json";

/**
 * Pack registry: game code reads pack content only through here. To add a
 * language: create a folder with the same six JSON files and add one entry
 * here. Nothing else in the game needs to change. The JSON is cast, not
 * parsed: `pnpm check:packs` validates it against `./schema.ts` instead, so
 * zod stays out of the browser.
 */
const PACKS: Record<string, LanguagePack> = {
  "ko-en": {
    meta: koEnMeta as PackMeta,
    words: koEnWords as WordItem[],
    grammar: koEnGrammar as GrammarItem[],
    gaps: koEnGaps as GapPrompt[],
    feedback: koEnFeedback as FeedbackPhrases,
    matching: koEnMatching as MatchingSettings,
  },
  "es-en": {
    meta: esEnMeta as PackMeta,
    words: esEnWords as WordItem[],
    grammar: esEnGrammar as GrammarItem[],
    gaps: esEnGaps as GapPrompt[],
    feedback: esEnFeedback as FeedbackPhrases,
    matching: esEnMatching as MatchingSettings,
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

const askable = new WeakMap<LanguagePack, { words: WordItem[]; gaps: GapPrompt[] }>();

/** Entries a minigame may ask: retired items, and prompts testing them, are left out. */
function askableEntries(pack: LanguagePack) {
  let cached = askable.get(pack);
  if (!cached) {
    const retiredItems = new Set([...pack.words, ...pack.grammar].filter((i) => i.retired).map((i) => i.id));
    cached = {
      words: pack.words.filter((w) => !w.retired),
      gaps: pack.gaps.filter((g) => !g.retired && !retiredItems.has(g.tests)),
    };
    askable.set(pack, cached);
  }
  return cached;
}

export const askableWords = (pack: LanguagePack): WordItem[] => askableEntries(pack).words;

/** Askable words whose tier is at most `maxTier`. */
export const wordsUpToTier = (pack: LanguagePack, maxTier: number): WordItem[] =>
  askableWords(pack).filter((w) => w.tier <= maxTier);

/** An item's tier; items without one (grammar points) count as tier 1. */
export function itemTier(pack: LanguagePack, itemId: string): number {
  return pack.words.find((w) => w.id === itemId)?.tier ?? 1;
}
export const askableGaps = (pack: LanguagePack): GapPrompt[] => askableEntries(pack).gaps;

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
