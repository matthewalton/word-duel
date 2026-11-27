"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listenToRoom } from "@/lib/versusChannel";
import { keepSeat, readSeat } from "@/lib/versusSeat";
import { answerRound, joinRoom, leaveRoom, listenToken, requestRematch, roomState } from "@/server/versus";
import type { RoomError, RoomSnapshot, RoomView, Seat } from "./versus";

/** How often the room is asked for while the live connection is down. */
const POLL_MS = 2_000;
/** Least time between two catch-up asks (a round past its deadline, a late next round). */
const NUDGE_MS = 400;

export type VersusRoomState =
  | { status: "loading" }
  | { status: "error"; error: RoomError | "failed" }
  | { status: "ready"; seat: Seat; snapshot: RoomSnapshot };

/** One join per code per page load, so a remount (React's strict mode) doesn't take the seat twice. */
const joins = new Map<string, ReturnType<typeof joinRoom>>();

async function seatToken(code: string): Promise<{ token: string } | { error: RoomError }> {
  const held = readSeat(code);
  if (held) return { token: held };
  let join = joins.get(code);
  if (!join) {
    join = joinRoom(code);
    joins.set(code, join);
  }
  const result = await join;
  if (!result.ok) {
    joins.delete(code);
    return { error: result.error };
  }
  keepSeat(code, result.token);
  return { token: result.token };
}

/**
 * The browser's side of a versus room (ADR 0012): takes or retakes this tab's
 * seat, listens for the server's snapshots on Ably (present there, so the
 * server knows it is still here), and sends answers, rematch asks and
 * leaving. The newest snapshot wins; `now` is the server's clock as best this
 * tab knows it.
 */
export function useVersusRoom(code: string) {
  const [state, setState] = useState<VersusRoomState>({ status: "loading" });
  const tokenRef = useRef<string | null>(null);
  const seqRef = useRef(-1);
  const offsetRef = useRef(0);
  const seatRef = useRef<Seat | null>(null);
  const [live, setLive] = useState(false);

  const apply = useCallback((view: RoomView) => {
    if (!view.ok) {
      setState({ status: "error", error: view.error });
      return;
    }
    if (view.snapshot.seq < seqRef.current) return;
    seqRef.current = view.snapshot.seq;
    seatRef.current = view.seat;
    offsetRef.current = view.snapshot.serverNow - Date.now();
    setState({ status: "ready", seat: view.seat, snapshot: view.snapshot });
  }, []);

  const refresh = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      apply(await roomState(code, token));
    } catch {
      // Offline for a moment; the next ask catches up.
    }
  }, [code, apply]);

  // Take or retake the seat, then load the room.
  useEffect(() => {
    let current = true;
    seatToken(code)
      .then(async (seat) => {
        if (!current) return;
        if ("error" in seat) {
          setState({ status: "error", error: seat.error });
          return;
        }
        tokenRef.current = seat.token;
        const view = await roomState(code, seat.token);
        if (current) apply(view);
      })
      .catch(() => {
        if (current) setState({ status: "error", error: "failed" });
      });
    return () => {
      current = false;
    };
  }, [code, apply]);

  const lastNudge = useRef(0);
  /** Ask the server to catch up, e.g. a round's time is up. At most every NUDGE_MS. */
  const nudge = useCallback(() => {
    const t = Date.now();
    if (t - lastNudge.current < NUDGE_MS) return;
    lastNudge.current = t;
    refresh();
  }, [refresh]);

  // Listen, and be present, once seated.
  const seated = state.status === "ready";
  useEffect(() => {
    if (!seated) return;
    return listenToRoom(
      code,
      () => (tokenRef.current ? listenToken(code, tokenRef.current) : Promise.resolve(null)),
      {
        onSnapshot: (snapshot) => {
          if (seatRef.current) apply({ ok: true, seat: seatRef.current, snapshot });
        },
        // The other seat's presence went: the server decides whether that player has left.
        onLeave: () => {
          lastNudge.current = 0;
          nudge();
        },
        onOpen: setLive,
      },
    );
  }, [seated, code, apply, nudge]);

  // Without the live connection, ask the server instead.
  useEffect(() => {
    if (!seated || live) return;
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [seated, live, refresh]);

  const submit = useCallback(
    async (n: number, given: string) => {
      const token = tokenRef.current;
      if (!token) return;
      try {
        apply(await answerRound(code, token, n, given));
      } catch {
        refresh();
      }
    },
    [code, apply, refresh],
  );

  const rematch = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      apply(await requestRematch(code, token));
    } catch {
      refresh();
    }
  }, [code, apply, refresh]);

  /** Leaves the room for good (MENU): before the match is won, that loses it. */
  const leave = useCallback(() => {
    const token = tokenRef.current;
    if (token) leaveRoom(code, token).catch(() => {});
  }, [code]);

  const now = useCallback(() => Date.now() + offsetRef.current, []);

  return { state, now, submit, nudge, rematch, leave };
}
