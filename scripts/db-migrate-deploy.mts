/**
 * The deploy-time migration, run by `pnpm build` before `next build` (ADR 0014). In a Vercel
 * production build it applies the pending migrations to prod, with the database URL Vercel's Neon
 * integration puts in the build; a failure exits non-zero, which fails the build so the previous
 * deployment keeps serving. Every other build (previews, Checks, local) skips: it goes by
 * VERCEL_ENV, not the URL, because a preview's URL may point at prod too.
 */
import { migrate, migrationUrl } from "./migrate.mts";

const target = process.env.VERCEL_ENV;
if (target !== "production") {
  console.log(`Skipping migrations: VERCEL_ENV is ${target || "unset"}; only production builds migrate`);
  process.exit(0);
}

const url = migrationUrl(process.env);
if (!url) {
  console.error("✗ The production build has no DATABASE_URL_UNPOOLED or DATABASE_URL; nothing was migrated.");
  process.exit(1);
}
process.exit(await migrate(url, "production"));
