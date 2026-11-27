/**
 * Makes a fake account on the `dev` branch of the Neon database, for demos that need one: Demo
 * Player (demo@example.invalid), with word history in the default language pack so the Wordbook
 * has missed and best items and the practice chooser opens. Then prints a session cookie to set
 * in the demo browser, so nobody signs in or types a password. Refuses to run on any database but
 * the dev branch. Running it again replaces the account and its history.
 *
 *   pnpm db:demo-account
 */
import { randomBytes, randomUUID } from "node:crypto";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { z } from "zod";
import { DEFAULT_PACK_ID } from "../src/config/game.ts";
import type { MinigameId } from "../src/game/minigames/ids.ts";
import type { Direction, PromptKind, Reason } from "../src/game/types.ts";
import { totalsByItem } from "../src/lib/itemTotals.ts";
import { isAcceptedAnswer } from "../src/lib/matching.ts";
import { gapPromptSchema, matchingSettingsSchema, packMetaSchema, wordItemSchema } from "../src/packs/schema.ts";
import { duel, itemStat, roundResult, session, user } from "../src/server/schema.ts";
import { hostOf } from "./migrate.mts";
import { PACKS_DIR, readJson } from "./pack-json.mts";

/** The dev branch's Neon endpoint (README: Accounts); every other host is refused. */
const DEV_ENDPOINT = "ep-solitary-river-bjkvvvl2";
const EMAIL = "demo@example.invalid";
const NAME = "Demo Player";
/** Better Auth's session cookie on plain http (no __Secure- prefix). */
const COOKIE = "better-auth.session_token";
const SESSION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

// Development mode reads the same env files as `pnpm dev`, and never .env.production*.
nextEnv.loadEnvConfig(process.cwd(), true);
const url = process.env.DATABASE_URL ?? "";
const secret = process.env.BETTER_AUTH_SECRET ?? "";
const host = hostOf(url);
if (!host) fail("DATABASE_URL isn't set to a postgresql:// URL (README: Accounts).");
if (!host?.startsWith(`${DEV_ENDPOINT}.`) && !host?.startsWith(`${DEV_ENDPOINT}-pooler.`))
  fail(`${host} isn't the dev branch (${DEV_ENDPOINT}); nothing was written.`);
if (!secret) fail("BETTER_AUTH_SECRET isn't set, so no session cookie can be signed.");
console.log(`Writing the demo account to the dev database at ${host}`);

type Round = { itemId: string; promptId: string; promptKind: PromptKind; outcome: Reason; given: string | null; answerMs: number | null };

const packFile = (name: string) => readJson(join(PACKS_DIR, DEFAULT_PACK_ID, `${name}.json`));
const meta = packMetaSchema.parse(packFile("meta"));
const matching = matchingSettingsSchema.parse(packFile("matching"));
const words = z.array(wordItemSchema).parse(packFile("words")).filter((w) => !w.retired);
const gaps = z.array(gapPromptSchema).parse(packFile("gaps")).filter((g) => !g.retired);
if (words.length < 16) fail(`${DEFAULT_PACK_ID} has too few words for the demo history.`);

/** Word i's accepted answers, and the language they're in, for a Word Strike round. */
const accepted = (i: number, kind: Direction) =>
  kind === "toTarget" ? { forms: [words[i].target], lang: meta.target.code } : { forms: words[i].base, lang: meta.base.code };
const right = (i: number, kind: Direction, ms: number): Round => ({ itemId: words[i].id, promptId: words[i].id, promptKind: kind, outcome: "correct", given: accepted(i, kind).forms[0], answerMs: ms });
/** A wrong answer a player might give: the answer of a later word that doesn't count for word i. */
function wrong(i: number, kind: Direction, skip: number): Round {
  const { forms, lang } = accepted(i, kind);
  const others = words.map((_, j) => accepted((i + 1 + skip + j) % words.length, kind).forms[0]);
  const given = others.find((o) => !isAcceptedAnswer(o, forms, matching, lang)) ?? fail(`no wrong answer for ${words[i].id}`);
  return { itemId: words[i].id, promptId: words[i].id, promptKind: kind, outcome: "wrong", given, answerMs: 3100 };
}
const slow = (i: number, kind: Direction): Round => ({ itemId: words[i].id, promptId: words[i].id, promptKind: kind, outcome: "timeout", given: null, answerMs: null });

/** Duels a day apart, oldest first, so missed items have different "last missed" days. */
const DAYS = 4;
const duels: { day: number; minigameId: MinigameId; direction: Direction | null; rounds: Round[] }[] = [];
for (let d = 0; d < DAYS; d++) {
  const toTarget: Round[] = [];
  const toBase: Round[] = [];
  // Words 0–7: right until their last missed day (one of the four), missed then, not asked after;
  // words 0 and 1 are missed once more on the last day.
  for (let i = 0; i < 8; i++) {
    if (d < i % DAYS) toTarget.push(right(i, "toTarget", 2400 + 150 * i));
    else if (d === i % DAYS || i < 2) toTarget.push(i % 3 === 0 ? slow(i, "toTarget") : wrong(i, "toTarget", 10 + d));
  }
  // Words 8–15: right every time, both ways, so they make BEST.
  for (let i = 8; i < 16; i++) {
    toTarget.push(right(i, "toTarget", 1800 + 90 * i));
    if (i % 2 === 0 || d % 2 === 0) toBase.push(right(i, "toBase", 1500 + 70 * i));
  }
  // Words 0–3 toBase: a miss among right answers.
  for (let i = 0; i < 4; i++) toBase.push(d === i ? wrong(i, "toBase", 10) : right(i, "toBase", 2000));
  duels.push({ day: d, minigameId: "word-strike", direction: "toTarget", rounds: toTarget });
  duels.push({ day: d, minigameId: "word-strike", direction: "toBase", rounds: toBase });
  // Gap Guard: a few gap sentences, the first two missed last.
  const gapRounds = gaps.slice(0, 4).map((g, i): Round => {
    const missed = i < 2 && d === DAYS - 1;
    const given = g.options.find((o) => o !== g.answer) ?? g.answer;
    return { itemId: g.tests, promptId: g.id, promptKind: "gap", outcome: missed ? "wrong" : "correct", given: missed ? given : g.answer, answerMs: 2600 };
  });
  if (gapRounds.length) duels.push({ day: d, minigameId: "gap-guard", direction: null, rounds: gapRounds });
}

const userId = randomUUID();
const now = Date.now();
// The last day's duels start two hours ago.
const first = now - (DAYS - 1) * DAY_MS - 2 * 60 * 60_000;

const duelRows: (typeof duel.$inferInsert)[] = [];
const played: { duelId: string; r: Round; at: Date }[] = [];
duels.forEach((d, n) => {
  const id = randomUUID();
  const startedAt = new Date(first + d.day * DAY_MS + n * 10 * 60_000);
  const at = (i: number) => new Date(startedAt.getTime() + (i + 1) * 4000);
  duelRows.push({ id, userId, packId: DEFAULT_PACK_ID, minigameId: d.minigameId, direction: d.direction, score: 120 * d.rounds.length, stageReached: 1, rounds: d.rounds.length, startedAt, endedAt: at(d.rounds.length) });
  d.rounds.forEach((r, i) => played.push({ duelId: id, r, at: at(i) }));
});
// One pass over every round in order gives what recording each duel in turn would store.
const stats = totalsByItem(played);

const token = randomBytes(24).toString("base64url");
const db = drizzle(neon(url));
// One transaction: deleting the old demo user cascades to its sessions, duels, round log and item stats.
await db.batch([
  db.delete(user).where(eq(user.email, EMAIL)),
  db.insert(user).values({ id: userId, name: NAME, email: EMAIL, emailVerified: true }),
  db.insert(session).values({ id: randomUUID(), token, userId, expiresAt: new Date(now + SESSION_DAYS * DAY_MS), userAgent: "dev-demo-account script" }),
  db.insert(duel).values(duelRows),
  db.insert(roundResult).values(
    played.map(({ duelId, r, at }) => ({ duelId, userId, packId: DEFAULT_PACK_ID, ...r, stage: 1, at })),
  ),
  db.insert(itemStat).values(stats.map((t) => ({ userId, packId: DEFAULT_PACK_ID, ...t }))),
]);

// Signed the way Better Auth signs its cookies: token, a dot, base64 HMAC-SHA256 of the token.
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const signature = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token))).toString("base64");
const value = encodeURIComponent(`${token}.${signature}`);

const missed = new Set(stats.filter((t) => t.wrong + t.timeouts > 0).map((t) => t.itemId)).size;
console.log(`✓ ${NAME} (${EMAIL}): ${duels.length} duels, ${played.length} rounds, ${missed} missed items in ${DEFAULT_PACK_ID}.

Set this cookie for localhost in the demo browser (it lasts ${SESSION_DAYS} days):
  ${COOKIE}=${value}`);
