/**
 * Language pack schema.
 *
 * A pack is a folder of JSON data files (see `src/packs/ko-en/`). Game code
 * only ever talks to the `LanguagePack` shape below, never to a specific
 * language, so adding a language means adding a folder and one registry line.
 */

/** Marker used inside gap sentences to show where the blank goes. */
export const GAP_MARKER = "___";

export type TextDirection = "ltr" | "rtl";

export interface LanguageInfo {
  /** Display name in the interface language, e.g. "Korean". */
  name: string;
  /** BCP-47 code, e.g. "ko". */
  code: string;
  /** Short label for the direction toggle, e.g. "한" or "EN". */
  label: string;
  dir: TextDirection;
  /**
   * CSS `word-break` for prompts in this language. Korean wants "keep-all"
   * (wrap at spaces); Japanese/Chinese want "normal". Defaults to "normal".
   */
  wordBreak?: "normal" | "keep-all" | "break-all";
}

export interface FontSpec {
  /** CSS font-family name, e.g. "Jua". */
  family: string;
  /** Google Fonts family name to load; omit if the font is local/system. */
  google?: string;
  /** Generic fallback, e.g. "sans-serif". */
  fallback: string;
}

export interface Credit {
  name: string;
  author: string;
  url: string;
  licence: string;
  /** How the source was used in this pack. */
  usage: string;
}

export interface PackMeta {
  id: string;
  /** Attribution for third-party data used in the pack. */
  credits?: Credit[];
  /** The language being learned. */
  target: LanguageInfo;
  /** The language the learner already knows. */
  base: LanguageInfo;
  fonts: {
    /** Big prompt text. Must be smooth and rounded, never pixelated. */
    prompt: FontSpec;
    /** Body text and the answer input. Must cover the target script. */
    body: FontSpec;
  };
}

export interface WordEntry {
  /** Main target-language form (shown as the prompt). */
  target: string;
  /** Other accepted target-language spellings, if any. */
  targetAlt?: string[];
  /** Accepted base-language answers; the first is the main one. */
  base: string[];
}

export interface GapEntry {
  /** Target-language sentence containing exactly one GAP_MARKER. */
  sentence: string;
  /** Base-language translation. */
  translation: string;
  answer: string;
  /** Answer options including the correct one. */
  options: string[];
}

export interface FeedbackPhrases {
  /** Shown on a right answer, e.g. "맞아요!". */
  correct: string;
  /** Shown on the stage-clear banner. */
  stageClear?: string;
  /** Shown on the game-over banner. */
  gameOver?: string;
}

export interface MatchingSettings {
  /** Unicode normalisation form applied before comparison. Default "NFC". */
  normalization?: "NFC" | "NFKC";
  /** Default true. */
  caseInsensitive?: boolean;
  /** Strip combining accents (é → e). Default false. */
  ignoreDiacritics?: boolean;
  /** Ignore punctuation characters. Default false. */
  ignorePunctuation?: boolean;
  /**
   * Leading words to ignore, keyed by BCP-47 code of the answer language,
   * e.g. { "en": ["a", "an", "the"] } so "a cat" matches "cat".
   */
  ignoreLeadingWords?: Record<string, string[]>;
}

export interface LanguagePack {
  meta: PackMeta;
  words: WordEntry[];
  gaps: GapEntry[];
  feedback: FeedbackPhrases;
  matching: MatchingSettings;
}
