/**
 * Unit tests for the sound bank: every sound is well formed and ends before
 * the duel moves on, so sounds never run into each other.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FUSE_SEGMENTS, RULES } from "../config/game.ts";
import { SOUND_NAMES, SOUNDS, soundLength, type SoundName } from "./soundBank.ts";

/** The pause after each sound's event: the sound must end inside it. */
const LIMITS: Record<SoundName, number> = {
  count: RULES.countdownBeatMs,
  go: RULES.countdownGoMs,
  right: RULES.hitPauseMs,
  comeback: RULES.hitPauseMs,
  stageClear: RULES.stageClearMs,
  heartBreak: RULES.revealMs,
  rivalHit: RULES.revealMs,
  wrong: RULES.revealMs,
  tick: RULES.fuseMinMs / FUSE_SEGMENTS,
  win: 1_000,
  lose: 1_000,
  rivalJoined: 1_000,
};

describe("SOUNDS", () => {
  for (const name of SOUND_NAMES) {
    it(`${name} has well-formed voices`, () => {
      const voices = SOUNDS[name];
      assert.ok(voices.length > 0);
      for (const v of voices) {
        assert.ok(["square", "triangle", "noise"].includes(v.wave));
        if (v.wave !== "noise") {
          assert.ok(v.freq > 0);
          if (v.slideTo != null) assert.ok(v.slideTo > 0);
        }
        assert.ok(v.start >= 0);
        assert.ok(v.length > 0);
        assert.ok(v.level > 0 && v.level <= 1);
      }
    });

    it(`${name} ends before the duel moves on (${soundLength(name)} < ${LIMITS[name]} ms)`, () => {
      assert.ok(soundLength(name) < LIMITS[name]);
    });
  }

  it("rivalHit is a strike, then heartBreak 50 ms later", () => {
    assert.equal(soundLength("rivalHit"), soundLength("heartBreak") + 50);
  });
});
