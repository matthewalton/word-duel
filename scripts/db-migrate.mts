/**
 * Applies the migrations in `drizzle/` to the database `.env.local` points at: the `dev` branch of
 * the Neon database, never prod (README: Accounts). Agents may run it. In CI (the Migration test)
 * it only runs against that run's throwaway branch (ADR 0014).
 *
 *   pnpm db:migrate
 */
import nextEnv from "@next/env";
import { BAD_URL, ciRefusal, hostOf, migrate, migrationUrl } from "./migrate.mts";

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

// Development mode reads the same env files as `pnpm dev`, and never .env.production*.
nextEnv.loadEnvConfig(process.cwd(), true);

const url = migrationUrl(process.env);
if (!url) fail("DATABASE_URL is not set: copy .env.example to .env.local and fill in the dev branch (README: Accounts).");
const host = hostOf(url) ?? fail(`${BAD_URL}; nothing was migrated.`);
const refusal = ciRefusal(host, process.env);
if (refusal) fail(refusal);
process.exit(await migrate(url, process.env.CI ? "throwaway branch" : "dev"));
