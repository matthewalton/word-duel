/**
 * Unit tests for the swipe rules on the minigame cards and the shared wrap-around.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearOfEdges,
  EDGE_GUARD,
  FLICK_MIN_DISTANCE,
  FLICK_MIN_SPEED,
  HORIZONTAL_RATIO,
  SWIPE_MIN_DISTANCE,
  swipeStep,
  wrapIndex,
} from "./swipe.ts";

/** Long enough that speed never makes a swipe count. */
const SLOW = 10_000;

describe("swipeStep", () => {
  it("goes to the next card when the finger moves left", () => {
    assert.equal(swipeStep({ dx: -120, dy: 5, ms: 150 }), 1);
  });

  it("goes to the previous card when the finger moves right", () => {
    assert.equal(swipeStep({ dx: 120, dy: -5, ms: 150 }), -1);
  });

  it("ignores a tap and a short slow drag", () => {
    assert.equal(swipeStep({ dx: 0, dy: 0, ms: 80 }), 0);
    assert.equal(swipeStep({ dx: -30, dy: 0, ms: SLOW }), 0);
  });

  it("counts a long drag however slow it is", () => {
    assert.equal(swipeStep({ dx: -80, dy: 0, ms: SLOW }), 1);
  });

  it("counts a short drag when it is a quick flick", () => {
    assert.equal(swipeStep({ dx: 30, dy: 0, ms: 50 }), -1);
  });

  it("ignores a drag that is too vertical", () => {
    assert.equal(swipeStep({ dx: -20, dy: 200, ms: 200 }), 0);
    assert.equal(swipeStep({ dx: -100, dy: 80, ms: 150 }), 0);
  });

  it("counts a drag exactly at the distance threshold", () => {
    assert.equal(swipeStep({ dx: -SWIPE_MIN_DISTANCE, dy: 0, ms: SLOW }), 1);
    assert.equal(swipeStep({ dx: -(SWIPE_MIN_DISTANCE - 1), dy: 0, ms: SLOW }), 0);
  });

  it("counts a flick exactly at the flick distance and speed", () => {
    const ms = FLICK_MIN_DISTANCE / FLICK_MIN_SPEED;
    assert.equal(swipeStep({ dx: FLICK_MIN_DISTANCE, dy: 0, ms }), -1);
    assert.equal(swipeStep({ dx: FLICK_MIN_DISTANCE, dy: 0, ms: ms + 1 }), 0);
    assert.equal(swipeStep({ dx: FLICK_MIN_DISTANCE - 1, dy: 0, ms: 1 }), 0);
  });

  it("counts a drag exactly at the horizontal ratio", () => {
    assert.equal(swipeStep({ dx: -HORIZONTAL_RATIO * 60, dy: 60, ms: 150 }), 1);
    assert.equal(swipeStep({ dx: -HORIZONTAL_RATIO * 60 + 1, dy: 60, ms: 150 }), 0);
  });
});

describe("clearOfEdges", () => {
  it("leaves touches near the left and right edges to the browser", () => {
    assert.equal(clearOfEdges(EDGE_GUARD - 1, 390), false);
    assert.equal(clearOfEdges(390 - EDGE_GUARD + 1, 390), false);
    assert.equal(clearOfEdges(EDGE_GUARD, 390), true);
    assert.equal(clearOfEdges(390 - EDGE_GUARD, 390), true);
    assert.equal(clearOfEdges(195, 390), true);
  });
});

describe("wrapIndex", () => {
  it("steps forward and wraps from the last item to the first", () => {
    assert.equal(wrapIndex(0, 1, 3), 1);
    assert.equal(wrapIndex(2, 1, 3), 0);
  });

  it("steps backward and wraps from the first item to the last", () => {
    assert.equal(wrapIndex(1, -1, 3), 0);
    assert.equal(wrapIndex(0, -1, 3), 2);
  });

  it("stays put with one item", () => {
    assert.equal(wrapIndex(0, 1, 1), 0);
    assert.equal(wrapIndex(0, -1, 1), 0);
  });
});
