# Migrations are tested on a Neon branch and applied on deploy

A migration reaches prod without anyone running a command, and only after it has run on a copy of prod. Before this (#72), every merged migration waited for Matt to run `pnpm db:migrate:prod` by hand, and nothing tried it on prod's real schema and rows first (#68).

**On a PR: the Migration test.** `.github/workflows/migrations.yml` runs on every PR from this repo, next to Checks. If the PR changes nothing under `drizzle/` or `src/server/schema.ts`, it prints "No migration changes: skipped" and passes in seconds, so it always reports a result. If it edits, deletes or renames a migration already on `main`, it fails: prod has run that file and never runs it again. Otherwise it makes a Neon branch `ci-pr-<n>-<run id>-<attempt>` from prod (`main`, in the project `vars.NEON_PROJECT_ID`, with `secrets.NEON_API_KEY`), runs `pnpm db:migrate` on it, runs it again to check that nothing is left to apply, runs `drizzle-kit check` and `pnpm db:generate` to check that `schema.ts` and `drizzle/` agree, and runs `pnpm test` with the branch as `DATABASE_URL`. A last step deletes the branch, even when a step failed or the run was cancelled, and Neon expires it after an hour in case that step never runs. The branch holds a copy of prod's data, so its connection string is masked and never uploaded. A new migration that drops, renames or changes a column's type gets a warning on the PR.

In CI, `pnpm db:migrate` only runs against the host the workflow gives as this run's branch (`CI_DB_HOST`), and never against prod's host (`NEON_PROD_HOST`, looked up with the API key), so a mistake in the workflow can't migrate prod from GitHub.

**On merge: the deploy-time migration.** `pnpm build` runs `scripts/db-migrate-deploy.mts` before `next build`. Only a Vercel production build (`VERCEL_ENV=production`) migrates; previews, the Checks job and local builds print why they skip. It goes by `VERCEL_ENV`, not the database URL, because the Neon integration may give previews prod's URL too. It connects with the `DATABASE_URL_UNPOOLED` Vercel's Neon integration already puts in the build, so prod's credentials stay in Vercel. drizzle-kit applies the pending migrations in one transaction; a failure exits non-zero, which fails the deploy, so prod's schema stays as it was and the previous deployment keeps serving.

**One at a time.** Every migration run (deploy, `pnpm db:migrate`, `pnpm db:migrate:prod`) holds one Postgres advisory lock, so two overlapping production builds migrate one after the other and the second finds nothing pending. Two PRs with migrations both change `drizzle/meta/_journal.json`, so the second conflicts once the first merges, and after its rebase its Migration test runs again with the first one included.

**Migrations work with the live code.** A migration runs before the new code is live, and stays applied if `next build` fails after it. So migrations are additive only: new tables, and new columns that are nullable or have a default. Dropping, renaming or changing the type of something the live code uses takes two PRs: the first stops using it, the second drops it once the first is deployed (`docs/standards.md` §6).

**The escape hatch.** `pnpm db:migrate:prod` stays for Matt to apply migrations by hand. Prod's database variables in Vercel are sensitive, so `vercel env pull` returns them empty; it asks for prod's direct connection string from the Neon console instead (hidden input, never written to disk), shows the host and migrates once Matt types yes.

This adds to ADR 0006 and contradicts nothing in it.

## Considered options

- **A label or a manual approval before a migration reaches prod.** Rejected: the Migration test is the check, and a gate would bring back the manual step this removes.
- **Running migrations from GitHub Actions after merge.** Rejected: GitHub would need prod's credentials, and a migration could land while Vercel still deploys the old code, or not deploy at all. Migrating inside the production build ties the two together and keeps credentials in Vercel.
- **A build command in the Vercel dashboard or a `vercel.json`.** Rejected for `package.json` `build`: it is in the repo and reviewed, and nothing changes in Vercel.
- **Automatic rollback or down-migrations.** Rejected: a failed migration already rolls back in its transaction, and with additive-only migrations the old code keeps working on the new schema, so there is nothing to undo.
