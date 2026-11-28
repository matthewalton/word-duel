/**
 * Unit tests for the sound setting: sound is on unless this browser stored "off".
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { soundOn } from "./soundSetting.ts";

/** A browser whose storage holds this value under every key, or refuses to be read. */
function storing(value: string | null | Error) {
  Object.assign(globalThis, {
    window: {
      localStorage: {
        getItem: () => {
          if (value instanceof Error) throw value;
          return value;
        },
      },
    },
  });
}

describe("soundOn", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("is on when nothing is stored", () => {
    storing(null);
    assert.equal(soundOn(), true);
  });

  it("is on when the stored value is unknown", () => {
    storing("loud");
    assert.equal(soundOn(), true);
  });

  it("is on when storage is blocked", () => {
    storing(new Error("SecurityError"));
    assert.equal(soundOn(), true);
  });

  it("is off when off is stored", () => {
    storing("off");
    assert.equal(soundOn(), false);
  });
});
