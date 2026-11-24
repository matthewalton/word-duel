/**
 * Database schema. The first four tables are Better Auth's (user, session,
 * account, verification) and must keep these field names; the rest is game
 * data owned by an account. See ADR 0006 and, for word history, ADR 0008.
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
import type { Direction, PromptKind, Reason } from "../game/types";

export const DIRECTIONS = ["toTarget", "toBase"] as const satisfies readonly Direction[];
export const PROMPT_KINDS = [...DIRECTIONS, "gap"] as const satisfies readonly PromptKind[];
/** A round's outcome for the player: the duel's reason (correct, wrong, timeout). */
export const OUTCOMES = ["correct", "wrong", "timeout"] as const satisfies readonly Reason[];

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
