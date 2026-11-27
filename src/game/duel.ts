/**
 * Pure duel state machine shared by every minigame.
 *
 * Outcomes are expressed as "whose heart broke" rather than "was the answer
 * right", so versus feeds in server-decided outcomes (the rival answered
 * first → loser: "you", nobody right → loser: null) through the same reducer
 * (ADR 0002, 0012).
 */
import { RULES, fuseForStage } from "@/config/game";
import type { Miss, Outcome, Phase, PlayedRound, Reason, Round, Side } from "./types";

export interface DuelState {
  /** Versus: no stages, scores, combos or comebacks, and the duel ends when either side runs out of hearts. */
  versus: boolean;
  phase: Phase;
  stage: number;
  score: number;
  combo: number;
  /** The account's best score; null for a guest, who has none (ADR 0008). */
  best: number | null;
  newBest: boolean;
  /** A practice duel: only missed items, and no best score is kept or shown. */
  practice: boolean;
  /**
   * Ids of items whose last outcome for this duel's prompt kind was a miss,
   * still open for a comeback this duel. Null for a guest, who gets none.
   */
  lastMissed: string[] | null;
  hearts: Record<Side, number>;
  maxHearts: number;
  fuseMs: number;
  round: Round;
  outcome: Outcome | null;
  /** Increments on every outcome; components key effects on it. */
  fxKey: number;
  /** Beats left in the countdown; 0 shows GO. */
  count: number;
  /** Every round played this duel, oldest first: the round log, and the review list's source. */
  rounds: PlayedRound[];
  /** Controller clock (ms) when the first prompt showed, and when the current one did. */
  startedAt: number;
  roundShownAt: number;
}

/**
 * Timed actions carry `at`, the controller's clock in ms (performance.now in
 * solo), so the reducer stays pure.
 */

export type DuelAction =
  | { type: "loadBest"; best: number | null }
  | { type: "loadLastMissed"; itemIds: string[] | null }
  | { type: "countdown" }
  | { type: "tick" }
  /** `fuseMs` is set by the versus server; solo takes it from the stage. */
  | { type: "start"; round: Round; at: number; fuseMs?: number }
  /** `loser` is null when no heart breaks (versus: nobody answered right). */
  | { type: "resolve"; loser: Side | null; reason: Reason; given?: string; at: number }
  | { type: "gameOver" }
  | { type: "next"; round: Round; at: number; fuseMs?: number };

/** The rounds the player lost, for the review list at game over. */
export function missesOf(rounds: PlayedRound[]): Miss[] {
  return rounds.filter((r): r is Miss => r.reason !== "correct");
}

/**
 * The items last missed once these rounds are played, oldest first: a miss
 * adds its item, a right answer takes it out. Lets play again carry on
 * without reloading word history.
 */
function afterRounds(lastMissed: string[], rounds: PlayedRound[]): string[] {
  const missed = new Set(lastMissed);
  for (const r of rounds) {
    if (r.reason === "correct") missed.delete(r.round.itemId);
    else missed.add(r.round.itemId);
  }
  return [...missed];
}

/** What kind of duel: a practice duel (only missed items, no best) or versus (ADR 0012); solo by default. */
export interface DuelKind {
  practice?: boolean;
  versus?: boolean;
}

export function initialDuel(sample: Round, { practice = false, versus = false }: DuelKind = {}): DuelState {
  return {
    versus,
    phase: "idle",
    stage: 1,
    score: 0,
    combo: 0,
    best: null,
    newBest: false,
    practice,
    lastMissed: null,
    hearts: { you: RULES.startHearts, rival: RULES.startHearts },
    maxHearts: RULES.startHearts,
    fuseMs: fuseForStage(1),
    round: sample,
    outcome: null,
    fxKey: 0,
    count: RULES.countdownFrom,
    rounds: [],
    startedAt: 0,
    roundShownAt: 0,
  };
}

export function duelReducer(state: DuelState, action: DuelAction): DuelState {
  switch (action.type) {
    case "loadBest":
      return { ...state, best: action.best };

    case "loadLastMissed":
      return { ...state, lastMissed: action.itemIds };

    // A fresh duel waits behind the countdown; the prompt stays hidden.
    case "countdown":
      if (state.phase !== "idle" && state.phase !== "gameOver") return state;
      return {
        ...initialDuel(state.round, state),
        best: state.best,
        lastMissed: state.lastMissed && afterRounds(state.lastMissed, state.rounds),
        phase: "countdown",
        fxKey: state.fxKey,
      };

    case "tick":
      if (state.phase !== "countdown" || state.count === 0) return state;
      return { ...state, count: state.count - 1 };

    case "start":
      if (state.phase !== "countdown") return state;
      return {
        ...initialDuel(action.round, state),
        best: state.best,
        lastMissed: state.lastMissed,
        phase: "playing",
        fxKey: state.fxKey,
        fuseMs: action.fuseMs ?? fuseForStage(1),
        startedAt: action.at,
        roundShownAt: action.at,
      };

    case "resolve": {
      if (state.phase !== "playing") return state;
      const { versus } = state;
      const hearts = { ...state.hearts };
      if (action.loser) hearts[action.loser] = Math.max(0, hearts[action.loser] - 1);

      let { score, combo } = state;
      let points = 0;
      if (versus) {
        // Versus keeps no score.
      } else if (action.loser === "rival") {
        combo += 1;
        points = RULES.pointsPerHit * state.round.tier * Math.min(combo, RULES.comboCap);
        score += points;
      } else {
        combo = 0;
      }

      // One comeback per item per duel.
      const comeback = !versus && action.loser === "rival" && !!state.lastMissed?.includes(state.round.itemId);
      const lastMissed = comeback ? state.lastMissed!.filter((id) => id !== state.round.itemId) : state.lastMissed;

      const stageCleared = !versus && hearts.rival === 0;
      if (stageCleared) score += RULES.stageBonus;
      const gameOver = hearts.you === 0 || (versus && hearts.rival === 0);
      const newBest = gameOver && !state.practice && state.best != null && score > state.best;
      const played: PlayedRound = {
        round: state.round,
        reason: action.reason,
        given: action.given,
        answerMs: action.reason === "timeout" ? null : Math.max(0, action.at - state.roundShownAt),
        atMs: Math.max(0, action.at - state.startedAt),
        stage: state.stage,
      };

      // Even the last miss is held on screen first, so the player sees the answer.
      return {
        ...state,
        phase: "resolving",
        rounds: [...state.rounds, played],
        hearts,
        score,
        combo,
        best: newBest ? score : state.best,
        newBest,
        lastMissed,
        outcome: {
          loser: action.loser,
          reason: action.reason,
          points,
          stageCleared,
          comeback,
          gameOver,
          given: action.given,
        },
        fxKey: state.fxKey + 1,
      };
    }

    case "gameOver":
      if (state.phase !== "resolving" || !state.outcome?.gameOver) return state;
      return { ...state, phase: "gameOver" };

    // A cleared stage takes effect with the next prompt, so the band can still
    // show the full stage bar.
    case "next": {
      if (state.phase !== "resolving" || state.outcome?.gameOver) return state;
      if (!state.outcome?.stageCleared) {
        return {
          ...state,
          phase: "playing",
          round: action.round,
          outcome: null,
          roundShownAt: action.at,
          fuseMs: action.fuseMs ?? state.fuseMs,
        };
      }
      const stage = state.stage + 1;
      return {
        ...state,
        phase: "playing",
        round: action.round,
        outcome: null,
        roundShownAt: action.at,
        stage,
        fuseMs: fuseForStage(stage),
        hearts: { ...state.hearts, rival: state.maxHearts },
      };
    }
  }
}
