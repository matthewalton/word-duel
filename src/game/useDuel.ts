"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { RULES } from "@/config/game";
import { isAcceptedAnswer } from "@/lib/matching";
import { loadBest, saveBest } from "@/lib/storage";
import type { LanguagePack } from "@/packs/types";
import { duelReducer, initialDuel } from "./duel";
import type { Minigame, MinigameOptions } from "./types";

/** Number of segments in the fuse bar (5% steps). */
export const FUSE_SEGMENTS = 20;

/**
 * Solo duel controller: wires the pure reducer to timers, the CPU rival and
 * best-score storage. A versus controller would replace the fuse/CPU part
 * with server messages while reusing `duelReducer` and the same screen.
 */
export function useDuel(pack: LanguagePack, minigame: Minigame, opts: MinigameOptions) {
  // Opens on the ready screen; START runs the countdown, then the first round.
  const [state, dispatch] = useReducer(duelReducer, undefined, () =>
    initialDuel(minigame.sampleRound(pack, opts)),
  );
  const [fuseLit, setFuseLit] = useState(FUSE_SEGMENTS);

  const roundRef = useRef(state.round);
  useEffect(() => {
    roundRef.current = state.round;
  }, [state.round]);

  // Best score for this pack + minigame.
  useEffect(() => {
    dispatch({ type: "loadBest", best: loadBest(pack.meta.id, minigame.id) });
  }, [pack.meta.id, minigame.id]);

  useEffect(() => {
    if (state.phase === "gameOver" && state.newBest) {
      saveBest(pack.meta.id, minigame.id, state.score);
    }
  }, [state.phase, state.newBest, state.score, pack.meta.id, minigame.id]);

  const advance = useCallback(() => {
    setFuseLit(FUSE_SEGMENTS);
    dispatch({ type: "next", round: minigame.nextRound(pack, opts, roundRef.current) });
  }, [minigame, pack, opts]);

  // Fuse timer while a prompt is live.
  useEffect(() => {
    if (state.phase !== "playing") return;
    const total = state.fuseMs;
    const deadline = performance.now() + total;
    const id = window.setInterval(() => {
      const left = (deadline - performance.now()) / total;
      if (left <= 0) {
        window.clearInterval(id);
        setFuseLit(0);
        dispatch({ type: "resolve", loser: "you", reason: "timeout" });
      } else {
        setFuseLit(Math.ceil(left * FUSE_SEGMENTS));
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [state.phase, state.round, state.fuseMs]);

  // After an outcome: hold it on screen, then the next prompt or game over.
  const { phase, outcome, fxKey } = state;
  useEffect(() => {
    if (phase !== "resolving" || !outcome) return;
    const delay =
      outcome.reason !== "correct" ? RULES.revealMs : outcome.stageCleared ? RULES.stageClearMs : RULES.hitPauseMs;
    const t = window.setTimeout(() => {
      if (outcome.gameOver) dispatch({ type: "gameOver" });
      else advance();
    }, delay);
    return () => window.clearTimeout(t);
  }, [phase, outcome, fxKey, advance]);

  // Countdown: one beat per number, a shorter one on GO, then the first round.
  const { count } = state;
  useEffect(() => {
    if (phase !== "countdown") return;
    const t = window.setTimeout(
      () => {
        if (count > 0) {
          dispatch({ type: "tick" });
        } else {
          setFuseLit(FUSE_SEGMENTS);
          dispatch({ type: "start", round: minigame.nextRound(pack, opts, roundRef.current) });
        }
      },
      count > 0 ? RULES.countdownBeatMs : RULES.countdownGoMs,
    );
    return () => window.clearTimeout(t);
  }, [phase, count, minigame, pack, opts]);

  /** START on the ready screen, or play again after game over. */
  const start = useCallback(() => dispatch({ type: "countdown" }), []);

  const submit = useCallback(
    (answer: string) => {
      const round = roundRef.current;
      const correct = isAcceptedAnswer(answer, round.accepted, pack.matching, round.answerLang.code);
      dispatch({
        type: "resolve",
        loser: correct ? "rival" : "you",
        reason: correct ? "correct" : "wrong",
        given: answer,
      });
    },
    [pack.matching],
  );

  return { state, fuseLit, start, submit };
}
