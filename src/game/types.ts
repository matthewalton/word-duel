import type { ComponentType } from "react";
import type { LanguageInfo, LanguagePack, TextDirection } from "@/packs/types";
import type { MinigameId } from "./minigames/ids";

/** A piece of text plus the language attributes it must be rendered with. */
export interface LangText {
  text: string;
  lang: string;
  dir: TextDirection;
  wordBreak?: LanguageInfo["wordBreak"];
}

export function langText(info: LanguageInfo, text: string): LangText {
  return { text, lang: info.code, dir: info.dir, wordBreak: info.wordBreak };
}

/**
 * One prompt, produced by a minigame. Everything the shared board, hearts,
 * scoring and effects need is here, so they never know which minigame runs.
 */
export interface Round {
  /** The item this round tests; word history is kept per item id. */
  itemId: string;
  /** The prompt asked: the word's id in Word Strike, the gap's id in Gap Guard. */
  promptId: string;
  /** The item's tier, 1 to 3; a right answer is worth points times this (ADR 0009). */
  tier: number;
  promptKind: PromptKind;
  /** Short instruction for the round; Word Strike shows it as the input placeholder. */
  hint: string;
  prompt: LangText;
  /** For gap prompts: text before and after the blank. */
  gap?: { before: string; after: string };
  /** Translation line under the prompt. */
  translation?: LangText;
  /** Accepted answers (strict match via the pack's matching settings). */
  accepted: string[];
  /** Correct answer as shown after a miss. */
  reveal: LangText;
  /** Language the player answers in (sets `lang` on the input). */
  answerLang: { code: string; dir: TextDirection };
  /** For choice minigames. */
  options?: string[];
}

export type Direction = "toTarget" | "toBase";

/** How a prompt asks about its item: translate either way, or fill a gap. */
export type PromptKind = Direction | "gap";

/** Which tiers a duel draws from: Easy tier 1, Normal tiers 1–2, Hard every tier (ADR 0009). */
export type Difficulty = "easy" | "normal" | "hard";

export interface MinigameOptions {
  direction: Direction;
  difficulty: Difficulty;
}

/**
 * "idle" is the ready screen with START; "countdown" runs 3, 2, 1, GO.
 * "resolving" holds an outcome on screen, including the last miss before game over.
 */
export type Phase = "idle" | "countdown" | "playing" | "resolving" | "gameOver";

export type Side = "you" | "rival";
export type Reason = "correct" | "wrong" | "timeout";

export interface Outcome {
  /** Whose heart broke; null when none did (versus: nobody answered right). */
  loser: Side | null;
  reason: Reason;
  /** Points gained by this outcome (0 on a loss), excluding stage bonus. */
  points: number;
  stageCleared: boolean;
  /** A right answer to an item the account last missed (a comeback). */
  comeback: boolean;
  gameOver: boolean;
  /** What the player picked/typed, for choice highlighting. */
  given?: string;
}

/** One round played this duel, kept for the round log and the review list. */
export interface PlayedRound {
  round: Round;
  reason: Reason;
  /** What the player typed or picked; absent on a timeout. */
  given?: string;
  /** Time from the prompt showing to the answer; null on a timeout. */
  answerMs: number | null;
  /** When the round resolved, in ms since the duel's first prompt showed. */
  atMs: number;
  stage: number;
}

/** A round the player lost, shown in the review list at game over. */
export type Miss = PlayedRound & { reason: Exclude<Reason, "correct"> };

/** Props for a minigame's title-screen preview and how-to steps. */
export interface ShowcaseProps {
  pack: LanguagePack;
  opts: MinigameOptions;
}

export interface ControlsProps {
  pack: LanguagePack;
  round: Round;
  phase: Phase;
  outcome: Outcome | null;
  onSubmit: (answer: string) => void;
  onStart: () => void;
  /** Versus: this player answered wrong and is out of the round. */
  locked?: boolean;
}

/** A duel's draw order of rounds. */
export interface RoundDraw {
  /** Deals the next round. */
  next: () => Round;
  /** Works these missed items (ids) in early from now on; see `drawOrder`. */
  workIn: (missedItemIds: readonly string[]) => void;
}

/**
 * A minigame module. It only produces rounds and renders its own controls;
 * hearts, scoring, fuse and effects are shared and live in the duel engine.
 */
export interface Minigame {
  id: MinigameId;
  /** Whether the base/target direction toggle applies. */
  usesDirection: boolean;
  /** Whether the difficulty switch applies. */
  usesDifficulty: boolean;
  /** Whether the pack has anything for this minigame to ask; its card hides otherwise. */
  hasContent: (pack: LanguagePack) => boolean;
  /** Deterministic sample shown on the idle screen. */
  sampleRound: (pack: LanguagePack, opts: MinigameOptions) => Round;
  /**
   * Starts a duel's draw order. No prompt comes back until the whole pool has
   * been dealt; an account's missed items are worked in early (ADR 0010).
   */
  startDraw: (pack: LanguagePack, opts: MinigameOptions) => RoundDraw;
  /** The missed items (ids) this minigame can ask, any tier: a practice duel's pool. */
  practiceItems: (pack: LanguagePack, missedItemIds: readonly string[]) => string[];
  /**
   * Starts a practice duel's draw order: only these items (from
   * `practiceItems`), any tier, shuffled with no repeat until all are dealt.
   */
  startPracticeDraw: (pack: LanguagePack, opts: MinigameOptions, itemIds: readonly string[]) => RoundDraw;
  Controls: ComponentType<ControlsProps>;
  /** Static picture of a round, shown on its minigame card and the hub. */
  Preview: ComponentType<ShowcaseProps>;
  /** The three illustrated steps in the how-to panel. */
  HowTo: ComponentType<ShowcaseProps>;
}
