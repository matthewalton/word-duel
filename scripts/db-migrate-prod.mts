/**
 * Applies the migrations in `drizzle/` to the production database. Only Matt runs it.
 *
 * Production credentials live only in Vercel's Production environment. This pulls them into a
 * fresh private temp folder, migrates, and deletes the folder afterwards, also when the migration
 * fails or is interrupted, so they never stay on disk.
 *
 *   pnpm db:migrate:prod            (from a checkout linked with `vercel link`)
 *   pnpm db:migrate:prod --dry-run  (prints the steps, fetches nothing)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";
import { hostOf, migrate, migrationUrl } from "./migrate.mts";

const dryRun = process.argv.includes("--dry-run");
const help = process.argv.includes("--help") || process.argv.includes("-h");

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

console.log(`pnpm db:migrate:prod applies drizzle/ migrations to the PRODUCTION database:
  1. vercel env pull --environment=production into a new private folder in ${tmpdir()}
  2. show the production host and ask you to type "yes"
  3. drizzle-kit migrate with its DATABASE_URL_UNPOOLED (or DATABASE_URL)
  4. delete the folder, also when the migration fails or is interrupted
`);
if (help || dryRun) {
  console.log(dryRun ? "Dry run: nothing fetched, nothing migrated." : "Add --dry-run to print this without fetching anything.");
  process.exit(0);
}

if (!process.stdin.isTTY) fail("run it yourself in a terminal; it asks before touching prod.");
if (!existsSync(".vercel")) fail("this checkout isn't linked to Vercel: run `vercel link` here first.");
const vercel = spawnSync("vercel", ["--version"], { stdio: "ignore" });
if (vercel.error) fail("the Vercel CLI isn't installed: `pnpm add -g vercel`, then `vercel login`.");

const dir = mkdtempSync(join(tmpdir(), "word-duel-prod-")); // mkdtemp makes it readable by you only
const cleanup = () => rmSync(dir, { recursive: true, force: true });
// `exit` runs after a failure or process.exit too; a signal exits through it.
process.on("exit", cleanup);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(signal, () => process.exit(130));

const file = join(dir, "production.env");
const pull = spawnSync("vercel", ["env", "pull", file, "--environment=production", "--yes"], { stdio: "inherit" });
if (pull.status !== 0) fail("vercel env pull failed; nothing was migrated.");

const url = migrationUrl(parseEnv(readFileSync(file, "utf8")));
if (!url) fail("Vercel's Production environment has no DATABASE_URL (a sensitive variable pulls empty); nothing was migrated.");

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on("SIGINT", () => process.exit(130));
// Input closing before an answer counts as no.
const answer = await rl.question(`Migrate PRODUCTION at ${hostOf(url)}? Type "yes": `).catch(() => "");
rl.close();
if (answer.trim() !== "yes") fail("not confirmed; nothing was migrated.");

const status = migrate(url, "PRODUCTION");
cleanup();
console.log(`Deleted the production credentials from ${dir}.`);
process.exit(status);
