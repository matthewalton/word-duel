/**
 * Unit tests for which sound effects a duel plays, and when.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { duelSounds, type SoundView } from "./duelSounds.ts";
import type { Outcome } from "./types.ts";

const view = (over: Partial<SoundView> = {}): SoundView => ({
  versus: false,
  phase: "playing",
  count: 0,
  fxKey: 0,
  outcome: null,
  fuseLit: 20,
  lockedOut: false,
  result: null,
  ...over,
});

const outcome = (over: Partial<Outcome> = {}): Outcome => ({
  loser: "rival",
  reason: "correct",
  points: 10,
  stageCleared: false,
  comeback: false,
  gameOver: false,
  ...over,
});

/** The sounds when the duel goes from playing to showing this outcome. */
const resolved = (o: Outcome, versus = false) =>
  duelSounds(view({ versus }), view({ versus, phase: "resolving", fxKey: 1, outcome: o }));

describe("duelSounds", () => {
  it("plays nothing on a first view", () => {
    assert.deepEqual(duelSounds(null, view({ phase: "resolving", fxKey: 3, outcome: outcome() })), []);
  });

  it("plays nothing for the same view twice", () => {
    const v = view({ phase: "resolving", fxKey: 1, outcome: outcome(), fuseLit: 3 });
    assert.deepEqual(duelSounds(v, v), []);
  });

  describe("countdown", () => {
    it("beeps count on 3, 2 and 1, and go on GO", () => {
      assert.deepEqual(duelSounds(view({ phase: "idle", count: 3 }), view({ phase: "countdown", count: 3 })), ["count"]);
      assert.deepEqual(duelSounds(view({ phase: "countdown", count: 3 }), view({ phase: "countdown", count: 2 })), ["count"]);
      assert.deepEqual(duelSounds(view({ phase: "countdown", count: 2 }), view({ phase: "countdown", count: 1 })), ["count"]);
      assert.deepEqual(duelSounds(view({ phase: "countdown", count: 1 }), view({ phase: "countdown", count: 0 })), ["go"]);
    });

    it("starts again on play again", () => {
      assert.deepEqual(
        duelSounds(view({ phase: "gameOver", result: "lose" }), view({ phase: "countdown", count: 3 })),
        ["count"],
      );
    });
  });

  describe("solo outcomes", () => {
    it("plays right for a right answer", () => {
      assert.deepEqual(resolved(outcome()), ["right"]);
    });

    it("plays comeback for a comeback", () => {
      assert.deepEqual(resolved(outcome({ comeback: true })), ["comeback"]);
    });

    it("plays stageClear for a stage clear, over a comeback", () => {
      assert.deepEqual(resolved(outcome({ stageCleared: true })), ["stageClear"]);
      assert.deepEqual(resolved(outcome({ stageCleared: true, comeback: true })), ["stageClear"]);
    });

    it("plays heartBreak for a wrong answer and for a timeout", () => {
      assert.deepEqual(resolved(outcome({ loser: "you", reason: "wrong", points: 0 })), ["heartBreak"]);
      assert.deepEqual(resolved(outcome({ loser: "you", reason: "timeout", points: 0 })), ["heartBreak"]);
    });

    it("plays an outcome once, not again while it shows", () => {
      const showing = view({ phase: "resolving", fxKey: 1, outcome: outcome() });
      assert.deepEqual(duelSounds(showing, { ...showing, fuseLit: 20 }), []);
    });
  });

  describe("versus outcomes", () => {
    it("plays right when you were first", () => {
      assert.deepEqual(resolved(outcome({ loser: "rival" }), true), ["right"]);
    });

    it("plays rivalHit when the rival was first", () => {
      assert.deepEqual(resolved(outcome({ loser: "you", points: 0 }), true), ["rivalHit"]);
    });

    it("plays nothing when nobody was right in time", () => {
      assert.deepEqual(resolved(outcome({ loser: null, reason: "timeout", points: 0 }), true), []);
      assert.deepEqual(resolved(outcome({ loser: null, reason: "wrong", points: 0 }), true), []);
    });

    it("plays wrong when a wrong answer locks you out", () => {
      assert.deepEqual(duelSounds(view({ versus: true }), view({ versus: true, lockedOut: true })), ["wrong"]);
      assert.deepEqual(duelSounds(view({ versus: true, lockedOut: true }), view({ versus: true, lockedOut: true })), []);
    });
  });

  describe("fuse ticks", () => {
    it("ticks on each drop to 5 down to 1 while playing", () => {
      for (let lit = 5; lit >= 1; lit--) {
        assert.deepEqual(duelSounds(view({ fuseLit: lit + 1 }), view({ fuseLit: lit })), ["tick"], `to ${lit}`);
      }
    });

    it("doesn't tick above 5, at 0, or on a refill", () => {
      assert.deepEqual(duelSounds(view({ fuseLit: 7 }), view({ fuseLit: 6 })), []);
      assert.deepEqual(duelSounds(view({ fuseLit: 1 }), view({ fuseLit: 0 })), []);
      assert.deepEqual(duelSounds(view({ phase: "resolving", fuseLit: 3 }), view({ fuseLit: 20 })), []);
    });

    it("doesn't tick outside playing", () => {
      assert.deepEqual(duelSounds(view({ phase: "resolving", fuseLit: 4 }), view({ phase: "resolving", fuseLit: 3 })), []);
    });

    it("ticks in versus too, locked out or not", () => {
      assert.deepEqual(
        duelSounds(view({ versus: true, lockedOut: true, fuseLit: 4 }), view({ versus: true, lockedOut: true, fuseLit: 3 })),
        ["tick"],
      );
    });
  });

  describe("game over", () => {
    const over = (result: "win" | "lose", versus = false) =>
      duelSounds(
        view({ versus, phase: "resolving", fxKey: 4, outcome: outcome({ gameOver: true }) }),
        view({ versus, phase: "gameOver", fxKey: 4, outcome: outcome({ gameOver: true }), result }),
      );

    it("plays win on a new best or a versus win", () => {
      assert.deepEqual(over("win"), ["win"]);
      assert.deepEqual(over("win", true), ["win"]);
    });

    it("plays lose otherwise", () => {
      assert.deepEqual(over("lose"), ["lose"]);
      assert.deepEqual(over("lose", true), ["lose"]);
    });

    it("plays once", () => {
      const v = view({ phase: "gameOver", result: "lose" });
      assert.deepEqual(duelSounds(v, v), []);
    });
  });
});
