/**
 * What a versus room deals and how its answers are judged (ADR 0012): plain
 * functions over the pack, shared by the server referee, the Versus area and
 * the tests. Relative imports keep it loadable by `node --test`.
 */
import { VERSUS } from "../config/game.ts";
import { isAcceptedAnswer } from "../lib/matching.ts";
import { drawOrder } from "../lib/random.ts";
import type { LanguagePack } from "../packs/types.ts";
import { buildGapRound, gapPool } from "./minigames/gapGuardRounds.ts";
import type { MinigameId } from "./minigames/ids.ts";
import { buildRound, promptCards } from "./minigames/wordStrikeRounds.ts";
import type { Difficulty, Direction, Round } from "./types.ts";

/** A room's settings, fixed when it is made. Direction applies to Word Strike only. */
export interface RoomSettings {
  minigame: MinigameId;
  direction: Direction;
  difficulty: Difficulty;
}

/** Whether a room with these settings has anything to deal. */
export function canDeal(pack: LanguagePack, settings: RoomSettings): boolean {
  switch (settings.minigame) {
    case "word-strike":
      return promptCards(pack, settings).length > 0;
    case "gap-guard":
      return gapPool(pack, settings.difficulty).length > 0;
    default: {
      const unhandled: never = settings.minigame;
      throw new Error(`Unknown minigame ${String(unhandled)}`);
    }
  }
}

/**
 * The prompt ids a match deals, in order: the minigame's shuffled draw within
 * the difficulty, as solo deals it. Word Strike deals one word of each prompt
 * card (its prompt is the word itself); Gap Guard deals gap sentences.
 */
export function dealDraw(pack: LanguagePack, settings: RoomSettings): string[] {
  const deal = (next: () => string) => Array.from({ length: VERSUS.maxRounds }, next);
  switch (settings.minigame) {
    case "word-strike": {
      const draw = drawOrder(promptCards(pack, settings));
      return deal(() => {
        const card = draw.next();
        return card[Math.floor(Math.random() * card.length)].id;
      });
    }
    case "gap-guard": {
      const draw = drawOrder(gapPool(pack, settings.difficulty));
      return deal(() => draw.next().id);
    }
    default: {
      const unhandled: never = settings.minigame;
      throw new Error(`Unknown minigame ${String(unhandled)}`);
    }
  }
}

/**
 * A dealt prompt as a round. Retired prompts still resolve (ADR 0007). A gap's
 * options are sorted by `rank`, which the server fixes per round, so both
 * players see them in the same order.
 */
export function roomRound(
  pack: LanguagePack,
  settings: RoomSettings,
  promptId: string,
  rank: (option: string) => string,
): Round {
  switch (settings.minigame) {
    case "word-strike": {
      const word = pack.words.find((w) => w.id === promptId);
      if (!word) throw new Error(`Unknown word ${promptId} in ${pack.meta.id}`);
      return buildRound(pack, settings, word);
    }
    case "gap-guard": {
      const gap = pack.gaps.find((g) => g.id === promptId);
      if (!gap) throw new Error(`Unknown gap ${promptId} in ${pack.meta.id}`);
      const keyed = gap.options.map((option) => ({ option, key: rank(option) }));
      keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      return buildGapRound(
        pack,
        gap,
        keyed.map((k) => k.option),
      );
    }
    default: {
      const unhandled: never = settings.minigame;
      throw new Error(`Unknown minigame ${String(unhandled)}`);
    }
  }
}

/** Whether an answer (typed, or a picked option) is right for the round, by the pack's matching settings. */
export const isRightAnswer = (pack: LanguagePack, round: Round, given: string): boolean =>
  isAcceptedAnswer(given, round.accepted, pack.matching, round.answerLang.code);
