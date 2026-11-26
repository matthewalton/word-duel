import type { MatchingSettings } from "@/packs/types";

const PUNCTUATION = /[\p{P}\p{S}]/gu;
const COMBINING = /\p{M}/gu;

type WordLists = MatchingSettings["ignoreLeadingWords"];

/** The pack's list for `lang`, falling back from "en-GB" to "en". */
function listFor(lists: WordLists, lang: string): readonly string[] {
  return lists?.[lang] ?? lists?.[lang.split("-")[0]] ?? [];
}

/** Drops the first of `words` (longest first, so "to be" wins over "to") that starts `s`, if anything is left after it. */
function stripLeading(s: string, words: readonly string[], form: string, lang: string): string {
  const candidates = words
    .map((w) => w.normalize(form).toLocaleLowerCase(lang))
    .sort((a, b) => b.length - a.length);
  for (const w of candidates) {
    if (s.startsWith(w + " ") && s.length > w.length + 1) return s.slice(w.length + 1);
  }
  return s;
}

/**
 * Normalise one string according to the pack's matching settings.
 * `keepWordClassMarkers` keeps "to" in "to sleep", for grouping words by
 * prompt rather than checking an answer.
 */
export function normalizeAnswer(
  raw: string,
  settings: MatchingSettings,
  lang: string,
  { keepWordClassMarkers = false }: { keepWordClassMarkers?: boolean } = {},
): string {
  const form = settings.normalization ?? "NFC";
  let s = raw.normalize(form).trim();

  if (settings.ignoreDiacritics) {
    // Decompose, drop combining marks, recompose. Hangul jamo are letters,
    // not marks, so this is safe for Korean too.
    s = s.normalize("NFD").replace(COMBINING, "").normalize(form);
  }
  if (settings.ignorePunctuation) s = s.replace(PUNCTUATION, "");
  if (settings.caseInsensitive ?? true) s = s.toLocaleLowerCase(lang);

  s = s.replace(/\s+/g, " ").trim();

  if (!keepWordClassMarkers) s = stripLeading(s, listFor(settings.ignoreWordClassMarkers, lang), form, lang);
  return stripLeading(s, listFor(settings.ignoreLeadingWords, lang), form, lang);
}

/** Strict right/wrong check: no partial credit. */
export function isAcceptedAnswer(
  input: string,
  accepted: readonly string[],
  settings: MatchingSettings,
  lang: string,
): boolean {
  const given = normalizeAnswer(input, settings, lang);
  if (!given) return false;
  return accepted.some((a) => normalizeAnswer(a, settings, lang) === given);
}
