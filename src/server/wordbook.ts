"use server";

import { and, desc, eq } from "drizzle-orm";
import { WORDBOOK } from "@/config/game";
import type { PromptKind } from "@/game/types";
import { getPack, listPacks } from "@/packs";
import { currentUserId } from "./auth";
import { getDb } from "./db";
import { itemStat, PROMPT_KINDS, roundResult } from "./schema";

/** One item's totals for one prompt kind. */
export type WordbookKind = { kind: PromptKind; right: number; wrong: number; timeouts: number };

/** One item in the wordbook, from its item stats across prompt kinds. */
export type WordbookEntry = {
  itemId: string;
  /** In `PROMPT_KINDS` order; only kinds the item was asked in. */
  kinds: WordbookKind[];
  right: number;
  /** Wrong answers plus timeouts. */
  misses: number;
  timeouts: number;
  firstSeenAt: Date;
  lastMissedAt: Date | null;
};

export type Wordbook = {
  /** Items the account has been asked at all. */
  seen: number;
  /** Items missed at least once, last missed first. */
  missed: WordbookEntry[];
  /** Most accurate items with enough answers behind them. */
  best: WordbookEntry[];
};

/** What the round log adds when a wordbook row opens. */
export type WordbookDetail = {
  /** Right answers in a row, newest first, across prompt kinds. */
  run: number;
  /** Mean time to answer, timeouts left out; null if never answered. */
  averageMs: number | null;
  /** Distinct wrong answers, most often given first. */
  wrongAnswers: { given: string; kind: PromptKind; count: number }[];
};

const isPackId = (id: unknown): id is string => typeof id === "string" && listPacks().some((p) => p.id === id);

const itemIds = new Map<string, Set<string>>();

/** Every item id in the pack, retired ones included (ids are never reused). */
function packItemIds(packId: string): Set<string> {
  let ids = itemIds.get(packId);
  if (!ids) {
    const pack = getPack(packId);
    ids = new Set([...pack.words, ...pack.grammar].map((i) => i.id));
    itemIds.set(packId, ids);
  }
  return ids;
}

const answered = (e: WordbookEntry) => e.right + e.misses;

/**
 * The signed-in account's wordbook for one pack, from item stats. Null for a
 * guest. Items the pack doesn't know are left out.
 */
export async function loadWordbook(packId: unknown): Promise<Wordbook | null> {
  const userId = await currentUserId();
  if (!userId || !isPackId(packId)) return null;
  const rows = await getDb()
    .select()
    .from(itemStat)
    .where(and(eq(itemStat.userId, userId), eq(itemStat.packId, packId)));

  const known = packItemIds(packId);
  const byItem = new Map<string, WordbookEntry>();
  for (const r of rows) {
    if (!known.has(r.itemId)) continue;
    let e = byItem.get(r.itemId);
    if (!e) {
      e = { itemId: r.itemId, kinds: [], right: 0, misses: 0, timeouts: 0, firstSeenAt: r.firstSeenAt, lastMissedAt: null };
      byItem.set(r.itemId, e);
    }
    e.kinds.push({ kind: r.promptKind, right: r.right, wrong: r.wrong, timeouts: r.timeouts });
    e.right += r.right;
    e.misses += r.wrong + r.timeouts;
    e.timeouts += r.timeouts;
    if (r.firstSeenAt < e.firstSeenAt) e.firstSeenAt = r.firstSeenAt;
    if (r.lastMissedAt && (!e.lastMissedAt || r.lastMissedAt > e.lastMissedAt)) e.lastMissedAt = r.lastMissedAt;
  }

  const entries = [...byItem.values()];
  for (const e of entries) e.kinds.sort((a, b) => PROMPT_KINDS.indexOf(a.kind) - PROMPT_KINDS.indexOf(b.kind));

  const missed = entries
    .filter((e) => e.misses > 0)
    .sort((a, b) => (b.lastMissedAt?.getTime() ?? 0) - (a.lastMissedAt?.getTime() ?? 0));
  const best = entries
    .filter((e) => answered(e) >= WORDBOOK.bestMinAnswers)
    .sort((a, b) => b.right / answered(b) - a.right / answered(a) || answered(b) - answered(a))
    .slice(0, WORDBOOK.bestLimit);
  return { seen: entries.length, missed, best };
}

/** How many items the signed-in account has missed in one pack; null for a guest. */
export async function countMissed(packId: unknown): Promise<number | null> {
  const book = await loadWordbook(packId);
  return book ? book.missed.length : null;
}

/**
 * One item's details from the round log: its current run, average answer
 * time and the wrong answers given. Null for a guest or an unknown item.
 */
export async function loadWordbookItem(packId: unknown, itemId: unknown): Promise<WordbookDetail | null> {
  const userId = await currentUserId();
  if (!userId || !isPackId(packId) || typeof itemId !== "string" || !packItemIds(packId).has(itemId)) return null;
  const rounds = await getDb()
    .select({
      kind: roundResult.promptKind,
      outcome: roundResult.outcome,
      given: roundResult.given,
      answerMs: roundResult.answerMs,
    })
    .from(roundResult)
    .where(and(eq(roundResult.userId, userId), eq(roundResult.packId, packId), eq(roundResult.itemId, itemId)))
    .orderBy(desc(roundResult.at), desc(roundResult.id))
    .limit(WORDBOOK.roundsRead);

  const firstMiss = rounds.findIndex((r) => r.outcome !== "correct");
  const run = firstMiss === -1 ? rounds.length : firstMiss;

  const times = rounds.flatMap((r) => (r.answerMs == null ? [] : [r.answerMs]));
  const averageMs = times.length ? times.reduce((s, t) => s + t, 0) / times.length : null;

  // Newest first, so on equal counts the more recent wrong answer leads.
  const wrong = new Map<string, WordbookDetail["wrongAnswers"][number]>();
  for (const r of rounds) {
    const given = r.given?.trim();
    if (r.outcome !== "wrong" || !given) continue;
    const key = `${r.kind}\u0000${given}`;
    const w = wrong.get(key);
    if (w) w.count += 1;
    else wrong.set(key, { given, kind: r.kind, count: 1 });
  }
  const wrongAnswers = [...wrong.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, WORDBOOK.wrongAnswersShown);

  return { run, averageMs, wrongAnswers };
}
