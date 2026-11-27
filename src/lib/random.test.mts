/**
 * Unit tests for the draw order (ADR 0010).
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { drawOrder, MISSED_EVERY, weave } from "./random.ts";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const TRIES = 200;

/** Deals `n` items from a draw. */
function deal<T>(next: () => T, n: number): T[] {
  return range(n).map(() => next());
}

/** Checks that each block of MISSED_EVERY rounds holds exactly one missed item until all are dealt. */
function assertWoven(order: number[], isMissed: (n: number) => boolean, missedCount: number) {
  const blocks = Math.min(missedCount, Math.floor((order.length - missedCount) / (MISSED_EVERY - 1)));
  for (let b = 0; b < blocks; b++) {
    const block = order.slice(b * MISSED_EVERY, (b + 1) * MISSED_EVERY);
    assert.equal(block.filter(isMissed).length, 1, `block ${b} of ${JSON.stringify(order)}`);
  }
  const firstMissedFree = order.findIndex((_, i) => order.slice(i).every((n) => !isMissed(n)));
  assert.ok(firstMissedFree <= missedCount * MISSED_EVERY, `missed items come early in ${JSON.stringify(order)}`);
}

describe("weave", () => {
  it("deals one missed item in every block of three until all are dealt", () => {
    const isMissed = (n: number) => n < 5;
    for (let t = 0; t < TRIES; t++) {
      const order = weave(range(30), isMissed);
      assert.deepEqual([...order].sort((a, b) => a - b), range(30));
      assertWoven(order, isMissed, 5);
      assert.ok(order.slice(15).every((n) => !isMissed(n)));
    }
  });

  it("puts the missed item anywhere in its block", () => {
    const seen = new Set<number>();
    for (let t = 0; t < TRIES; t++) seen.add(weave(range(9), (n) => n === 0).indexOf(0));
    assert.deepEqual([...seen].sort(), range(MISSED_EVERY));
  });

  it("follows with the leftover missed items when they outnumber the rest", () => {
    const order = weave(range(6), (n) => n < 5);
    assert.deepEqual([...order].sort((a, b) => a - b), range(6));
    assert.equal(order.slice(0, 2).filter((n) => n < 5).length, 1);
  });

  it("is a plain shuffle with nothing missed", () => {
    const firsts = new Set<number>();
    for (let t = 0; t < TRIES; t++) {
      const order = weave(range(10), () => false);
      assert.deepEqual([...order].sort((a, b) => a - b), range(10));
      firsts.add(order[0]);
    }
    assert.equal(firsts.size, 10);
  });
});

describe("drawOrder", () => {
  it("deals the whole pool before anything repeats, pass after pass", () => {
    const isMissed = (n: number) => n % 7 === 0;
    for (let t = 0; t < TRIES; t++) {
      const draw = drawOrder(range(20), isMissed);
      for (let pass = 0; pass < 4; pass++) {
        const order = deal(draw.next, 20);
        assert.deepEqual([...order].sort((a, b) => a - b), range(20));
      }
    }
  });

  it("works missed items in about every third round in every pass", () => {
    const isMissed = (n: number) => n < 4;
    for (let t = 0; t < TRIES; t++) {
      const draw = drawOrder(range(24), isMissed);
      for (let pass = 0; pass < 3; pass++) assertWoven(deal(draw.next, 24), isMissed, 4);
    }
  });

  it("never deals the same item twice in a row across a reshuffle", () => {
    for (let t = 0; t < TRIES; t++) {
      const draw = drawOrder(range(4), (n) => n === 0);
      const order = deal(draw.next, 40);
      order.slice(1).forEach((n, i) => assert.notEqual(n, order[i]));
    }
  });

  it("works missed items into the rest of the pass when they arrive late", () => {
    const isMissed = (n: number) => n >= 10;
    for (let t = 0; t < TRIES; t++) {
      const draw = drawOrder(range(30));
      const before = deal(draw.next, 6);
      draw.workIn(isMissed);
      const rest = deal(draw.next, 24);
      assert.deepEqual([...before, ...rest].sort((a, b) => a - b), range(30));
      const left = rest.filter(isMissed).length;
      assertWoven(rest, isMissed, left);
      assertWoven(deal(draw.next, 30), isMissed, 20);
    }
  });

  it("is a plain shuffle without missed items", () => {
    const firsts = new Set<number>();
    for (let t = 0; t < TRIES; t++) firsts.add(drawOrder(range(8)).next());
    assert.equal(firsts.size, 8);
  });

  it("deals a one-item pool forever", () => {
    const draw = drawOrder(["only"], () => true);
    assert.deepEqual(deal(draw.next, 3), ["only", "only", "only"]);
  });
});
