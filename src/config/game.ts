/** Display name of the game. Rename here. */
export const GAME_NAME = "Word Duel";

/** Stable key prefix for localStorage. Do not tie this to GAME_NAME. */
export const STORAGE_NAMESPACE = "word-duel";

/** Active language pack id. A language picker would replace this later. */
export const ACTIVE_PACK_ID = "ko-en";

/** Solo duel rules. */
export const RULES = {
  startHearts: 3,
  fuseStartMs: 10_000,
  fuseStepMs: 1_000,
  fuseMinMs: 4_000,
  pointsPerHit: 10,
  comboCap: 5,
  stageBonus: 50,
  /** How long the correct answer is shown after a miss or timeout. */
  revealMs: 1_500,
  /** Short pause after a right answer so the effects can play. */
  hitPauseMs: 650,
  stageBannerMs: 1_100,
  /** Countdown before the first round: 3, 2, 1, then GO. */
  countdownFrom: 3,
  countdownBeatMs: 700,
  countdownGoMs: 500,
} as const;

export function fuseForStage(stage: number): number {
  return Math.max(RULES.fuseMinMs, RULES.fuseStartMs - (stage - 1) * RULES.fuseStepMs);
}
