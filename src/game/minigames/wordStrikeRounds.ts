/**
 * Word Strike's rounds: plain functions with no React, so the versus server
 * can deal and check the same rounds the solo minigame does.
 */
import { MAX_TIER } from "@/config/game";
import { fill, strings } from "@/i18n/strings";
import { normalizeAnswer } from "@/lib/matching";
import { drawOrder } from "@/lib/random";
import { askableWords, wordsUpToTier } from "@/packs";
import type { LanguagePack, WordItem } from "@/packs/types";
import { langText, type MinigameOptions, type Round, type RoundDraw } from "../types";

const unique = (items: string[]) => items.filter((x, i) => items.indexOf(x) === i);

/**
 * Groups words by the prompt text they show. Word-class markers are kept, so
 * the verb "to sleep" (자다) and the noun "sleep" (잠) are different prompts.
 */
const promptKey = (text: string, pack: LanguagePack, lang: string) =>
  normalizeAnswer(text, pack.matching, lang, { keepWordClassMarkers: true });

/**
 * Accepted answers are gathered across the whole pack, so homographs work:
 * 눈 accepts "eye" and "snow", and "teacher" accepts 선생님 and 선생.
 */
function acceptedTargets(pack: LanguagePack, prompt: string): string[] {
  const lang = pack.meta.base.code;
  const key = promptKey(prompt, pack, lang);
  return unique(
    askableWords(pack)
      .filter((w) => w.base.some((b) => promptKey(b, pack, lang) === key))
      .flatMap((w) => [w.target, ...(w.targetAlt ?? [])]),
  );
}

function acceptedBases(pack: LanguagePack, word: WordItem): string[] {
  const forms = [word.target, ...(word.targetAlt ?? [])];
  return unique(
    askableWords(pack)
      .filter((w) => forms.includes(w.target) || (w.targetAlt ?? []).some((a) => forms.includes(a)))
      .flatMap((w) => w.base),
  );
}

export function buildRound(pack: LanguagePack, opts: MinigameOptions, word: WordItem): Round {
  const { target, base } = pack.meta;
  // A Word Strike prompt is the word item itself, asked in one direction.
  const ids = { itemId: word.id, promptId: word.id, promptKind: opts.direction, tier: word.tier };
  if (opts.direction === "toTarget") {
    return {
      ...ids,
      hint: fill(strings.hintTypeIn, { language: target.name }),
      prompt: langText(base, word.base[0]),
      accepted: acceptedTargets(pack, word.base[0]),
      reveal: langText(target, word.target),
      answerLang: { code: target.code, dir: target.dir },
    };
  }
  return {
    ...ids,
    hint: fill(strings.hintTypeIn, { language: base.name }),
    prompt: langText(target, word.target),
    accepted: acceptedBases(pack, word),
    reveal: langText(base, word.base.slice(0, 3).join(" / ")),
    answerLang: { code: base.code, dir: base.dir },
  };
}

/**
 * The words in the difficulty's tiers, grouped by the prompt text they show in
 * this direction: "house" (집, 주택) or 눈 (eye, snow) is one card, asked once
 * per pass through the pool. Any word of the card's answers is accepted.
 */
export function promptCards(pack: LanguagePack, opts: MinigameOptions): WordItem[][] {
  const lang = opts.direction === "toTarget" ? pack.meta.base.code : pack.meta.target.code;
  const cards = new Map<string, WordItem[]>();
  for (const word of wordsUpToTier(pack, MAX_TIER[opts.difficulty])) {
    const text = opts.direction === "toTarget" ? word.base[0] : word.target;
    const key = promptKey(text, pack, lang);
    cards.set(key, [...(cards.get(key) ?? []), word]);
  }
  return [...cards.values()];
}

/**
 * Deals rounds from a shuffled draw order of prompt cards; each round records
 * against one of its card's words. A card counts as missed if any of its words is.
 */
export function startDraw(pack: LanguagePack, opts: MinigameOptions): RoundDraw {
  const draw = drawOrder(promptCards(pack, opts));
  return {
    next: () => {
      const card = draw.next();
      return buildRound(pack, opts, card[Math.floor(Math.random() * card.length)]);
    },
    workIn: (missedItemIds) => {
      const missed = new Set(missedItemIds);
      draw.workIn((card) => card.some((word) => missed.has(word.id)));
    },
  };
}
