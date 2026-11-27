/**
 * Matt's escape hatch: applies the migrations in `drizzle/` to the production database by hand.
 * Normally a merged PR's production build does this (ADR 0014). Only Matt runs it.
 *
 * Prod's database variables in Vercel are sensitive, so `vercel env pull` can't fetch them. This
 * asks for the prod connection string instead, read without echo and never written to disk.
 *
 *   pnpm db:migrate:prod
 */
import { createInterface } from "node:readline/promises";
import { BAD_URL, hostOf, migrate } from "./migrate.mts";

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

/** Reads one line from the terminal without showing it; Ctrl+C exits, Ctrl+D ends the line. */
function askHidden(prompt: string) {
  // Raw mode first, so nothing typed straight after the prompt is echoed.
  process.stdin.setRawMode(true);
  process.stdout.write(prompt);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise<string>((resolve) => {
    let line = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\r" || char === "\n" || char === "\u0004") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(line);
          return;
        }
        if (char === "\u007f" || char === "\b") line = line.slice(0, -1);
        else line += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

console.log(`pnpm db:migrate:prod applies drizzle/ migrations to the PRODUCTION database:
  1. paste prod's direct connection string: Neon console → Word Duel → Connect → branch main,
     connection pooling off (it isn't shown or saved)
  2. check the production host and type "yes"
  3. the pending migrations are applied while holding the migration lock
`);
if (!process.stdin.isTTY) fail("run it yourself in a terminal; it asks before touching prod.");

const url = (await askHidden("Prod connection string: ")).trim();
const host = hostOf(url) ?? fail(`${BAD_URL}; nothing was migrated.`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on("SIGINT", () => process.exit(130));
// Input closing before an answer counts as no.
const answer = await rl.question(`Migrate PRODUCTION at ${host}? Type "yes": `).catch(() => "");
rl.close();
if (answer.trim() !== "yes") fail("not confirmed; nothing was migrated.");

process.exit(await migrate(url, "PRODUCTION"));
