import type { MatchingSettings } from "@/packs/types";

const PUNCTUATION = /[\p{P}\p{S}]/gu;
const COMBINING = /\p{M}/gu;

/** Normalise one string according to the pack's matching settings. */
export function normalizeAnswer(
  raw: string,
  settings: MatchingSettings,
  lang: string,
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

  const leading = settings.ignoreLeadingWords?.[lang] ?? settings.ignoreLeadingWords?.[lang.split("-")[0]];
  if (leading?.length) {
    for (const word of leading) {
      const w = word.normalize(form).toLocaleLowerCase(lang);
      if (s.startsWith(w + " ") && s.length > w.length + 1) {
        s = s.slice(w.length + 1);
        break;
      }
    }
  }
  return s;
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
