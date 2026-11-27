import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { COUNTDOWN_MS, RULES, VERSUS, versusFuse } from "@/config/game";
import { promptCards, buildRound } from "@/game/minigames/wordStrikeRounds";
import type { MinigameOptions, Round } from "@/game/types";
import { otherSeat, roomChannel, seatClientId, type RoomSnapshot, type Seat, type VersusRound } from "@/game/versus";
import { isAcceptedAnswer } from "@/lib/matching";
import { drawOrder } from "@/lib/random";
import { getPack } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { presentClients, publish } from "./ably";
import { getDb } from "./db";
import { versusRoom, versusRound } from "./schema";

/**
 * The versus referee (ADR 0012): rooms, the draw, checking answers and
 * deciding rounds. Every decision is one conditional UPDATE, so whichever
 * request the database runs first wins and the other changes nothing.
 */

export type Room = typeof versusRoom.$inferSelect;
type RoundRow = typeof versusRound.$inferSelect;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(24).toString("base64url");

export function randomCode(): string {
  return Array.from({ length: VERSUS.codeLength }, () => VERSUS.codeLetters[randomInt(VERSUS.codeLetters.length)]).join(
    "",
  );
}

/** A timestamp for raw SQL on our `timestamp` (UTC, no time zone) columns. */
const utc = (d: Date) => sql`(${d.toISOString()}::timestamptz at time zone 'UTC')`;

const optsOf = (room: Room): MinigameOptions => ({ direction: room.direction, difficulty: room.difficulty });

/** The word ids a new room deals, in order: Word Strike's shuffled draw within the difficulty. */
export function dealDraw(pack: LanguagePack, opts: MinigameOptions): string[] {
  const draw = drawOrder(promptCards(pack, opts));
  return Array.from({ length: VERSUS.maxRounds }, () => {
    const card = draw.next();
    return card[randomInt(card.length)].id;
  });
}

/** The live room with this code, if any. */
export async function findRoom(code: string, now: Date): Promise<Room | null> {
  const [room] = await getDb()
    .select()
    .from(versusRoom)
    .where(and(eq(versusRoom.code, code), gt(versusRoom.expiresAt, now)))
    .orderBy(desc(versusRoom.createdAt))
    .limit(1);
  return room ?? null;
}

/** Which seat this token holds in the room, if either. */
export function seatOf(room: Room, token: string): Seat | null {
  const hash = Buffer.from(hashToken(token));
  const same = (stored: string | null) =>
    stored != null && stored.length === hash.length && timingSafeEqual(Buffer.from(stored), hash);
  if (same(room.p1Token)) return "p1";
  if (same(room.p2Token)) return "p2";
  return null;
}

function roundFor(pack: LanguagePack, room: Room, itemId: string): Round {
  const word = pack.words.find((w) => w.id === itemId);
  if (!word) throw new Error(`Unknown word ${itemId} in ${pack.meta.id}`);
  return buildRound(pack, optsOf(room), word);
}

const loadRounds = (roomId: string) =>
  getDb().select().from(versusRound).where(eq(versusRound.roomId, roomId)).orderBy(asc(versusRound.n));

function heartsOf(rounds: RoundRow[]): Record<Seat, number> {
  const hearts = { p1: RULES.startHearts, p2: RULES.startHearts };
  for (const r of rounds) if (r.winner) hearts[otherSeat(r.winner)] -= 1;
  return hearts;
}

const heartsWinner = (hearts: Record<Seat, number>): Seat | null =>
  hearts.p1 <= 0 ? "p2" : hearts.p2 <= 0 ? "p1" : null;

const leftOf = (room: Room): Seat[] => [...(room.p1Left ? ["p1" as const] : []), ...(room.p2Left ? ["p2" as const] : [])];

/** The seat that lost the match by leaving before it was won: the one who left, while the other stays. */
function forfeitOf(room: Room, hearts: Record<Seat, number>): Seat | null {
  const left = leftOf(room);
  return !heartsWinner(hearts) && left.length === 1 ? left[0] : null;
}

/** Who won the match: the last player with hearts, or the one who stayed when the other left. */
function winnerOf(room: Room, hearts: Record<Seat, number>): Seat | null {
  const forfeit = forfeitOf(room, hearts);
  return heartsWinner(hearts) ?? (forfeit ? otherSeat(forfeit) : null);
}

/** Starts round `n`, unless it already exists. `startsAt` is when its prompt shows. */
async function dealRound(room: Room, n: number, startsAt: Date, heartsBroken: number) {
  if (n > room.draw.length) return;
  const fuseMs = versusFuse(heartsBroken);
  await getDb()
    .insert(versusRound)
    .values({
      roomId: room.id,
      n,
      itemId: room.draw[n - 1],
      fuseMs,
      startsAt,
      deadline: new Date(startsAt.getTime() + fuseMs),
    })
    .onConflictDoNothing();
}

/** Deals the first round once PLAYER 2 is in: the joined card shows, then the countdown runs. */
export function dealFirstRound(room: Room, now: Date) {
  return dealRound(room, 1, new Date(now.getTime() + VERSUS.getReadyMs + COUNTDOWN_MS), 0);
}

/**
 * Brings the room up to date: an open round past its deadline ends with
 * nobody right, and a decided round is followed by the next one, unless a
 * player is out of hearts. Safe to run any number of times, from either player.
 */
export async function advance(room: Room, now: Date): Promise<void> {
  const db = getDb();
  let rounds = await loadRounds(room.id);
  const last = rounds.at(-1);
  if (!last) return;
  if (!last.outcome && last.deadline <= now) {
    await db
      .update(versusRound)
      .set({ outcome: "timeout", resolvedAt: last.deadline })
      .where(and(eq(versusRound.roomId, room.id), eq(versusRound.n, last.n), isNull(versusRound.outcome)));
    rounds = await loadRounds(room.id);
  }
  const latest = rounds.at(-1)!;
  if (!latest.outcome || leftOf(room).length > 0 || heartsWinner(heartsOf(rounds))) return;
  const resolvedAt = latest.resolvedAt ?? now;
  // If the next prompt is late being dealt, it still gets its full pause from now.
  const startsAt = Math.max(resolvedAt.getTime(), now.getTime() - VERSUS.roundPauseMs / 2) + VERSUS.roundPauseMs;
  const broken = rounds.filter((r) => r.winner).length;
  await dealRound(room, latest.n + 1, new Date(startsAt), broken);
}

/** Checks a player's answer and, if it is the first right one, decides the round. */
export async function answer(room: Room, seat: Seat, n: number, given: string, now: Date): Promise<boolean> {
  if (leftOf(room).length > 0) return false;
  const db = getDb();
  const [row] = await db
    .select()
    .from(versusRound)
    .where(and(eq(versusRound.roomId, room.id), eq(versusRound.n, n)));
  if (!row || row.outcome) return false;
  const pack = getPack(room.packId);
  const round = roundFor(pack, room, row.itemId);
  const right = isAcceptedAnswer(given, round.accepted, pack.matching, round.answerLang.code);

  const mine = seat === "p1" ? versusRound.p1Given : versusRound.p2Given;
  const theirs = seat === "p1" ? versusRound.p2Given : versusRound.p1Given;
  const givenKey = seat === "p1" ? "p1Given" : "p2Given";
  const open = and(
    eq(versusRound.roomId, room.id),
    eq(versusRound.n, n),
    isNull(versusRound.outcome),
    isNull(mine),
    lte(versusRound.startsAt, now),
    gt(versusRound.deadline, now),
  );
  const changed = await db
    .update(versusRound)
    .set(
      right
        ? { [givenKey]: given, outcome: "correct", winner: seat, resolvedAt: now }
        : {
            [givenKey]: given,
            // Both wrong: nobody is left to answer, so the round ends now.
            outcome: sql`case when ${theirs} is not null then 'wrong' end`,
            resolvedAt: sql`case when ${theirs} is not null then ${utc(now)} end`,
          },
    )
    .where(open)
    .returning({ n: versusRound.n });
  return changed.length > 0;
}

/** The room as both browsers may see it. */
export async function snapshotOf(room: Room, now: Date): Promise<RoomSnapshot> {
  const rows = await loadRounds(room.id);
  const pack = getPack(room.packId);
  const hearts = heartsOf(rows);
  const rounds: VersusRound[] = rows.map((r) => {
    const { accepted, reveal, ...prompt } = roundFor(pack, room, r.itemId);
    return {
      n: r.n,
      round: prompt,
      fuseMs: r.fuseMs,
      startsAt: r.startsAt.getTime(),
      deadline: r.deadline.getTime(),
      answered: (["p1", "p2"] as const).filter((s) => (s === "p1" ? r.p1Given : r.p2Given) != null),
      result: r.outcome
        ? { winner: r.winner, reason: r.outcome, accepted, reveal }
        : null,
    };
  });
  const rematch = (["p1", "p2"] as const).filter((s) => (s === "p1" ? room.p1Rematch : room.p2Rematch));
  const left = leftOf(room);
  // Each match starts a fresh count, far above anything the last one could reach.
  const seq =
    room.match * 1_000_000 +
    (room.p2Token ? 1 : 0) +
    rematch.length +
    left.length +
    rounds.reduce((sum, r) => sum + 1 + r.answered.length + (r.result ? 1 : 0), 0);
  return {
    code: room.code,
    packId: room.packId,
    direction: room.direction,
    difficulty: room.difficulty,
    players: { p1: { name: room.p1Name }, p2: room.p2Token ? { name: room.p2Name } : null },
    rounds,
    hearts,
    winner: winnerOf(room, hearts),
    forfeit: forfeitOf(room, hearts),
    match: room.match,
    rematch,
    left,
    seq,
    serverNow: now.getTime(),
  };
}

/** Sends the room's snapshot to both browsers. A failed send is logged: browsers also catch up by asking. */
export async function broadcast(snapshot: RoomSnapshot): Promise<void> {
  try {
    await publish(roomChannel(snapshot.code), "room", snapshot);
  } catch (e) {
    console.error("versus: publish failed", e);
  }
}

/** The room as stored now, after a change made by this request. */
export async function reload(room: Room): Promise<Room> {
  const [fresh] = await getDb().select().from(versusRoom).where(eq(versusRoom.id, room.id));
  return fresh ?? room;
}

/** A match was just won: the room closes VERSUS.closeMs from now unless a rematch starts. */
export async function closeLater(room: Room, now: Date): Promise<void> {
  await getDb()
    .update(versusRoom)
    .set({ expiresAt: new Date(now.getTime() + VERSUS.closeMs) })
    .where(and(eq(versusRoom.id, room.id), eq(versusRoom.match, room.match)));
}

/**
 * A seat leaves the room. Before the match is won that loses it; the room
 * closes at once when nobody is left in it, and otherwise VERSUS.closeMs
 * after the match ended. Returns false if the seat had already left.
 */
export async function leave(room: Room, seat: Seat, now: Date): Promise<boolean> {
  const db = getDb();
  const mine = seat === "p1" ? versusRoom.p1Left : versusRoom.p2Left;
  const [after] = await db
    .update(versusRoom)
    .set(seat === "p1" ? { p1Left: true } : { p2Left: true })
    .where(and(eq(versusRoom.id, room.id), eq(mine, false)))
    .returning();
  if (!after) return false;
  const empty = !after.p2Token || (after.p1Left && after.p2Left);
  const midMatch = after.p2Token && !heartsWinner(heartsOf(await loadRounds(room.id)));
  if (empty) {
    await db.update(versusRoom).set({ expiresAt: now }).where(eq(versusRoom.id, room.id));
  } else if (midMatch) {
    await closeLater(after, now);
  }
  return true;
}

/**
 * Seats gone from the room's Ably presence leave it. Ably keeps a dropped
 * connection present for 15 seconds, so a player who comes back sooner never
 * shows as gone. Checked only once the match's first prompt has shown, so a
 * browser still connecting isn't taken for gone. Returns true if anyone left.
 */
export async function checkPresence(room: Room, now: Date): Promise<boolean> {
  if (!room.p2Token || room.p1Left || room.p2Left) return false;
  const [first] = await loadRounds(room.id);
  if (!first || first.startsAt > now) return false;
  let present: Set<string>;
  try {
    present = await presentClients(roomChannel(room.code));
  } catch (e) {
    console.error("versus: presence check failed", e);
    return false;
  }
  let changed = false;
  for (const seat of ["p1", "p2"] as const) {
    if (!present.has(seatClientId(room.code, seat))) changed = (await leave(await reload(room), seat, now)) || changed;
  }
  return changed;
}

/**
 * A seat presses REMATCH once the match is won and both players are still in
 * the room. The press that finds the other's already in starts the next
 * match: the last rounds go, a fresh draw is dealt and the countdown runs
 * again, all in one transaction. Returns true if anything changed.
 */
export async function askRematch(room: Room, seat: Seat, now: Date): Promise<boolean> {
  if (!room.p2Token || leftOf(room).length > 0) return false;
  const rounds = await loadRounds(room.id);
  if (!heartsWinner(heartsOf(rounds))) return false;
  const db = getDb();
  const mine = seat === "p1" ? versusRoom.p1Rematch : versusRoom.p2Rematch;
  const [asked] = await db
    .update(versusRoom)
    .set(seat === "p1" ? { p1Rematch: true } : { p2Rematch: true })
    .where(
      and(
        eq(versusRoom.id, room.id),
        eq(versusRoom.match, room.match),
        eq(mine, false),
        eq(versusRoom.p1Left, false),
        eq(versusRoom.p2Left, false),
      ),
    )
    .returning();
  if (!asked) return false;
  // Row locks make exactly one press see both: the second one, which starts the match.
  if (!asked.p1Rematch || !asked.p2Rematch) return true;

  const pack = getPack(room.packId);
  const draw = dealDraw(pack, optsOf(room));
  const fuseMs = versusFuse(0);
  const startsAt = new Date(now.getTime() + VERSUS.rematchLeadMs + COUNTDOWN_MS);
  await db.batch([
    db.delete(versusRound).where(eq(versusRound.roomId, room.id)),
    db
      .update(versusRoom)
      .set({
        match: asked.match + 1,
        p1Rematch: false,
        p2Rematch: false,
        draw,
        expiresAt: new Date(now.getTime() + VERSUS.matchMs),
      })
      .where(eq(versusRoom.id, room.id)),
    db.insert(versusRound).values({
      roomId: room.id,
      n: 1,
      itemId: draw[0],
      fuseMs,
      startsAt,
      deadline: new Date(startsAt.getTime() + fuseMs),
    }),
  ]);
  return true;
}
