import type { ComponentType } from "react";
import type { LanguageInfo, LanguagePack, TextDirection } from "@/packs/types";

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
  /** Unique per item (used for "never the same prompt twice in a row"). */
  id: string;
  itemIndex: number;
  /** Small uppercase hint above the prompt. */
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

export interface MinigameOptions {
  direction: Direction;
}

export type Phase = "idle" | "playing" | "resolving" | "stageClear" | "gameOver";

export type Side = "you" | "rival";
export type Reason = "correct" | "wrong" | "timeout";

export interface Outcome {
  /** Whose heart broke. */
  loser: Side;
  reason: Reason;
  /** Points gained by this outcome (0 on a loss), excluding stage bonus. */
  points: number;
  stageCleared: boolean;
  gameOver: boolean;
  /** What the player picked/typed, for choice highlighting. */
  given?: string;
}

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
}

/**
 * A minigame module. It only produces rounds and renders its own controls;
 * hearts, scoring, fuse and effects are shared and live in the duel engine.
 */
export interface Minigame {
  id: string;
  /** Whether the base/target direction toggle applies. */
  usesDirection: boolean;
  /** Deterministic sample shown on the idle screen. */
  sampleRound: (pack: LanguagePack, opts: MinigameOptions) => Round;
  nextRound: (pack: LanguagePack, opts: MinigameOptions, previous: Round | null) => Round;
  Controls: ComponentType<ControlsProps>;
  /** Static picture of a round, shown on the title screen. */
  Preview: ComponentType<ShowcaseProps>;
  /** The three illustrated steps in the how-to panel. */
  HowTo: ComponentType<ShowcaseProps>;
}
