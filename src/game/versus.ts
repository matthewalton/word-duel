/**
 * Versus: what the server tells both browsers about a room (ADR 0012). Plain
 * data and pure helpers, shared by the server and the browser.
 */
import { VERSUS } from "../config/game.ts";
import type { MinigameId } from "./minigames/ids";
import type { Difficulty, Direction, LangText, Reason, Round, Side } from "./types";

/** PLAYER 1 made the room; PLAYER 2 joined it. */
export type Seat = "p1" | "p2";

export const otherSeat = (seat: Seat): Seat => (seat === "p1" ? "p2" : "p1");

/** A round as the browser may see it: the accepted answers only arrive with its result. */
export interface VersusRound {
  n: number;
  /** The prompt, without `accepted` and `reveal` until the round is decided. */
  round: Omit<Round, "accepted" | "reveal">;
  fuseMs: number;
  /** Server clock, ms since the epoch. */
  startsAt: number;
  deadline: number;
  /** Seats that have answered (wrong, while the round is open). */
  answered: Seat[];
  result: null | {
    /** Whose right answer arrived first; null when nobody's did. */
    winner: Seat | null;
    /** correct: someone won; wrong: both answered wrong; timeout: nobody right in time. */
    reason: Reason;
    accepted: string[];
    reveal: LangText;
  };
}

export interface RoomSnapshot {
  code: string;
  packId: string;
  /** Every match in the room plays this minigame. */
  minigame: MinigameId;
  /** Word Strike only. */
  direction: Direction;
  difficulty: Difficulty;
  /** An account's name, or null for a guest. PLAYER 2 is absent until someone joins. */
  players: { p1: { name: string | null }; p2: { name: string | null } | null };
  /** Every round dealt so far, oldest first; the newest may not have started yet. */
  rounds: VersusRound[];
  hearts: Record<Seat, number>;
  /** Set once a player's last heart breaks, or the other player leaves mid-match. */
  winner: Seat | null;
  /** The seat that lost the match by leaving or dropping before it was won, if any. */
  forfeit: Seat | null;
  /** Counts the room's matches, from 1; a rematch adds one. */
  match: number;
  /** Who has pressed REMATCH since the match ended. */
  rematch: Seat[];
  /** Who has left the room. */
  left: Seat[];
  /** Grows with every change, so a browser can drop a snapshot older than the one it has. */
  seq: number;
  /** The server's clock when this snapshot was made. */
  serverNow: number;
}

/** Why a room can't be opened. `left`: this seat left (or dropped out of) the room. */
export type RoomError = "missing" | "full" | "left";

/** A seat's view of a room. */
export type RoomView = { ok: true; seat: Seat; snapshot: RoomSnapshot } | { ok: false; error: RoomError };

/**
 * The Ably channel a room's snapshots go out on. Local dev shares prod's Ably key, so in
 * development the channel is `versus:dev-<code>` (still inside the key's `versus:*`) and a dev
 * room never hears a prod room with the same code.
 */
export const roomChannel = (code: string, nodeEnv = process.env.NODE_ENV) =>
  nodeEnv === "development" ? `versus:dev-${code}` : `versus:${code}`;

/** The Ably client id a seat's browser listens and is present as. */
export const seatClientId = (code: string, seat: Seat) => `${roomChannel(code)}:${seat}`;

/** Upper-cases a typed code and drops anything that can't be in one. */
export function cleanCode(raw: string): string {
  return [...raw.toUpperCase()]
    .filter((c) => VERSUS.codeLetters.includes(c))
    .join("")
    .slice(0, VERSUS.codeLength);
}

export const isRoomCode = (code: string) => code.length === VERSUS.codeLength && cleanCode(code) === code;

/** Whose heart a round's winner broke, from this seat's side (ADR 0002); null if nobody won. */
export function loserSide(winner: Seat | null, me: Seat): Side | null {
  if (!winner) return null;
  return winner === me ? "rival" : "you";
}

/** Rounds each seat won. */
export function roundsWon(snapshot: RoomSnapshot): Record<Seat, number> {
  const won = { p1: 0, p2: 0 };
  for (const r of snapshot.rounds) if (r.result?.winner) won[r.result.winner] += 1;
  return won;
}
