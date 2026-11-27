/**
 * The deploy-time migration, run by `pnpm build` before `next build` (ADR 0014). In a Vercel
 * production build it applies the pending migrations to prod, with the database URL Vercel's Neon
 * integration puts in the build; a failure exits non-zero, which fails the build so the previous
 * deployment keeps serving. Every other build (previews, Checks, local) skips: it goes by
 * VERCEL_ENV (deploySkip).
 */
import { deploySkip, migrate } from "./migrate.mts";

const skip = deploySkip(process.env);
if (skip) {
  console.log(skip);
  process.exit(0);
}

// Only the direct connection: the advisory lock doesn't hold through the pooler (DATABASE_URL).
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("✗ The production build has no DATABASE_URL_UNPOOLED; nothing was migrated.");
  process.exit(1);
}
process.exit(await migrate(url, "production"));
