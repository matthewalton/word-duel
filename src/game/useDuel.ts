"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { RULES } from "@/config/game";
import { isAcceptedAnswer } from "@/lib/matching";
import { newDuelId, sendDuel } from "@/lib/history";
import { loadLastMissed } from "@/server/history";
import { getBest, recordBest } from "@/lib/progress";
import type { LanguagePack } from "@/packs/types";
import { duelReducer, initialDuel } from "./duel";
import type { Minigame, MinigameOptions, Round } from "./types";

/** Number of segments in the fuse bar (5% steps). */
export const FUSE_SEGMENTS = 20;

/**
 * Solo duel controller: wires the pure reducer to timers, the CPU rival, best
 * scores and word history (accounts only). A versus controller would replace the fuse/CPU part
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
    dispatch({ type: "loadBest", best: getBest(pack.meta.id, minigame.id) });
  }, [pack.meta.id, minigame.id]);

  // Items last missed in this prompt kind, for comebacks (accounts only).
  // Play again carries the list on from the duel's rounds instead of reloading.
  const promptKind = minigame.usesDirection ? opts.direction : "gap";
  useEffect(() => {
    let live = true;
    loadLastMissed(pack.meta.id, promptKind)
      .then((itemIds) => {
        if (live) dispatch({ type: "loadLastMissed", itemIds });
      })
      .catch(() => {
        // Offline: no comebacks this time.
      });
    return () => {
      live = false;
    };
  }, [pack.meta.id, promptKind]);

  useEffect(() => {
    if (state.phase === "gameOver" && state.newBest) {
      recordBest(pack.meta.id, minigame.id, state.score);
    }
  }, [state.phase, state.newBest, state.score, pack.meta.id, minigame.id]);

  // Word history: each duel is sent once, at game over or when the player
  // leaves it (ADR 0008). The id is set when the first prompt shows and
  // cleared once sent.
  const duelIdRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const send = useCallback(() => {
    const id = duelIdRef.current;
    if (!id) return;
    duelIdRef.current = null;
    sendDuel(
      id,
      { packId: pack.meta.id, minigameId: minigame.id, direction: minigame.usesDirection ? opts.direction : null },
      stateRef.current,
      performance.now(),
    );
  }, [pack.meta.id, minigame, opts.direction]);
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    if (state.phase === "gameOver") send();
  }, [state.phase, send]);

  // Leaving mid-duel (MENU) unmounts the duel; a closed tab loses it.
  useEffect(() => {
    const current = sendRef;
    return () => current.current();
  }, []);

  // The duel's draw order; each duel, play again included, starts a fresh shuffle.
  const drawRef = useRef<(() => Round) | null>(null);

  const advance = useCallback(() => {
    setFuseLit(FUSE_SEGMENTS);
    drawRef.current ??= minigame.startDraw(pack, opts);
    dispatch({ type: "next", round: drawRef.current(), at: performance.now() });
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
        dispatch({ type: "resolve", loser: "you", reason: "timeout", at: performance.now() });
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
          duelIdRef.current = newDuelId();
          drawRef.current = minigame.startDraw(pack, opts);
          dispatch({ type: "start", round: drawRef.current(), at: performance.now() });
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
        at: performance.now(),
      });
    },
    [pack.matching],
  );

  return { state, fuseLit, start, submit };
}
