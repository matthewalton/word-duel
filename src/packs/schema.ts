/**
 * Language pack schemas (ADR 0007). The TypeScript types in `./types.ts` are
 * inferred from these, and `pnpm check:packs` validates every pack with them.
 *
 * Pack content is **items** (what is learned: words, grammar points) and
 * **prompts** (one way of asking about an item: a gap sentence). Every entry
 * shares an envelope (`id`, `kind`, and `tests` on prompts) with a payload
 * per kind. Ids are unique within the pack and never reused or changed; to
 * drop an entry, set `retired: true` instead of deleting it.
 *
 * Objects are strict, so an unknown or misspelt field fails the check.
 */
import { z } from "zod";
import { GAP_MARKER } from "./types.ts";

const text = z.string().trim().min(1);

/** Stable id: no spaces, unique within the pack, never reused. */
const entryId = z.string().regex(/^\S+$/, "ids may not contain spaces");

const envelope = {
  id: entryId,
  /** Retired entries stay in the file so their id is never reused, but are never asked. */
  retired: z.boolean().optional(),
};

export const wordItemSchema = z.strictObject({
  ...envelope,
  kind: z.literal("word"),
  /** Main target-language form (shown as the prompt). */
  target: text,
  /** Other accepted target-language spellings, if any. */
  targetAlt: z.array(text).min(1).optional(),
  /** Accepted base-language answers; the first is the main one. */
  base: z.array(text).min(1),
  /** How hard the word is, 1 (easiest) to 3 (ADR 0009). Difficulty picks which tiers a duel draws. */
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

/** A grammar point that isn't a word, e.g. the object particle 을/를. */
export const grammarItemSchema = z.strictObject({
  ...envelope,
  kind: z.literal("grammar"),
  /** Target-language forms as shown to the player, e.g. "을/를". */
  target: text,
  /** Short base-language description, e.g. "object particle". */
  base: text,
});

export const gapPromptSchema = z.strictObject({
  ...envelope,
  kind: z.literal("gap"),
  /** Id of the one item this prompt tests. */
  tests: entryId,
  /** Target-language sentence containing exactly one GAP_MARKER. */
  sentence: text.refine((s) => s.split(GAP_MARKER).length === 2, {
    message: `must contain exactly one ${GAP_MARKER}`,
  }),
  /** Base-language translation. */
  translation: text,
  answer: text,
  /** Exactly three answer options including the correct one (the 1, 2, 3 keys and the how-to assume three). */
  options: z.array(text).length(3),
})
  .refine((g) => g.options.includes(g.answer), {
    message: "answer must be one of the options",
    path: ["answer"],
  })
  .refine((g) => new Set(g.options).size === g.options.length, {
    message: "options must be different",
    path: ["options"],
  });

const languageInfoSchema = z.strictObject({
  /** Display name in the interface language, e.g. "Korean". */
  name: text,
  /** The language's name for itself, e.g. "한국어". Shown on the direction toggle. */
  nativeName: text,
  /** BCP-47 code, e.g. "ko". */
  code: text,
  dir: z.enum(["ltr", "rtl"]),
  /**
   * CSS `word-break` for prompts in this language. Korean wants "keep-all"
   * (wrap at spaces); Japanese/Chinese want "normal". Defaults to "normal".
   */
  wordBreak: z.enum(["normal", "keep-all", "break-all"]).optional(),
});

const fontSpecSchema = z.strictObject({
  /** CSS font-family name, e.g. "Jua". */
  family: text,
  /** Google Fonts family name to load; omit if the font is local/system. */
  google: text.optional(),
  /** Generic fallback, e.g. "sans-serif". */
  fallback: text,
});

const creditSchema = z.strictObject({
  name: text,
  author: text,
  url: z.url(),
  licence: text,
  /** How the source was used in this pack. */
  usage: text,
});

export const packMetaSchema = z.strictObject({
  id: text,
  /** Attribution for third-party data used in the pack. */
  credits: z.array(creditSchema).optional(),
  /** The language being learned. */
  target: languageInfoSchema,
  /** The language the learner already knows. */
  base: languageInfoSchema,
  fonts: z.strictObject({
    /**
     * Every target- and base-language word: prompts, answers, choices and
     * language names. Smooth and rounded, never pixelated, and covering both
     * scripts. Interface text uses the pixel font instead.
     */
    words: fontSpecSchema,
  }),
});

export const feedbackPhrasesSchema = z.strictObject({
  /** Shown on a right answer, e.g. "맞아요!". */
  correct: text,
  /** Shown on the comeback band, when an item last missed is answered right. */
  comeback: text.optional(),
  /** Shown on the stage-clear banner. */
  stageClear: text.optional(),
  /** Shown on the game-over banner. */
  gameOver: text.optional(),
});

export const matchingSettingsSchema = z.strictObject({
  /** Unicode normalisation form applied before comparison. Default "NFC". */
  normalization: z.enum(["NFC", "NFKC"]).optional(),
  /** Default true. */
  caseInsensitive: z.boolean().optional(),
  /** Strip combining accents (é → e). Default false. */
  ignoreDiacritics: z.boolean().optional(),
  /** Ignore punctuation characters. Default false. */
  ignorePunctuation: z.boolean().optional(),
  /**
   * Leading words to ignore, keyed by BCP-47 code of the answer language,
   * e.g. { "en": ["a", "an", "the"] } so "a cat" matches "cat".
   */
  ignoreLeadingWords: z.record(z.string(), z.array(text)).optional(),
});

/** One pack's files, as the registry and the check script see them. */
export const languagePackSchema = z.strictObject({
  meta: packMetaSchema,
  words: z.array(wordItemSchema),
  grammar: z.array(grammarItemSchema),
  gaps: z.array(gapPromptSchema),
  feedback: feedbackPhrasesSchema,
  matching: matchingSettingsSchema,
});
