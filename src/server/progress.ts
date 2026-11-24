"use server";

import { and, eq, sql } from "drizzle-orm";
import { listPacks } from "@/packs";
import { currentUserId } from "./auth";
import { getDb } from "./db";
import { bestScore } from "./schema";

/** One best score, as kept in a guest's browser or an account. */
export type BestEntry = { packId: string; minigameId: string; score: number };

const MAX_SCORE = 10_000_000;
const MAX_ENTRIES = 200;
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

/** Upsert scores, keeping whichever is higher: a new best the player just reached. */
async function keepHigher(userId: string, entries: BestEntry[]) {
  if (entries.length === 0) return;
  await getDb()
    .insert(bestScore)
    .values(entries.map((e) => ({ userId, ...e })))
    .onConflictDoUpdate({
      target: [bestScore.userId, bestScore.packId, bestScore.minigameId],
      set: {
        score: sql`greatest(${bestScore.score}, excluded.score)`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Insert scores only where the account has none yet (the guest merge rule, ADR 0006):
 * an existing account best is never replaced. Returns how many were added.
 */
async function fillGaps(userId: string, entries: BestEntry[]): Promise<number> {
  if (entries.length === 0) return 0;
  const added = await getDb()
    .insert(bestScore)
    .values(entries.map((e) => ({ userId, ...e })))
    .onConflictDoNothing({ target: [bestScore.userId, bestScore.packId, bestScore.minigameId] })
    .returning({ minigameId: bestScore.minigameId });
  return added.length;
}

async function bestsFor(userId: string, packId: string): Promise<Record<string, number>> {
  const rows = await getDb()
    .select({ minigameId: bestScore.minigameId, score: bestScore.score })
    .from(bestScore)
    .where(and(eq(bestScore.userId, userId), eq(bestScore.packId, packId)));
  return Object.fromEntries(rows.map((r) => [r.minigameId, r.score]));
}

export type MergeResult = { bests: Record<string, number>; added: number };

/**
 * Guest merge: bring this browser's best scores into the account where it has
 * none yet, then return the account's best scores for `packId` and how many
 * guest scores were added. Null for a guest. The browser deletes its guest
 * scores once this resolves.
 */
export async function mergeGuestBests(entries: unknown, packId: string): Promise<MergeResult | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const valid = Array.isArray(entries) ? entries.filter(isBestEntry).slice(0, MAX_ENTRIES) : [];
  const added = await fillGaps(userId, valid);
  return { bests: await bestsFor(userId, packId), added };
}

/** Save a best score to the signed-in account. Does nothing for a guest. */
export async function saveAccountBest(entry: unknown): Promise<void> {
  const userId = await currentUserId();
  if (!userId || !isBestEntry(entry)) return;
  await keepHigher(userId, [entry]);
}
