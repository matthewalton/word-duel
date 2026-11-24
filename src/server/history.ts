"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { HISTORY_LIMITS } from "@/config/game";
import { MINIGAME_PROMPT_KINDS, type MinigameId } from "@/game/minigames/ids";
import { getPack, listPacks } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { currentUserId } from "./auth";
import { getDb } from "./db";
import { DIRECTIONS, duel, itemStat, OUTCOMES, PROMPT_KINDS, roundResult } from "./schema";

const MAX_SCORE = 10_000_000;
const MAX_STAGE = 1_000;
const MAX_ID_LENGTH = 100;
/** Longer than any fuse, to allow for a throttled tab. */
const MAX_ANSWER_MS = 10 * 60_000;
const MAX_DURATION_MS = 12 * 60 * 60_000;

const id = z.string().min(1).max(MAX_ID_LENGTH);
const ms = (max: number) => z.int().min(0).max(max);

const roundSchema = z.strictObject({
  itemId: id,
  promptId: id,
  promptKind: z.enum(PROMPT_KINDS),
  outcome: z.enum(OUTCOMES),
  given: z.string().max(HISTORY_LIMITS.maxGivenLength).nullable(),
  answerMs: ms(MAX_ANSWER_MS).nullable(),
  stage: z.int().min(1).max(MAX_STAGE),
  /** Ms since the duel's first prompt; the server anchors it to its own clock. */
  atMs: ms(MAX_DURATION_MS),
});

const duelSchema = z.strictObject({
  /** Made by the browser, so a duel sent twice is only kept once. */
  id: z.uuid(),
  packId: id,
  minigameId: z.enum(Object.keys(MINIGAME_PROMPT_KINDS) as [MinigameId, ...MinigameId[]]),
  direction: z.enum(DIRECTIONS).nullable(),
  score: z.int().min(0).max(MAX_SCORE),
  stageReached: z.int().min(1).max(MAX_STAGE),
  /** From the first prompt to game over or leaving. */
  durationMs: ms(MAX_DURATION_MS),
  rounds: z.array(roundSchema).min(1).max(HISTORY_LIMITS.maxRounds),
});

/** A duel as the browser sends it to word history (ADR 0008). */
export type DuelRecord = z.infer<typeof duelSchema>;
type RoundRecord = DuelRecord["rounds"][number];

const lookups = new WeakMap<LanguagePack, { words: Set<string>; gapTests: Map<string, string> }>();

/** Word ids, and the item each gap prompt tests, retired ones included (ids are never reused). */
function lookup(pack: LanguagePack) {
  let found = lookups.get(pack);
  if (!found) {
    found = {
      words: new Set(pack.words.map((w) => w.id)),
      gapTests: new Map(pack.gaps.map((g) => [g.id, g.tests])),
    };
    lookups.set(pack, found);
  }
  return found;
}

/** Whether the round names a real item and prompt of the pack that this minigame can ask. */
function isValidRound(d: DuelRecord, pack: LanguagePack, r: RoundRecord): boolean {
  const kinds: readonly string[] = MINIGAME_PROMPT_KINDS[d.minigameId];
  if (!kinds.includes(r.promptKind)) return false;
  // A minigame with a direction asks every round that way; one without never does.
  if (d.direction ? r.promptKind !== d.direction : r.promptKind !== "gap") return false;
  if (r.atMs > d.durationMs || r.stage > d.stageReached) return false;
  if ((r.outcome === "timeout") !== (r.given === null && r.answerMs === null)) return false;
  const { words, gapTests } = lookup(pack);
  return r.promptKind === "gap"
    ? gapTests.get(r.promptId) === r.itemId
    : r.promptId === r.itemId && words.has(r.itemId);
}

function parseDuel(input: unknown): DuelRecord | null {
  const parsed = duelSchema.safeParse(input);
  if (!parsed.success) return null;
  const d = parsed.data;
  if (!listPacks().some((p) => p.id === d.packId)) return null;
  const pack = getPack(d.packId);
  return d.rounds.every((r) => isValidRound(d, pack, r)) ? d : null;
}

type ItemTotals = {
  itemId: string;
  promptKind: RoundRecord["promptKind"];
  right: number;
  wrong: number;
  timeouts: number;
  /** Right answers since this duel's last miss for the item, or all of them if none. */
  streak: number;
  lastOutcome: RoundRecord["outcome"];
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastMissedAt: Date | null;
};

/** This duel's totals per item and prompt kind, from its rounds in order. */
function totalsByItem(rounds: { r: RoundRecord; at: Date }[]): ItemTotals[] {
  const totals = new Map<string, ItemTotals>();
  for (const { r, at } of rounds) {
    const key = `${r.itemId}\u0000${r.promptKind}`;
    let t = totals.get(key);
    if (!t) {
      t = { itemId: r.itemId, promptKind: r.promptKind, right: 0, wrong: 0, timeouts: 0, streak: 0, lastOutcome: r.outcome, firstSeenAt: at, lastSeenAt: at, lastMissedAt: null };
      totals.set(key, t);
    }
    if (r.outcome === "correct") {
      t.right += 1;
      t.streak += 1;
    } else {
      if (r.outcome === "wrong") t.wrong += 1;
      else t.timeouts += 1;
      t.streak = 0;
      t.lastMissedAt = at;
    }
    t.lastOutcome = r.outcome;
    t.lastSeenAt = at;
  }
  return [...totals.values()];
}

/** Postgres unique violation, possibly wrapped by drizzle. */
function isDuplicate(error: unknown): boolean {
  for (let e = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}

/**
 * Record a finished or abandoned duel in the signed-in account's word history:
 * the duel, its round log and item stats, in one transaction. Does nothing for
 * a guest or for a duel that doesn't match the pack.
 */
export async function recordDuel(input: unknown): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const d = parseDuel(input);
  if (!d) return;

  // Times come from the server's clock; the browser only sends offsets.
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - d.durationMs);
  const rounds = d.rounds.map((r) => ({ r, at: new Date(startedAt.getTime() + r.atMs) }));
  const db = getDb();

  try {
    // neon-http runs a batch as one transaction. A duel id sent before fails
    // the insert, so the batch rolls back and nothing is counted twice.
    await db.batch([
      db.insert(duel).values({
        id: d.id,
        userId,
        packId: d.packId,
        minigameId: d.minigameId,
        direction: d.direction,
        score: d.score,
        stageReached: d.stageReached,
        rounds: d.rounds.length,
        startedAt,
        endedAt,
      }),
      db.insert(roundResult).values(
        rounds.map(({ r, at }) => ({
          duelId: d.id,
          userId,
          packId: d.packId,
          itemId: r.itemId,
          promptId: r.promptId,
          promptKind: r.promptKind,
          outcome: r.outcome,
          given: r.given,
          answerMs: r.answerMs,
          stage: r.stage,
          at,
        })),
      ),
      db
        .insert(itemStat)
        .values(totalsByItem(rounds).map((t) => ({ userId, packId: d.packId, ...t })))
        .onConflictDoUpdate({
          target: [itemStat.userId, itemStat.packId, itemStat.itemId, itemStat.promptKind],
          set: {
            right: sql`${itemStat.right} + excluded.right`,
            wrong: sql`${itemStat.wrong} + excluded.wrong`,
            timeouts: sql`${itemStat.timeouts} + excluded.timeouts`,
            // A miss this duel resets the run; otherwise this duel's right answers extend it.
            streak: sql`case when excluded.last_missed_at is null then ${itemStat.streak} + excluded.streak else excluded.streak end`,
            lastOutcome: sql`excluded.last_outcome`,
            lastSeenAt: sql`excluded.last_seen_at`,
            lastMissedAt: sql`coalesce(excluded.last_missed_at, ${itemStat.lastMissedAt})`,
          },
        }),
    ]);
  } catch (error) {
    if (isDuplicate(error)) return;
    throw error;
  }
}

/**
 * Ids of the signed-in account's items whose last outcome for this prompt
 * kind wasn't right, for comebacks. Null for a guest.
 */
export async function loadLastMissed(packId: unknown, promptKind: unknown): Promise<string[] | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const kind = z.enum(PROMPT_KINDS).safeParse(promptKind);
  if (!kind.success || typeof packId !== "string" || !listPacks().some((p) => p.id === packId)) return [];
  const rows = await getDb()
    .select({ itemId: itemStat.itemId })
    .from(itemStat)
    .where(
      and(
        eq(itemStat.userId, userId),
        eq(itemStat.packId, packId),
        eq(itemStat.promptKind, kind.data),
        ne(itemStat.lastOutcome, "correct"),
      ),
    );
  return rows.map((r) => r.itemId);
}
