/**
 * The committed sql.js wasm must match the installed package (#116), so a
 * dependency bump can't leave a stale wasm behind.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { SQL_WASM_URL } from "./ankiDownload.ts";

const require = createRequire(import.meta.url);
// The package's exports hide package.json, so find its folder through dist/.
const packageDir = dirname(dirname(require.resolve("sql.js/dist/sql-wasm-browser.wasm")));
const installed = (path: string) => readFileSync(join(packageDir, path));

describe("SQL_WASM_URL", () => {
  it("is named for the installed sql.js version", () => {
    const { version } = JSON.parse(installed("package.json").toString());
    assert.equal(SQL_WASM_URL, `/vendor/sql.js/sql-wasm-${version}.wasm`);
  });

  it("serves a byte-for-byte copy of the installed browser wasm", () => {
    const committed = readFileSync(new URL(`../../public${SQL_WASM_URL}`, import.meta.url));
    assert.ok(committed.equals(installed("dist/sql-wasm-browser.wasm")));
  });
});
