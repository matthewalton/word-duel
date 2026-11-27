/**
 * Unit tests for item stat totals from a duel's rounds.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { totalsByItem, type TotalsRound } from "./itemTotals.ts";

const at = (s: number) => new Date(Date.UTC(2026, 10, 27, 12, 0, s));
const round = (itemId: string, outcome: TotalsRound["outcome"], promptKind: TotalsRound["promptKind"] = "toTarget") => ({
  itemId,
  promptKind,
  outcome,
});

describe("totalsByItem", () => {
  it("is empty for no rounds", () => {
    assert.deepEqual(totalsByItem([]), []);
  });

  it("counts right, wrong and timeouts and keeps the first, last and last missed times", () => {
    const [t] = totalsByItem([
      { r: round("a", "correct"), at: at(1) },
      { r: round("a", "wrong"), at: at(2) },
      { r: round("a", "timeout"), at: at(3) },
      { r: round("a", "correct"), at: at(4) },
    ]);
    assert.deepEqual(t, {
      itemId: "a",
      promptKind: "toTarget",
      right: 2,
      wrong: 1,
      timeouts: 1,
      streak: 1,
      lastOutcome: "correct",
      firstSeenAt: at(1),
      lastSeenAt: at(4),
      lastMissedAt: at(3),
    });
  });

  it("counts the streak from the last miss, or every right answer when there is none", () => {
    const totals = totalsByItem([
      { r: round("a", "correct"), at: at(1) },
      { r: round("a", "correct"), at: at(2) },
      { r: round("b", "correct"), at: at(3) },
      { r: round("b", "wrong"), at: at(4) },
    ]);
    assert.equal(totals.find((t) => t.itemId === "a")?.streak, 2);
    assert.equal(totals.find((t) => t.itemId === "a")?.lastMissedAt, null);
    assert.equal(totals.find((t) => t.itemId === "b")?.streak, 0);
    assert.equal(totals.find((t) => t.itemId === "b")?.lastOutcome, "wrong");
  });

  it("keeps each prompt kind of an item apart", () => {
    const totals = totalsByItem([
      { r: round("a", "correct", "toTarget"), at: at(1) },
      { r: round("a", "wrong", "toBase"), at: at(2) },
    ]);
    assert.deepEqual(
      totals.map((t) => [t.promptKind, t.right, t.wrong]),
      [
        ["toTarget", 1, 0],
        ["toBase", 0, 1],
      ],
    );
  });
});
