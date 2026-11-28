/**
 * Database schema. The first four tables are Better Auth's (user, session,
 * account, verification) and must keep these field names; then game data
 * owned by an account (ADR 0006, and ADR 0008 for word history), and last
 * the versus rooms, which belong to no account (ADR 0012), and the versus
 * record finished matches leave for the accounts that played them.
 */
import {
  bigserial,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { DIFFICULTIES } from "../config/game.ts";
import { MINIGAME_IDS } from "../game/minigames/ids.ts";
import type { Direction, PromptKind, Reason } from "../game/types";

export const DIRECTIONS = ["toTarget", "toBase"] as const satisfies readonly Direction[];
export const PROMPT_KINDS = [...DIRECTIONS, "gap"] as const satisfies readonly PromptKind[];
/** A round's outcome for the player: the duel's reason (correct, wrong, timeout). */
export const OUTCOMES = ["correct", "wrong", "timeout"] as const satisfies readonly Reason[];
/** A versus room's two seats: PLAYER 1 made the room, PLAYER 2 joined it. */
export const SEATS = ["p1", "p2"] as const;
/** How a versus match was won: the loser ran out of hearts, or left before it was won. */
export const MATCH_ENDS = ["hearts", "left"] as const;

const createdAt = () => timestamp("created_at").notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** An account's best score, per language pack and minigame. */
export const bestScore = pgTable(
  "best_score",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    packId: text("pack_id").notNull(),
    minigameId: text("minigame_id").notNull(),
    score: integer("score").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.packId, t.minigameId] })],
);

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

/** One finished or abandoned duel played by an account. */
export const duel = pgTable(
  "duel",
  {
    id: uuid("id").primaryKey(),
    userId: userId(),
    packId: text("pack_id").notNull(),
    minigameId: text("minigame_id").notNull(),
    /** Null for minigames without a direction. */
    direction: text("direction", { enum: DIRECTIONS }),
    score: integer("score").notNull(),
    stageReached: integer("stage_reached").notNull(),
    rounds: integer("rounds").notNull(),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at").notNull(),
  },
  (t) => [index("duel_user_id_ended_at_idx").on(t.userId, t.endedAt)],
);

/** The round log: every round an account played. Append-only. */
export const roundResult = pgTable(
  "round_result",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    duelId: uuid("duel_id")
      .notNull()
      .references(() => duel.id, { onDelete: "cascade" }),
    userId: userId(),
    packId: text("pack_id").notNull(),
    itemId: text("item_id").notNull(),
    promptId: text("prompt_id").notNull(),
    promptKind: text("prompt_kind", { enum: PROMPT_KINDS }).notNull(),
    outcome: text("outcome", { enum: OUTCOMES }).notNull(),
    /** What the player typed or picked; null on a timeout. */
    given: text("given"),
    /** Null on a timeout. */
    answerMs: integer("answer_ms"),
    stage: integer("stage").notNull(),
    at: timestamp("at").notNull(),
  },
  (t) => [
    index("round_result_user_item_idx").on(t.userId, t.packId, t.itemId),
    index("round_result_user_at_idx").on(t.userId, t.at),
  ],
);

/** Item stats: running totals per item and prompt kind, rebuildable from the round log. */
export const itemStat = pgTable(
  "item_stat",
  {
    userId: userId(),
    packId: text("pack_id").notNull(),
    itemId: text("item_id").notNull(),
    promptKind: text("prompt_kind", { enum: PROMPT_KINDS }).notNull(),
    right: integer("right").notNull().default(0),
    wrong: integer("wrong").notNull().default(0),
    timeouts: integer("timeouts").notNull().default(0),
    /** Right answers in a row, reset by a wrong answer or timeout. */
    streak: integer("streak").notNull().default(0),
    lastOutcome: text("last_outcome", { enum: OUTCOMES }).notNull(),
    firstSeenAt: timestamp("first_seen_at").notNull(),
    lastSeenAt: timestamp("last_seen_at").notNull(),
    lastMissedAt: timestamp("last_missed_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.packId, t.itemId, t.promptKind] })],
);

/** A seat's account. Deleting the account clears it, so the other player's record keeps the match. */
const seatUserId = (name: string) => text(name).references(() => user.id, { onDelete: "set null" });

/**
 * A versus room: two players racing one minigame with the room maker's pack
 * and difficulty (and direction, for Word Strike). A code is taken while its room hasn't expired;
 * expired rooms are deleted, rounds and all, when the next room is made.
 * Only the current match's rounds are kept: a rematch deletes the last ones.
 */
export const versusRoom = pgTable(
  "versus_room",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    packId: text("pack_id").notNull(),
    /** Every match and rematch in the room plays this minigame. Rooms made before Gap Guard rooms are Word Strike. */
    minigame: text("minigame", { enum: MINIGAME_IDS }).notNull().default("word-strike"),
    /** Word Strike only; a Gap Guard room keeps the maker's but ignores it. */
    direction: text("direction", { enum: DIRECTIONS }).notNull(),
    difficulty: text("difficulty", { enum: DIFFICULTIES }).notNull(),
    /** Prompt ids in the order the rounds deal them: words in Word Strike, gap sentences in Gap Guard. */
    draw: text("draw").array().notNull(),
    /** An account's name; null for a guest. */
    p1Name: text("p1_name"),
    /** The account in the seat, from the session on the server; null for a guest, never linked later. */
    p1UserId: seatUserId("p1_user_id"),
    /** SHA-256 of the secret the player's browser holds for its seat. */
    p1Token: text("p1_token").notNull(),
    p2Name: text("p2_name"),
    p2UserId: seatUserId("p2_user_id"),
    /** Null until someone joins. */
    p2Token: text("p2_token"),
    /** Counts the room's matches: a rematch adds one and starts the rounds again. */
    match: integer("match").notNull().default(1),
    /** Who has pressed REMATCH since the current match ended. */
    p1Rematch: boolean("p1_rematch").notNull().default(false),
    p2Rematch: boolean("p2_rematch").notNull().default(false),
    /** Who has left the room (MENU, or gone from Ably presence). Leaving before a match is won loses it. */
    p1Left: boolean("p1_left").notNull().default(false),
    p2Left: boolean("p2_left").notNull().default(false),
    createdAt: createdAt(),
    joinedAt: timestamp("joined_at"),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("versus_room_code_idx").on(t.code, t.expiresAt)],
);

/**
 * One versus round. The server writes its winner only while none is set, in
 * one statement, so the first right answer to arrive wins (ADR 0012).
 */
export const versusRound = pgTable(
  "versus_round",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => versusRoom.id, { onDelete: "cascade" }),
    /** 1 for the first round. */
    n: integer("n").notNull(),
    /**
     * The prompt dealt: a word (Word Strike's prompt is the word itself) or a
     * gap sentence. The column keeps its first name, so code already running
     * keeps working when the migration lands.
     */
    promptId: text("item_id").notNull(),
    fuseMs: integer("fuse_ms").notNull(),
    startsAt: timestamp("starts_at").notNull(),
    /** Answers count until here: startsAt plus the fuse. */
    deadline: timestamp("deadline").notNull(),
    /** Null while open; correct (someone won), wrong (both answered wrong) or timeout (nobody right in time). */
    outcome: text("outcome", { enum: OUTCOMES }),
    winner: text("winner", { enum: SEATS }),
    /** What each player answered; one answer each per round. */
    p1Given: text("p1_given"),
    p2Given: text("p2_given"),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.n] })],
);

/**
 * One finished versus match, written once when it is won (hearts or left),
 * for the versus record. Kept after its room is deleted, so it names the
 * room only by id. A match nobody won (both left together) isn't recorded.
 */
export const versusMatch = pgTable(
  "versus_match",
  {
    roomId: uuid("room_id").notNull(),
    /** The room's match number: 1, then one more per rematch. */
    match: integer("match").notNull(),
    minigame: text("minigame", { enum: MINIGAME_IDS }).notNull(),
    /** Null for a guest, or once the account is deleted. */
    p1UserId: seatUserId("p1_user_id"),
    /** The name the room showed; null for a guest. */
    p1Name: text("p1_name"),
    p2UserId: seatUserId("p2_user_id"),
    p2Name: text("p2_name"),
    winner: text("winner", { enum: SEATS }).notNull(),
    reason: text("reason", { enum: MATCH_ENDS }).notNull(),
    p1Hearts: integer("p1_hearts").notNull(),
    p2Hearts: integer("p2_hearts").notNull(),
    endedAt: timestamp("ended_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.roomId, t.match] }),
    index("versus_match_p1_user_idx").on(t.p1UserId, t.endedAt),
    index("versus_match_p2_user_idx").on(t.p2UserId, t.endedAt),
  ],
);
