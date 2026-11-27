"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { RULES } from "@/config/game";
import { duelReducer, initialDuel } from "./duel";
import type { Round } from "./types";
import { FUSE_SEGMENTS } from "./useDuel";
import { loserSide, type RoomSnapshot, type Seat, type VersusRound } from "./versus";

/** How often the controller catches the screen up with the server's clock. */
const FRAME_MS = 50;
/** Ask the server again if the next prompt hasn't come this long after its pause should have ended. */
const LATE_MS = 1_000;

/** A versus round as the duel reducer takes it; the answers stay empty until the round is decided. */
export function toRound(r: VersusRound): Round {
  return { ...r.round, accepted: r.result?.accepted ?? [], reveal: r.result?.reveal ?? r.round.prompt };
}

/**
 * Versus duel controller: replaces the solo fuse and CPU (`useDuel`) with the
 * server's snapshots, fed through the same reducer (ADR 0002, 0012). Each
 * frame it walks the reducer forward to where the server's rounds say the
 * duel is: countdown beats, prompts at their start times, outcomes as they
 * arrive, and game over once the last outcome has been on screen.
 */
export function useVersusDuel({
  snapshot,
  seat,
  now,
  submit,
  nudge,
}: {
  snapshot: RoomSnapshot;
  seat: Seat;
  now: () => number;
  submit: (n: number, given: string) => Promise<void>;
  nudge: () => void;
}) {
  const [state, dispatch] = useReducer(duelReducer, undefined, () =>
    initialDuel(toRound(snapshot.rounds[0]), true),
  );
  const [fuseLit, setFuseLit] = useState(FUSE_SEGMENTS);
  const [pending, setPending] = useState<number | null>(null);
  /** Rounds whose prompt has shown. */
  const [started, setStarted] = useState(0);

  const snapRef = useRef(snapshot);
  useEffect(() => {
    snapRef.current = snapshot;
  }, [snapshot]);

  // What the reducer has been told so far.
  const done = useRef({ countdown: false, count: RULES.countdownFrom as number, started: 0, resolved: 0, over: false, resolvedAt: 0 });

  useEffect(() => {
    const frame = () => {
      const s = snapRef.current;
      const d = done.current;
      const t = now();
      const first = s.rounds[0];
      if (!first) return;

      if (!d.countdown) {
        dispatch({ type: "countdown" });
        d.countdown = true;
      }
      if (d.started === 0) {
        const left = first.startsAt - t;
        const target =
          left > RULES.countdownGoMs
            ? Math.min(RULES.countdownFrom, Math.ceil((left - RULES.countdownGoMs) / RULES.countdownBeatMs))
            : 0;
        while (d.count > target) {
          dispatch({ type: "tick" });
          d.count -= 1;
        }
      }

      // Outcomes and prompts in order, as far as the server's clock has got.
      for (;;) {
        const current = s.rounds[d.started - 1];
        if (current?.result && d.resolved < d.started) {
          const { winner, reason } = current.result;
          dispatch({ type: "resolve", loser: loserSide(winner, seat), reason, at: performance.now() });
          d.resolved += 1;
          d.resolvedAt = performance.now();
          continue;
        }
        const next = s.rounds[d.started];
        if (next && t >= next.startsAt && d.resolved === d.started) {
          const action = { round: toRound(next), at: performance.now(), fuseMs: next.fuseMs };
          dispatch(d.started === 0 ? { type: "start", ...action } : { type: "next", ...action });
          d.started += 1;
          setStarted(d.started);
          setFuseLit(FUSE_SEGMENTS);
          continue;
        }
        break;
      }

      const current = s.rounds[d.started - 1];
      if (current && !current.result) {
        const left = (current.deadline - t) / current.fuseMs;
        setFuseLit(Math.max(0, Math.min(FUSE_SEGMENTS, Math.ceil(left * FUSE_SEGMENTS))));
        // Time's up: ask the server to end the round.
        if (left <= 0) nudge();
      } else if (current?.result && !s.winner && !s.rounds[d.started]) {
        // Decided, but no next prompt yet: it may have been missed.
        if (performance.now() - d.resolvedAt > RULES.revealMs + LATE_MS) nudge();
      }

      if (s.winner && !d.over && d.resolved === s.rounds.length && performance.now() - d.resolvedAt >= RULES.revealMs) {
        dispatch({ type: "gameOver" });
        d.over = true;
      }
    };
    frame();
    const id = window.setInterval(frame, FRAME_MS);
    return () => window.clearInterval(id);
  }, [now, nudge, seat]);

  /** The round on screen, as the server last described it. */
  const current = started > 0 ? (snapshot.rounds[started - 1] ?? null) : null;

  const onSubmit = useCallback(
    (given: string) => {
      const r = snapRef.current.rounds[done.current.started - 1];
      // Answers before the prompt shows or after it is decided aren't sent.
      if (!r || r.result) return;
      setPending(r.n);
      submit(r.n, given).finally(() => setPending(null));
    },
    [submit],
  );

  // Out of the round: answered wrong (or waiting to hear back on an answer).
  const locked =
    current != null && !current.result && (current.answered.includes(seat) || pending === current.n);

  return { state, fuseLit, current, locked, onSubmit };
}
