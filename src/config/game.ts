/** Display name of the game. Rename here. */
export const GAME_NAME = "Word Duel";

/** Language pack on a first visit, and whenever the remembered choice is missing or unknown (ADR 0011). */
export const DEFAULT_PACK_ID = "ko-en";

/** Browser storage key for the language picker's choice. */
export const PACK_STORAGE_KEY = "word-duel:pack";

/**
 * Browser storage keys for the other settings (ADR 0011): whether `/` skips
 * the language step, and the difficulty and direction quick PLAY uses.
 */
export const SETTING_KEYS = {
  rememberPack: "word-duel:remember-pack",
  difficulty: "word-duel:difficulty",
  direction: "word-duel:direction",
} as const;

/**
 * Set on <html> before the first paint while a pack other than the default is
 * stored, so the static page (rendered with the default pack) stays hidden
 * until the chosen pack has rendered instead of flashing the default one.
 */
export const PACK_PENDING_ATTR = "data-pack-pending";

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

/** Number of segments in the fuse bar (5% steps). */
export const FUSE_SEGMENTS = 20;

/** The fuse ticks once for each segment lost from this many left down to the last (a quarter of the fuse). */
export const FUSE_TICK_FROM = 5;

/** Versus rules (ADR 0012). Hearts and the fuse's start, step and floor are the solo ones. */
export const VERSUS = {
  /** Room code letters: consonants that can't be misread (no I, O, L, Y or vowels, so no words). */
  codeLetters: "BCDFGHJKMNPQRSTVWXZ",
  codeLength: 4,
  /** A room nobody has joined expires after this long. */
  waitMs: 30 * 60_000,
  /** A joined room's code stays taken for this long while a match is on. */
  matchMs: 3 * 60 * 60_000,
  /** A room closes this long after its last match ended, unless a rematch starts. */
  closeMs: 10 * 60_000,
  /** A rematch's first prompt shows this long after the countdown is dealt, so both browsers hear of it first. */
  rematchLeadMs: 800,
  /** The joined player card shows this long before the countdown starts. */
  getReadyMs: 1_200,
  /** How long a round's outcome stays on screen before the next prompt. */
  roundPauseMs: 1_800,
  /** Longest player name shown; longer names are cut. */
  maxNameLength: 24,
  /** Most rounds dealt in one room, far more than a duel can last. */
  maxRounds: 200,
  /** The versus record shows a win rate once this many matches are played, so one win doesn't read as 100%. */
  recordWinRateFrom: 5,
  /** Rival accounts shown in the versus record's head-to-head. */
  recordHeadToHead: 10,
  /** Recent matches shown in the versus record. */
  recordRecent: 10,
} as const;

/** The versus fuse: the solo start, 1 s shorter for every heart broken so far, down to the solo floor. */
export function versusFuse(heartsBroken: number): number {
  return Math.max(RULES.fuseMinMs, RULES.fuseStartMs - heartsBroken * RULES.fuseStepMs);
}

/** The countdown's length, 3, 2, 1 and GO. */
export const COUNTDOWN_MS = RULES.countdownFrom * RULES.countdownBeatMs + RULES.countdownGoMs;

/** Difficulties in switch order, and the highest item tier each draws (ADR 0009). */
export const DIFFICULTIES = ["easy", "normal", "hard"] as const;
export const DEFAULT_DIFFICULTY = "normal";
export const MAX_TIER = { easy: 1, normal: 2, hard: 3 } as const;

/** Missed items an account needs before it can start a practice duel. */
export const PRACTICE_MIN_MISSED = 5;

export function fuseForStage(stage: number): number {
  return Math.max(RULES.fuseMinMs, RULES.fuseStartMs - (stage - 1) * RULES.fuseStepMs);
}

/** The wordbook page. */
export const WORDBOOK = {
  /** Answers an item needs before it can show under BEST. */
  bestMinAnswers: 5,
  /** Most items listed under BEST. */
  bestLimit: 20,
  /** Most distinct wrong answers shown for one item. */
  wrongAnswersShown: 6,
  /** Newest rounds read for one item's details. */
  roundsRead: 2_000,
} as const;

/** Caps on a duel sent to word history; the server rejects anything larger. */
export const HISTORY_LIMITS = {
  maxRounds: 1_000,
  /** Longest answer kept; longer answers are cut before sending. */
  maxGivenLength: 200,
} as const;
