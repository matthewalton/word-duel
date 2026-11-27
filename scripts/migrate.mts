/**
 * Shared by `pnpm db:migrate` (dev, and the Migration test's throwaway branch), the deploy-time
 * migration in `pnpm build`, and `pnpm db:migrate:prod`: says which database a run reaches, holds
 * the migration lock, lists the pending migrations and applies them with drizzle-kit (ADR 0014).
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@neondatabase/serverless";
import { z } from "zod";

const ROOT = join(import.meta.dirname, "..");
// Called directly, not through `pnpm exec`, which ignores Ctrl+C and would keep db:migrate:prod waiting.
const DRIZZLE_KIT = join(ROOT, "node_modules", ".bin", "drizzle-kit");

/**
 * The Postgres advisory lock every migration run holds, so two overlapping production builds (or a
 * build and db:migrate:prod) migrate one after the other. Any fixed number works; this one is ours.
 */
const MIGRATION_LOCK = 680_221_968;

/** The URL migrations use: the direct (unpooled) connection when Neon provides one. */
export const migrationUrl = (env: NodeJS.Dict<string>) => env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || "";

/** The host part of a Postgres URL, the one thing that tells the dev branch from prod; null if it isn't a URL. */
export function hostOf(url: string) {
  return URL.canParse(url) ? new URL(url).host : null;
}

export const BAD_URL = "the database URL isn't a valid postgresql:// URL";

/**
 * Why `pnpm db:migrate` must not run against `host` from CI, or null when it may. In CI it only
 * reaches this run's throwaway branch (`CI_DB_HOST`), and never prod (`NEON_PROD_HOST`), so a
 * mistake in the workflow can't migrate prod from GitHub. Outside CI it always may.
 */
export function ciRefusal(host: string, env: NodeJS.Dict<string>) {
  if (!env.CI) return null;
  if (host === env.CI_DB_HOST && host !== env.NEON_PROD_HOST) return null;
  return `Refusing to migrate ${host} from CI: it isn't this run's throwaway branch`;
}

/**
 * Why the deploy-time migration skips this build, or null when it migrates. Only a Vercel
 * production build migrates; it goes by VERCEL_ENV, not the URL, because a preview's URL may
 * point at prod too.
 */
export function deploySkip(env: NodeJS.Dict<string>) {
  if (env.VERCEL_ENV === "production") return null;
  return `Skipping migrations: VERCEL_ENV is ${env.VERCEL_ENV || "unset"}; only production builds migrate`;
}

const journalSchema = z.object({ entries: z.array(z.object({ tag: z.string(), when: z.number() })) });
export type JournalEntry = z.infer<typeof journalSchema>["entries"][number];

/** The migrations in `drizzle/`, oldest first, as drizzle-kit's journal lists them. */
export function readJournal(): JournalEntry[] {
  return journalSchema.parse(JSON.parse(readFileSync(join(ROOT, "drizzle", "meta", "_journal.json"), "utf8"))).entries;
}

/**
 * The migrations drizzle-kit will apply, given the `created_at` of the newest one the database has
 * run (null when it has run none). Same rule as drizzle's migrator: every entry newer than that.
 */
export function pendingMigrations(journal: JournalEntry[], lastAppliedAt: number | null) {
  return journal.filter((entry) => lastAppliedAt === null || entry.when > lastAppliedAt);
}

/** `created_at` of the newest migration the database has run, or null before the first one. */
async function lastAppliedAt(client: Client) {
  const table = await client.query("SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present");
  if (!table.rows[0]?.present) return null;
  const last = await client.query("SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1");
  return last.rows.length ? Number(last.rows[0].created_at) : null;
}

/**
 * Applies the pending migrations in `drizzle/` to `url` while holding the migration lock, and
 * returns the exit code. drizzle-kit applies them all in one transaction, so a failure leaves the
 * schema as it was. Both URL variables are set to `url` so `drizzle.config.ts` can't pick up a
 * different one from an env file.
 */
export async function migrate(url: string, label: string) {
  const host = hostOf(url);
  if (!host) {
    console.error(`✗ ${BAD_URL}; nothing was migrated.`);
    return 1;
  }
  console.log(`Migrating the ${label} database at ${host}`);
  const client = new Client(url);
  await client.connect();
  try {
    console.log("Waiting for the migration lock…");
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK]);
    console.log("Holding the migration lock");
    const pending = pendingMigrations(readJournal(), await lastAppliedAt(client));
    if (pending.length === 0) {
      console.log("No pending migrations");
      return 0;
    }
    console.log(`Pending migrations: ${pending.map((entry) => entry.tag).join(", ")}`);
    // Spawned, not spawnSync, so the lock's connection stays served while drizzle-kit runs.
    const run = spawn(DRIZZLE_KIT, ["migrate"], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url },
    });
    const [code] = await once(run, "close");
    return typeof code === "number" ? code : 1;
  } finally {
    // Closing the session releases the lock.
    await client.end();
  }
}
