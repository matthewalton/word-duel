/**
 * Unit tests for the practice way handed from the Wordbook to the Single player area.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { startPractice, takePracticeWay } from "./practiceLink.ts";

describe("practice way", () => {
  // The way lives in a module variable: clear what an earlier test left.
  beforeEach(() => {
    takePracticeWay();
  });

  it("is null when no practice link was pressed", () => {
    assert.equal(takePracticeWay(), null);
  });

  it("is taken once", () => {
    startPractice("toBase");
    assert.equal(takePracticeWay(), "toBase");
    assert.equal(takePracticeWay(), null);
  });

  it("keeps only the last way pressed", () => {
    startPractice("toTarget");
    startPractice("gap");
    assert.equal(takePracticeWay(), "gap");
  });
});
