/**
 * Shared by `pnpm db:migrate` (dev) and `pnpm db:migrate:prod`: says which database a run
 * reaches, then applies the migrations in `drizzle/` with drizzle-kit.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

// Called directly, not through `pnpm exec`, which ignores Ctrl+C and would keep db:migrate:prod waiting.
const DRIZZLE_KIT = join(import.meta.dirname, "..", "node_modules", ".bin", "drizzle-kit");

/** The URL migrations use: the direct (unpooled) connection when Neon provides one. */
export const migrationUrl = (env: NodeJS.Dict<string>) => env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || "";

/** The host part of a Postgres URL, the one thing that tells the dev branch from prod. */
export function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    throw new Error("the database URL isn't a valid postgresql:// URL");
  }
}

/**
 * Runs `drizzle-kit migrate` against `url` and returns its exit code. Both URL variables are set
 * to it so `drizzle.config.ts` can't pick up a different one from an env file.
 */
export function migrate(url: string, label: string) {
  console.log(`Migrating the ${label} database at ${hostOf(url)}`);
  const run = spawnSync(DRIZZLE_KIT, ["migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url },
  });
  if (run.error) throw run.error;
  return run.status ?? 1;
}
