/**
 * Gap Guard's rounds: plain functions with no React, so the versus server can
 * deal and check the same rounds the solo minigame does. Relative imports
 * keep it loadable by `node --test`.
 */
import { MAX_TIER } from "../../config/game.ts";
import { strings } from "../../i18n/strings.ts";
import { gapsUpToTier, itemTier } from "../../packs/index.ts";
import { GAP_MARKER, type GapPrompt, type LanguagePack } from "../../packs/types.ts";
import { langText, type Difficulty, type Round } from "../types.ts";

/** A gap sentence as a round, with its options shown in the order given. */
export function buildGapRound(pack: LanguagePack, gap: GapPrompt, options: readonly string[]): Round {
  const { target, base } = pack.meta;
  const [before, after = ""] = gap.sentence.split(GAP_MARKER);
  return {
    itemId: gap.tests,
    promptId: gap.id,
    promptKind: "gap",
    tier: itemTier(pack, gap.tests),
    hint: strings.hintFillGap,
    prompt: langText(target, gap.sentence),
    gap: { before, after },
    translation: langText(base, gap.translation),
    accepted: [gap.answer],
    reveal: langText(target, gap.answer),
    answerLang: { code: target.code, dir: target.dir },
    options: options.slice(),
  };
}

/** The askable gap sentences whose tested item is within the difficulty. */
export const gapPool = (pack: LanguagePack, difficulty: Difficulty): GapPrompt[] =>
  gapsUpToTier(pack, MAX_TIER[difficulty]);
