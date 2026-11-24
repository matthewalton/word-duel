/** Display name of the game. Rename here. */
export const GAME_NAME = "Word Duel";

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
  /** How long the STAGE band is held after the right answer that clears a stage. */
  stageClearMs: 1_300,
  /** Countdown before the first round: 3, 2, 1, then GO. */
  countdownFrom: 3,
  countdownBeatMs: 700,
  countdownGoMs: 500,
} as const;

export function fuseForStage(stage: number): number {
  return Math.max(RULES.fuseMinMs, RULES.fuseStartMs - (stage - 1) * RULES.fuseStepMs);
}

/** Caps on a duel sent to word history; the server rejects anything larger. */
export const HISTORY_LIMITS = {
  maxRounds: 1_000,
  /** Longest answer kept; longer answers are cut before sending. */
  maxGivenLength: 200,
} as const;
