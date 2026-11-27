/**
 * The versus record: the row a finished versus match leaves, and an
 * account's totals, head-to-head and recent matches read back from those
 * rows. Pure, so the server and the tests share it.
 */
import { VERSUS } from "../config/game.ts";
import type { MinigameId } from "../game/minigames/ids";
import type { RoomSnapshot, Seat } from "../game/versus";
import type { versusMatch, versusRoom } from "../server/schema";

export type MatchRow = typeof versusMatch.$inferInsert;
type MatchEnd = (typeof versusMatch.$inferSelect)["reason"];

/** What the record needs from a room: its id and who sat where. */
export type RoomSeats = Pick<typeof versusRoom.$inferSelect, "id" | "p1UserId" | "p1Name" | "p2UserId" | "p2Name">;

/**
 * The row to write for the room's current match, or null while nobody has
 * won it. The user ids come from the room, which took them from each
 * player's session. Calling it again for the same match gives the same
 * room and match, the row's key, so the write happens once.
 */
export function matchRowOf(
  room: RoomSeats,
  snapshot: Pick<RoomSnapshot, "winner" | "forfeit" | "hearts" | "match" | "minigame" | "players">,
  endedAt: Date,
): MatchRow | null {
  if (!snapshot.winner || !snapshot.players.p2) return null;
  return {
    roomId: room.id,
    match: snapshot.match,
    minigame: snapshot.minigame,
    p1UserId: room.p1UserId,
    p1Name: room.p1Name,
    p2UserId: room.p2UserId,
    p2Name: room.p2Name,
    winner: snapshot.winner,
    reason: snapshot.forfeit ? "left" : "hearts",
    p1Hearts: snapshot.hearts.p1,
    p2Hearts: snapshot.hearts.p2,
    endedAt,
  };
}

/** A recorded match as the record reads it, with each seat's account name as it is now. */
export type StoredMatch = Omit<Required<MatchRow>, "roomId" | "match"> & {
  /** The seat's account's current name; null for a guest or a deleted account. */
  p1Current: string | null;
  p2Current: string | null;
};

export type HeadToHead = { name: string; won: number; lost: number };

export type RecentMatch = {
  /** The rival's name; null for a guest. */
  rival: string | null;
  minigame: MinigameId;
  won: boolean;
  reason: MatchEnd;
  hearts: number;
  rivalHearts: number;
  endedAt: Date;
};

export type VersusRecord = {
  played: number;
  won: number;
  lost: number;
  /** Whole percent; null until VERSUS.recordWinRateFrom matches are played. */
  winRate: number | null;
  /** One row per rival account, most played first. */
  headToHead: HeadToHead[];
  /** Newest first. */
  recent: RecentMatch[];
};

/**
 * One account's versus record from its matches, newest first. Matches
 * against guests count in the totals but have no head-to-head row; a match
 * the account played against itself (two tabs) doesn't count at all.
 */
export function versusRecordOf(matches: StoredMatch[], userId: string): VersusRecord {
  let won = 0;
  let played = 0;
  const rivals = new Map<string, HeadToHead>();
  const recent: RecentMatch[] = [];
  for (const m of matches) {
    const seat: Seat | null = m.p1UserId === userId ? "p1" : m.p2UserId === userId ? "p2" : null;
    if (!seat || m.p1UserId === m.p2UserId) continue;
    const mine = seat === "p1";
    const rivalId = mine ? m.p2UserId : m.p1UserId;
    // A deleted account's user id is gone, but the room showed its name.
    const rivalName = (mine ? m.p2Current ?? m.p2Name : m.p1Current ?? m.p1Name) ?? null;
    const win = m.winner === seat;
    played += 1;
    if (win) won += 1;
    if (rivalId) {
      const h = rivals.get(rivalId) ?? { name: rivalName ?? "", won: 0, lost: 0 };
      if (win) h.won += 1;
      else h.lost += 1;
      rivals.set(rivalId, h);
    }
    if (recent.length < VERSUS.recordRecent)
      recent.push({
        rival: rivalName,
        minigame: m.minigame,
        won: win,
        reason: m.reason,
        hearts: mine ? m.p1Hearts : m.p2Hearts,
        rivalHearts: mine ? m.p2Hearts : m.p1Hearts,
        endedAt: m.endedAt,
      });
  }
  // A stable sort, so rivals played as often keep the most recent first.
  const headToHead = [...rivals.values()]
    .sort((a, b) => b.won + b.lost - (a.won + a.lost))
    .slice(0, VERSUS.recordHeadToHead);
  return {
    played,
    won,
    lost: played - won,
    winRate: played >= VERSUS.recordWinRateFrom ? Math.round((won / played) * 100) : null,
    headToHead,
    recent,
  };
}
