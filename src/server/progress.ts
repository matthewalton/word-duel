"use server";

import { and, eq, sql } from "drizzle-orm";
import { listPacks } from "@/packs";
import { currentUserId } from "./auth";
import { getDb } from "./db";
import { bestScore } from "./schema";

/** One best score kept in an account. */
export type BestEntry = { packId: string; minigameId: string; score: number };

const MAX_SCORE = 10_000_000;
const ID = /^[a-z0-9-]{1,40}$/;

function isBestEntry(e: unknown): e is BestEntry {
  if (!e || typeof e !== "object") return false;
  const { packId, minigameId, score } = e as Record<string, unknown>;
  return (
    typeof packId === "string" &&
    listPacks().some((p) => p.id === packId) &&
    typeof minigameId === "string" &&
    ID.test(minigameId) &&
    Number.isInteger(score) &&
    (score as number) > 0 &&
    (score as number) <= MAX_SCORE
  );
}

/** Upsert a score, keeping whichever is higher: a new best the player just reached. */
async function keepHigher(userId: string, entry: BestEntry) {
  await getDb()
    .insert(bestScore)
    .values({ userId, ...entry })
    .onConflictDoUpdate({
      target: [bestScore.userId, bestScore.packId, bestScore.minigameId],
      set: {
        score: sql`greatest(${bestScore.score}, excluded.score)`,
        updatedAt: new Date(),
      },
    });
}

async function bestsFor(userId: string, packId: string): Promise<Record<string, number>> {
  const rows = await getDb()
    .select({ minigameId: bestScore.minigameId, score: bestScore.score })
    .from(bestScore)
    .where(and(eq(bestScore.userId, userId), eq(bestScore.packId, packId)));
  return Object.fromEntries(rows.map((r) => [r.minigameId, r.score]));
}

/** The signed-in account's best scores for `packId`, by minigame id. Null for a guest. */
export async function loadAccountBests(packId: string): Promise<Record<string, number> | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  return bestsFor(userId, packId);
}

/** Save a best score to the signed-in account. Does nothing for a guest. */
export async function saveAccountBest(entry: unknown): Promise<void> {
  const userId = await currentUserId();
  if (!userId || !isBestEntry(entry)) return;
  await keepHigher(userId, entry);
}
