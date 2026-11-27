"use server";

import { desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { versusRecordOf, type VersusRecord } from "@/lib/versusRecord";
import { currentUserId } from "./auth";
import { getDb } from "./db";
import { user, versusMatch } from "./schema";

/**
 * The signed-in account's versus record; null for a guest. Rivals are named
 * by their account's current name. Reads every match the account played:
 * a few hundred short rows at most for one player.
 */
export async function loadVersusRecord(): Promise<VersusRecord | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const p1 = alias(user, "p1_user");
  const p2 = alias(user, "p2_user");
  const m = versusMatch;
  const rows = await getDb()
    .select({
      minigame: m.minigame,
      p1UserId: m.p1UserId,
      p1Name: m.p1Name,
      p1Current: p1.name,
      p2UserId: m.p2UserId,
      p2Name: m.p2Name,
      p2Current: p2.name,
      winner: m.winner,
      reason: m.reason,
      p1Hearts: m.p1Hearts,
      p2Hearts: m.p2Hearts,
      endedAt: m.endedAt,
    })
    .from(versusMatch)
    .leftJoin(p1, eq(p1.id, m.p1UserId))
    .leftJoin(p2, eq(p2.id, m.p2UserId))
    .where(or(eq(m.p1UserId, userId), eq(m.p2UserId, userId)))
    .orderBy(desc(m.endedAt));
  return versusRecordOf(rows, userId);
}
