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
import { z } from "zod";
import { DEFAULT_PACK_ID } from "../src/config/game.ts";
import { gapPromptSchema, wordItemSchema } from "../src/packs/schema.ts";
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

type Kind = "toTarget" | "toBase" | "gap";
type Outcome = "correct" | "wrong" | "timeout";
type Round = { itemId: string; promptId: string; kind: Kind; outcome: Outcome; given: string | null; answerMs: number | null };

const packFile = (name: string) => readJson(join(PACKS_DIR, DEFAULT_PACK_ID, `${name}.json`));
const words = z.array(wordItemSchema).parse(packFile("words")).filter((w) => !w.retired);
const gaps = z.array(gapPromptSchema).parse(packFile("gaps")).filter((g) => !g.retired);
if (words.length < 16) fail(`${DEFAULT_PACK_ID} has too few words for the demo history.`);

/** Word i's answer in the language a Word Strike round asks for. */
const answer = (i: number, kind: Kind) => (kind === "toTarget" ? words[i].target : words[i].base[0]);
const right = (i: number, kind: Kind, ms: number): Round => ({ itemId: words[i].id, promptId: words[i].id, kind, outcome: "correct", given: answer(i, kind), answerMs: ms });
// A wrong answer a player might give: another word of the pack, in the right language.
const wrong = (i: number, kind: Kind, other: number): Round => ({ itemId: words[i].id, promptId: words[i].id, kind, outcome: "wrong", given: answer((i + 20 + other) % words.length, kind), answerMs: 3100 });
const slow = (i: number, kind: Kind): Round => ({ itemId: words[i].id, promptId: words[i].id, kind, outcome: "timeout", given: null, answerMs: null });

/** Duels a day apart, oldest first, so missed items have different "last missed" days. */
const DAYS = 4;
const duels: { day: number; minigameId: string; direction: Kind | null; rounds: Round[] }[] = [];
for (let d = 0; d < DAYS; d++) {
  const toTarget: Round[] = [];
  const toBase: Round[] = [];
  // Words 0–7: right until their last missed day (one of the four), missed then, not asked after;
  // words 0 and 1 are missed once more on the last day.
  for (let i = 0; i < 8; i++) {
    if (d < i % DAYS) toTarget.push(right(i, "toTarget", 2400 + 150 * i));
    else if (d === i % DAYS || i < 2) toTarget.push(i % 3 === 0 ? slow(i, "toTarget") : wrong(i, "toTarget", d % 2));
  }
  // Words 8–15: right every time, both ways, so they make BEST.
  for (let i = 8; i < 16; i++) {
    toTarget.push(right(i, "toTarget", 1800 + 90 * i));
    if (i % 2 === 0 || d % 2 === 0) toBase.push(right(i, "toBase", 1500 + 70 * i));
  }
  // Words 0–3 toBase: a miss among right answers.
  for (let i = 0; i < 4; i++) toBase.push(d === i ? wrong(i, "toBase", 0) : right(i, "toBase", 2000));
  duels.push({ day: d, minigameId: "word-strike", direction: "toTarget", rounds: toTarget });
  duels.push({ day: d, minigameId: "word-strike", direction: "toBase", rounds: toBase });
  // Gap Guard: a few gap sentences, the first two missed last.
  const gapRounds = gaps.slice(0, 4).map((g, i): Round => {
    const missed = i < 2 && d === DAYS - 1;
    const given = g.options.find((o) => o !== g.answer) ?? g.answer;
    return { itemId: g.tests, promptId: g.id, kind: "gap", outcome: missed ? "wrong" : "correct", given: missed ? given : g.answer, answerMs: 2600 };
  });
  if (gapRounds.length) duels.push({ day: d, minigameId: "gap-guard", direction: null, rounds: gapRounds });
}

const userId = randomUUID();
const now = Date.now();
// The last day's duels start two hours ago.
const first = now - (DAYS - 1) * DAY_MS - 2 * 60 * 60_000;

/** Item stats, built from the round log the same way recording a duel builds them. */
type Stat = { itemId: string; kind: Kind; right: number; wrong: number; timeouts: number; streak: number; lastOutcome: Outcome; firstSeenAt: Date; lastSeenAt: Date; lastMissedAt: Date | null };
const stats = new Map<string, Stat>();
const duelRows: unknown[][] = [];
const roundRows: unknown[][] = [];
duels.forEach((duel, n) => {
  const id = randomUUID();
  const startedAt = new Date(first + duel.day * DAY_MS + n * 10 * 60_000);
  const at = (i: number) => new Date(startedAt.getTime() + (i + 1) * 4000);
  duelRows.push([id, duel.minigameId, duel.direction, 120 * duel.rounds.length, duel.rounds.length, startedAt, at(duel.rounds.length)]);
  duel.rounds.forEach((r, i) => {
    roundRows.push([id, r.itemId, r.promptId, r.kind, r.outcome, r.given, r.answerMs, at(i)]);
    const key = `${r.itemId}\u0000${r.kind}`;
    const s = stats.get(key) ?? { itemId: r.itemId, kind: r.kind, right: 0, wrong: 0, timeouts: 0, streak: 0, lastOutcome: r.outcome, firstSeenAt: at(i), lastSeenAt: at(i), lastMissedAt: null };
    if (r.outcome === "correct") {
      s.right += 1;
      s.streak += 1;
    } else {
      if (r.outcome === "wrong") s.wrong += 1;
      else s.timeouts += 1;
      s.streak = 0;
      s.lastMissedAt = at(i);
    }
    s.lastOutcome = r.outcome;
    s.lastSeenAt = at(i);
    stats.set(key, s);
  });
});

const token = randomBytes(24).toString("base64url");
const sql = neon(url);
await sql.transaction((tx) => [
  // Cascades to the old demo account's sessions, duels, round log and item stats.
  tx`DELETE FROM "user" WHERE email = ${EMAIL}`,
  tx`INSERT INTO "user" (id, name, email, email_verified) VALUES (${userId}, ${NAME}, ${EMAIL}, true)`,
  tx`INSERT INTO session (id, token, user_id, expires_at, user_agent) VALUES (${randomUUID()}, ${token}, ${userId}, ${new Date(now + SESSION_DAYS * DAY_MS)}, 'dev-demo-account script')`,
  ...duelRows.map(
    ([id, minigameId, direction, score, rounds, startedAt, endedAt]) =>
      tx`INSERT INTO duel (id, user_id, pack_id, minigame_id, direction, score, stage_reached, rounds, started_at, ended_at)
         VALUES (${id}, ${userId}, ${DEFAULT_PACK_ID}, ${minigameId}, ${direction}, ${score}, 1, ${rounds}, ${startedAt}, ${endedAt})`,
  ),
  ...roundRows.map(
    ([duelId, itemId, promptId, kind, outcome, given, answerMs, at]) =>
      tx`INSERT INTO round_result (duel_id, user_id, pack_id, item_id, prompt_id, prompt_kind, outcome, given, answer_ms, stage, at)
         VALUES (${duelId}, ${userId}, ${DEFAULT_PACK_ID}, ${itemId}, ${promptId}, ${kind}, ${outcome}, ${given}, ${answerMs}, 1, ${at})`,
  ),
  ...[...stats.values()].map(
    (s) =>
      tx`INSERT INTO item_stat (user_id, pack_id, item_id, prompt_kind, "right", wrong, timeouts, streak, last_outcome, first_seen_at, last_seen_at, last_missed_at)
         VALUES (${userId}, ${DEFAULT_PACK_ID}, ${s.itemId}, ${s.kind}, ${s.right}, ${s.wrong}, ${s.timeouts}, ${s.streak}, ${s.lastOutcome}, ${s.firstSeenAt}, ${s.lastSeenAt}, ${s.lastMissedAt})`,
  ),
]);

// Signed the way Better Auth signs its cookies: token, a dot, base64 HMAC-SHA256 of the token.
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const signature = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token))).toString("base64");
const value = encodeURIComponent(`${token}.${signature}`);

const missed = new Set([...stats.values()].filter((s) => s.wrong + s.timeouts > 0).map((s) => s.itemId)).size;
console.log(`✓ ${NAME} (${EMAIL}): ${duels.length} duels, ${roundRows.length} rounds, ${missed} missed items in ${DEFAULT_PACK_ID}.

Set this cookie for localhost in the demo browser (it lasts ${SESSION_DAYS} days):
  ${COOKIE}=${value}`);
