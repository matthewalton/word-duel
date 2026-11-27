/**
 * Applies the migrations in `drizzle/` to the database `.env.local` points at: the `dev` branch of
 * the Neon database, never prod (README: Accounts). Agents may run it.
 *
 *   pnpm db:migrate
 */
import nextEnv from "@next/env";
import { migrate, migrationUrl } from "./migrate.mts";

// The same env files drizzle.config.ts reads.
nextEnv.loadEnvConfig(process.cwd());

const url = migrationUrl(process.env);
if (!url) {
  console.error("DATABASE_URL is not set: copy .env.example to .env.local and fill in the dev branch (README: Accounts).");
  process.exit(1);
}
process.exit(migrate(url, "dev"));
