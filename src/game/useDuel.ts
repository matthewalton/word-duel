"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { RULES } from "@/config/game";
import { isAcceptedAnswer } from "@/lib/matching";
import { promptKindOf } from "@/game/minigames";
import { loadMissed, newDuelId, sendDuel } from "@/lib/history";
import { getBest, recordBest } from "@/lib/progress";
import type { LanguagePack } from "@/packs/types";
import { duelReducer, initialDuel } from "./duel";
import type { Minigame, MinigameOptions, RoundDraw } from "./types";

/** Number of segments in the fuse bar (5% steps). */
export const FUSE_SEGMENTS = 20;

/**
 * Solo duel controller: wires the pure reducer to timers, the CPU rival, best
 * scores and word history (accounts only). A versus controller would replace the fuse/CPU part
 * with server messages while reusing `duelReducer` and the same screen.
 *
 * A practice duel (accounts only) deals only the missed items, any tier, and
 * keeps no best score; its rounds still go into word history.
 */
export function useDuel(pack: LanguagePack, minigame: Minigame, opts: MinigameOptions, practice = false) {
  // Opens on the ready screen; START runs the countdown, then the first round.
  const [state, dispatch] = useReducer(duelReducer, undefined, () =>
    initialDuel(minigame.sampleRound(pack, opts), { practice }),
  );
  const [fuseLit, setFuseLit] = useState(FUSE_SEGMENTS);

  const roundRef = useRef(state.round);
  useEffect(() => {
    roundRef.current = state.round;
  }, [state.round]);

  // Best score for this pack + minigame; a practice duel has none.
  useEffect(() => {
    dispatch({ type: "loadBest", best: practice ? null : getBest(pack.meta.id, minigame.id) });
  }, [pack.meta.id, minigame.id, practice]);

  // The duel's draw order; each duel, play again included, starts a fresh one.
  const drawRef = useRef<RoundDraw | null>(null);
  // The missed list as loaded, until the reducer's copy is in state.
  const loadedMissedRef = useRef<string[] | null>(null);

  // Items last missed in this prompt kind, for comebacks and the draw order
  // (accounts only). Play again carries the list on from the duel's rounds
  // instead of reloading. If it arrives after the first round, the draw
  // works the missed items in from then on.
  const promptKind = promptKindOf(minigame, opts.direction);
  useEffect(() => {
    let live = true;
    loadMissed(pack.meta.id, promptKind)
      .then((itemIds) => {
        if (!live) return;
        loadedMissedRef.current = itemIds;
        if (itemIds?.length) drawRef.current?.workIn(itemIds);
        dispatch({ type: "loadLastMissed", itemIds });
      })
      .catch(() => {
        // Offline: no comebacks this time.
      });
    return () => {
      live = false;
    };
  }, [pack.meta.id, promptKind]);

  useEffect(() => {
    if (state.phase === "gameOver" && state.newBest && !practice) {
      recordBest(pack.meta.id, minigame.id, state.score);
    }
  }, [state.phase, state.newBest, state.score, pack.meta.id, minigame.id, practice]);

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

  /**
   * A fresh draw order for a new duel, with the missed items fixed as the duel
   * starts. A practice duel deals only those; should none have loaded, it
   * falls back to the usual draw rather than having nothing to ask.
   */
  const startDraw = useCallback(() => {
    const missed = stateRef.current.lastMissed ?? loadedMissedRef.current;
    const practiceItems = practice && missed ? minigame.practiceItems(pack, missed) : [];
    if (practiceItems.length) return minigame.startPracticeDraw(pack, opts, practiceItems);
    const draw = minigame.startDraw(pack, opts);
    if (missed?.length) draw.workIn(missed);
    return draw;
  }, [minigame, pack, opts, practice]);

  const advance = useCallback(() => {
    setFuseLit(FUSE_SEGMENTS);
    drawRef.current ??= startDraw();
    dispatch({ type: "next", round: drawRef.current.next(), at: performance.now() });
  }, [startDraw]);

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
          drawRef.current = startDraw();
          dispatch({ type: "start", round: drawRef.current.next(), at: performance.now() });
        }
      },
      count > 0 ? RULES.countdownBeatMs : RULES.countdownGoMs,
    );
    return () => window.clearTimeout(t);
  }, [phase, count, startDraw]);

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
