import assert from "node:assert/strict";
import { test } from "node:test";
import { ciRefusal, deploySkip, pendingMigrations, readJournal } from "./migrate.mts";

const BRANCH = "ep-ci-branch.eu-west-2.aws.neon.tech";
const PROD = "ep-prod.eu-west-2.aws.neon.tech";

test("outside CI, db:migrate may run against any host", () => {
  assert.equal(ciRefusal(PROD, {}), null);
});

test("in CI, db:migrate runs only against this run's throwaway branch", () => {
  assert.equal(ciRefusal(BRANCH, { CI: "1", CI_DB_HOST: BRANCH, NEON_PROD_HOST: PROD }), null);
  assert.equal(
    ciRefusal("other.example", { CI: "1", CI_DB_HOST: BRANCH }),
    "Refusing to migrate other.example from CI: it isn't this run's throwaway branch",
  );
});

test("in CI, db:migrate refuses when no throwaway branch was set", () => {
  assert.notEqual(ciRefusal(BRANCH, { CI: "1" }), null);
});

test("in CI, db:migrate refuses prod's host even when the workflow names it as the branch", () => {
  assert.notEqual(ciRefusal(PROD, { CI: "1", CI_DB_HOST: PROD, NEON_PROD_HOST: PROD }), null);
});

const journal = [
  { tag: "0000_init", when: 100 },
  { tag: "0001_next", when: 200 },
  { tag: "0002_last", when: 300 },
];

test("a database with no migrations run has every migration pending", () => {
  assert.deepEqual(pendingMigrations(journal, null), journal);
});

test("only migrations newer than the last one run are pending", () => {
  assert.deepEqual(
    pendingMigrations(journal, 200).map((entry) => entry.tag),
    ["0002_last"],
  );
  assert.deepEqual(pendingMigrations(journal, 300), []);
});

test("the journal in drizzle/ reads, oldest first", () => {
  const entries = readJournal();
  assert.equal(entries[0]?.tag, "0000_init");
  assert.deepEqual(
    entries.map((entry) => entry.when),
    entries.map((entry) => entry.when).toSorted((a, b) => a - b),
  );
});

test("only a Vercel production build migrates at deploy time", () => {
  assert.equal(deploySkip({ VERCEL_ENV: "production" }), null);
});

test("previews, development, Checks and local builds skip the deploy-time migration", () => {
  assert.equal(deploySkip({ VERCEL_ENV: "preview" }), "Skipping migrations: VERCEL_ENV is preview; only production builds migrate");
  assert.notEqual(deploySkip({ VERCEL_ENV: "development" }), null);
  assert.equal(deploySkip({}), "Skipping migrations: VERCEL_ENV is unset; only production builds migrate");
  assert.equal(deploySkip({ VERCEL_ENV: "" }), "Skipping migrations: VERCEL_ENV is unset; only production builds migrate");
});
