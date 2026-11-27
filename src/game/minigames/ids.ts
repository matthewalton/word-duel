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
