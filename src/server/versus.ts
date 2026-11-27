"use server";

import { and, eq, isNull, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { DIFFICULTIES, HISTORY_LIMITS, VERSUS } from "@/config/game";
import { MINIGAME_IDS } from "@/game/minigames/ids";
import { isRoomCode, roomChannel, seatClientId, type RoomView, type Seat } from "@/game/versus";
import { canDeal, dealDraw } from "@/game/versusRounds";
import { getPack, listPacks } from "@/packs";
import { subscribeToken } from "./ably";
import { getAuth } from "./auth";
import { getDb } from "./db";
import { DIRECTIONS, versusRoom } from "./schema";
import {
  advance,
  answer,
  askRematch,
  broadcast,
  checkPresence,
  closeLater,
  dealFirstRound,
  findRoom,
  hashToken,
  leave,
  newToken,
  randomCode,
  reload,
  seatOf,
  snapshotOf,
  type Room,
} from "./versusRoom";

/**
 * Versus server actions (ADR 0012). Browsers only listen on Ably; everything
 * they do comes through here, and the reply is the room as it now stands.
 * A seat is held by a secret token the browser keeps for the tab; guests and
 * accounts both play, and an account only lends its name.
 */

const code = z.string().refine(isRoomCode);
const token = z.string().min(16).max(100);

const settings = z.strictObject({
  packId: z.string().refine((id) => listPacks().some((p) => p.id === id)),
  minigame: z.enum(MINIGAME_IDS),
  direction: z.enum(DIRECTIONS),
  difficulty: z.enum(DIFFICULTIES),
});

/** The signed-in player's name, cut to fit, or null for a guest. */
async function playerName(): Promise<string | null> {
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  const name = session?.user.name.trim();
  return name ? name.slice(0, VERSUS.maxNameLength) : null;
}

type Seated = { room: Room; seat: Seat } | { error: "missing" | "left" };

/** The room and the caller's seat in it; `missing` if the room is gone or the token holds no seat. */
async function seated(rawCode: unknown, rawToken: unknown, now: Date): Promise<Seated> {
  const c = code.safeParse(rawCode);
  const t = token.safeParse(rawToken);
  if (!c.success || !t.success) return { error: "missing" };
  const room = await findRoom(c.data, now);
  if (!room) return { error: "missing" };
  const seat = seatOf(room, t.data);
  if (!seat) return { error: "missing" };
  if (seat === "p1" ? room.p1Left : room.p2Left) return { error: "left" };
  return { room, seat };
}

const refused = (found: { error: "missing" | "left" }): RoomView => ({ ok: false, error: found.error });

async function view(room: Room, seat: Seat, now: Date, send: boolean): Promise<RoomView> {
  const snapshot = await snapshotOf(room, now);
  if (send) await broadcast(snapshot);
  return { ok: true, seat, snapshot };
}

/**
 * Makes a room with the maker's pack, minigame, direction and difficulty.
 * Returns its code and the maker's seat token; null if the settings are bad
 * or leave nothing to deal.
 */
export async function createRoom(input: unknown): Promise<{ code: string; token: string } | null> {
  const parsed = settings.safeParse(input);
  if (!parsed.success) return null;
  const { packId, ...room } = parsed.data;
  const pack = getPack(packId);
  if (!canDeal(pack, room)) return null;
  const db = getDb();
  const now = new Date();
  // Expired rooms go, rounds and all: nothing is kept after a room is done.
  await db.delete(versusRoom).where(lt(versusRoom.expiresAt, now));

  let roomCode = randomCode();
  for (let i = 0; i < 10 && (await findRoom(roomCode, now)); i++) roomCode = randomCode();
  const secret = newToken();
  await db.insert(versusRoom).values({
    code: roomCode,
    packId,
    ...room,
    draw: dealDraw(pack, room),
    p1Name: await playerName(),
    p1Token: hashToken(secret),
    expiresAt: new Date(now.getTime() + VERSUS.waitMs),
  });
  return { code: roomCode, token: secret };
}

/** Takes the empty seat: PLAYER 2. The first round is dealt straight away. */
export async function joinRoom(rawCode: unknown): Promise<{ ok: true; token: string } | { ok: false; error: "missing" | "full" }> {
  const c = code.safeParse(rawCode);
  if (!c.success) return { ok: false, error: "missing" };
  const now = new Date();
  const room = await findRoom(c.data, now);
  if (!room) return { ok: false, error: "missing" };
  const secret = newToken();
  const [joined] = await getDb()
    .update(versusRoom)
    .set({
      p2Name: await playerName(),
      p2Token: hashToken(secret),
      joinedAt: now,
      expiresAt: new Date(now.getTime() + VERSUS.matchMs),
    })
    .where(and(eq(versusRoom.id, room.id), isNull(versusRoom.p2Token)))
    .returning();
  if (!joined) return { ok: false, error: "full" };
  await dealFirstRound(joined, now);
  await broadcast(await snapshotOf(joined, now));
  return { ok: true, token: secret };
}

/**
 * The room as it stands, for the seat this token holds. Also ends a round
 * whose time is up, and lets a seat gone from Ably presence leave.
 */
export async function roomState(rawCode: unknown, rawToken: unknown): Promise<RoomView> {
  const now = new Date();
  const found = await seated(rawCode, rawToken, now);
  if ("error" in found) return refused(found);
  const before = (await snapshotOf(found.room, now)).seq;
  const room = (await checkPresence(found.room, now)) ? await reload(found.room) : found.room;
  await advance(room, now);
  const snapshot = await snapshotOf(room, now);
  if (snapshot.seq !== before) await broadcast(snapshot);
  return { ok: true, seat: found.seat, snapshot };
}

/** One answer to round `n`. The first right answer the server receives wins the round. */
export async function answerRound(rawCode: unknown, rawToken: unknown, n: unknown, given: unknown): Promise<RoomView> {
  const now = new Date();
  const found = await seated(rawCode, rawToken, now);
  if ("error" in found) return refused(found);
  const round = z.int().min(1).max(VERSUS.maxRounds).safeParse(n);
  const text = z.string().min(1).safeParse(given);
  if (!round.success || !text.success) return view(found.room, found.seat, now, false);
  const changed = await answer(
    found.room,
    found.seat,
    round.data,
    text.data.slice(0, HISTORY_LIMITS.maxGivenLength),
    now,
  );
  if (!changed) return view(found.room, found.seat, now, false);
  await advance(found.room, now);
  const snapshot = await snapshotOf(found.room, now);
  if (snapshot.winner) await closeLater(found.room, now);
  await broadcast(snapshot);
  return { ok: true, seat: found.seat, snapshot };
}

/** Presses REMATCH. When both players have, the next match starts in the same room with the same settings. */
export async function requestRematch(rawCode: unknown, rawToken: unknown): Promise<RoomView> {
  const now = new Date();
  const found = await seated(rawCode, rawToken, now);
  if ("error" in found) return refused(found);
  const changed = await askRematch(found.room, found.seat, now);
  return view(changed ? await reload(found.room) : found.room, found.seat, now, changed);
}

/** Leaves the room for good: before the match is won, that loses it. */
export async function leaveRoom(rawCode: unknown, rawToken: unknown): Promise<void> {
  const now = new Date();
  const found = await seated(rawCode, rawToken, now);
  if ("error" in found) return;
  if (await leave(found.room, found.seat, now)) await broadcast(await snapshotOf(await reload(found.room), now));
}

/** A token that lets this seat's browser listen to its room's channel and be present on it, and nothing else. */
export async function listenToken(rawCode: unknown, rawToken: unknown): Promise<string | null> {
  const found = await seated(rawCode, rawToken, new Date());
  if ("error" in found) return null;
  const { code: roomCode } = found.room;
  return (await subscribeToken(roomChannel(roomCode), seatClientId(roomCode, found.seat))).token;
}
