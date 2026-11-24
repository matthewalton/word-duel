/**
 * Language pack types, inferred from the schemas in `./schema.ts` (see there
 * for field docs).
 *
 * A pack is a folder of JSON data files (see `src/packs/ko-en/`). Game code
 * only ever talks to the `LanguagePack` shape below, never to a specific
 * language, so adding a language means adding a folder and one registry line.
 * Only types are imported from the schemas, so zod never reaches the browser.
 */
import type { z } from "zod";
import type {
  feedbackPhrasesSchema,
  gapPromptSchema,
  grammarItemSchema,
  languagePackSchema,
  matchingSettingsSchema,
  packMetaSchema,
  wordItemSchema,
} from "./schema";

/** Marker used inside gap sentences to show where the blank goes. */
export const GAP_MARKER = "___";

export type PackMeta = z.infer<typeof packMetaSchema>;
export type LanguageInfo = PackMeta["target"];
export type TextDirection = LanguageInfo["dir"];
export type FeedbackPhrases = z.infer<typeof feedbackPhrasesSchema>;
export type MatchingSettings = z.infer<typeof matchingSettingsSchema>;

/** Items: what the player learns. Word history is kept per item id. */
export type WordItem = z.infer<typeof wordItemSchema>;
export type GrammarItem = z.infer<typeof grammarItemSchema>;
export type Item = WordItem | GrammarItem;

/** Prompts: one way of asking about an item, named by `tests`. */
export type GapPrompt = z.infer<typeof gapPromptSchema>;

export type LanguagePack = z.infer<typeof languagePackSchema>;
