/**
 * Unit tests for the first screen at `/` and for reading a stored setting.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entryFor } from "./entry.ts";
import { pickSetting } from "./storedSetting.ts";

describe("entryFor", () => {
  it("goes straight to the hub when a remembered language is stored", () => {
    assert.equal(entryFor(true, true), "hub");
  });

  it("shows the language step on a first visit, even with REMEMBER on", () => {
    assert.equal(entryFor(true, false), "language");
  });

  it("shows the language step when REMEMBER is off, even with a stored language", () => {
    assert.equal(entryFor(false, true), "language");
    assert.equal(entryFor(false, false), "language");
  });
});

describe("pickSetting", () => {
  const levels = ["easy", "normal", "hard"] as const;

  it("keeps a stored value that is allowed", () => {
    assert.equal(pickSetting("hard", levels, "normal"), "hard");
  });

  it("falls back when nothing is stored or the value is unknown", () => {
    assert.equal(pickSetting(null, levels, "normal"), "normal");
    assert.equal(pickSetting("HARD", levels, "normal"), "normal");
    assert.equal(pickSetting("", levels, "normal"), "normal");
  });
});
