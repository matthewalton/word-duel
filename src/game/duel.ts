/**
 * Pure duel state machine shared by every minigame.
 *
 * Outcomes are expressed as "whose heart broke" rather than "was the answer
 * right", so a future versus mode can feed in server-decided outcomes
 * (the rival answered first → loser: "you") through the same reducer.
 */
import { RULES, fuseForStage } from "@/config/game";
import type { Outcome, Phase, Reason, Round, Side } from "./types";

export interface DuelState {
  phase: Phase;
  stage: number;
  score: number;
  combo: number;
  best: number;
  newBest: boolean;
  hearts: Record<Side, number>;
  maxHearts: number;
  fuseMs: number;
  round: Round;
  outcome: Outcome | null;
  /** Increments on every outcome; components key effects on it. */
  fxKey: number;
}

export type DuelAction =
  | { type: "loadBest"; best: number }
  | { type: "start"; round: Round }
  | { type: "resolve"; loser: Side; reason: Reason; given?: string }
  | { type: "stageBanner" }
  | { type: "next"; round: Round };

export function initialDuel(sample: Round): DuelState {
  return {
    phase: "idle",
    stage: 1,
    score: 0,
    combo: 0,
    best: 0,
    newBest: false,
    hearts: { you: RULES.startHearts, rival: RULES.startHearts },
    maxHearts: RULES.startHearts,
    fuseMs: fuseForStage(1),
    round: sample,
    outcome: null,
    fxKey: 0,
  };
}

export function duelReducer(state: DuelState, action: DuelAction): DuelState {
  switch (action.type) {
    case "loadBest":
      return { ...state, best: action.best };

    case "start":
      return {
        ...initialDuel(action.round),
        best: state.best,
        phase: "playing",
        fxKey: state.fxKey,
      };

    case "resolve": {
      if (state.phase !== "playing") return state;
      const hearts = { ...state.hearts };
      hearts[action.loser] = Math.max(0, hearts[action.loser] - 1);

      let { score, combo } = state;
      let points = 0;
      if (action.loser === "rival") {
        combo += 1;
        points = RULES.pointsPerHit * Math.min(combo, RULES.comboCap);
        score += points;
      } else {
        combo = 0;
      }

      const stageCleared = hearts.rival === 0;
      if (stageCleared) score += RULES.stageBonus;
      const gameOver = hearts.you === 0;
      const newBest = gameOver && score > state.best;

      return {
        ...state,
        phase: gameOver ? "gameOver" : "resolving",
        hearts,
        score,
        combo,
        best: newBest ? score : state.best,
        newBest,
        outcome: {
          loser: action.loser,
          reason: action.reason,
          points,
          stageCleared,
          gameOver,
          given: action.given,
        },
        fxKey: state.fxKey + 1,
      };
    }

    case "stageBanner": {
      const stage = state.stage + 1;
      return {
        ...state,
        phase: "stageClear",
        stage,
        fuseMs: fuseForStage(stage),
        hearts: { ...state.hearts, rival: state.maxHearts },
      };
    }

    case "next":
      if (state.phase === "gameOver" || state.phase === "idle") return state;
      return { ...state, phase: "playing", round: action.round, outcome: null };
  }
}
