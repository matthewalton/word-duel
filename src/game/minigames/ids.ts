import type { PromptKind } from "../types";

/**
 * Every minigame's id and the prompt kinds it may ask. Plain data, so the
 * server can check a duel without loading the minigames' components.
 */
export const MINIGAME_PROMPT_KINDS = {
  "word-strike": ["toTarget", "toBase"],
  "gap-guard": ["gap"],
} as const satisfies Record<string, readonly PromptKind[]>;

export type MinigameId = keyof typeof MINIGAME_PROMPT_KINDS;

/** Every minigame id, in registry order: what a versus room can run, Word Strike first as its default. */
export const MINIGAME_IDS = ["word-strike", "gap-guard"] as const satisfies readonly MinigameId[];
