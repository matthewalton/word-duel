/**
 * Unit tests for what a versus room deals and how it judges answers (ADR 0012),
 * run against the real packs.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_TIER, VERSUS } from "../config/game.ts";
import { askableGaps, askableWords, getPack, itemTier, listPacks } from "../packs/index.ts";
import type { LanguagePack } from "../packs/types.ts";
import { canDeal, dealDraw, isRightAnswer, roomRound, type RoomSettings } from "./versusRounds.ts";

const gapRoom: RoomSettings = { minigame: "gap-guard", direction: "toTarget", difficulty: "easy" };
const wordRoom: RoomSettings = { minigame: "word-strike", direction: "toTarget", difficulty: "easy" };
const byOption = (option: string) => option;
const reversed = (option: string) => [...option].reverse().join("");

/** A copy of the pack with every gap sentence retired. */
const withoutGaps = (pack: LanguagePack): LanguagePack => ({
  ...pack,
  gaps: pack.gaps.map((g) => ({ ...g, retired: true })),
});

describe("dealDraw for a Gap Guard room", () => {
  for (const meta of listPacks()) {
    const pack = getPack(meta.id);
    it(`${meta.id}: deals askable gap sentences within the difficulty, one per round`, () => {
      const askable = new Map(askableGaps(pack).map((g) => [g.id, g]));
      for (const difficulty of ["easy", "normal", "hard"] as const) {
        const draw = dealDraw(pack, { ...gapRoom, difficulty });
        assert.equal(draw.length, VERSUS.maxRounds);
        for (const id of draw) {
          const gap = askable.get(id);
          assert.ok(gap, `${id} is an askable gap`);
          assert.ok(itemTier(pack, gap.tests) <= MAX_TIER[difficulty], `${id} is within ${difficulty}`);
        }
      }
    });
  }

  it("deals the whole pool before repeating a gap sentence", () => {
    const pack = getPack("ko-en");
    const pool = askableGaps(pack).filter((g) => itemTier(pack, g.tests) <= MAX_TIER.easy);
    const first = dealDraw(pack, gapRoom).slice(0, pool.length);
    assert.equal(new Set(first).size, pool.length);
  });

  it("Word Strike rooms still deal words", () => {
    const pack = getPack("ko-en");
    const words = new Set(askableWords(pack).map((w) => w.id));
    assert.ok(dealDraw(pack, wordRoom).every((id) => words.has(id)));
  });
});

describe("canDeal", () => {
  it("is true for a pack with gap sentences at the difficulty", () => {
    assert.equal(canDeal(getPack("ko-en"), gapRoom), true);
  });

  it("is false for Gap Guard when every gap sentence is retired, and Word Strike is unaffected", () => {
    const pack = withoutGaps(getPack("ko-en"));
    assert.equal(canDeal(pack, gapRoom), false);
    assert.equal(canDeal(pack, wordRoom), true);
  });
});

describe("roomRound for a Gap Guard room", () => {
  const pack = getPack("ko-en");
  const gap = askableGaps(pack)[0];

  it("shows the gap sentence's options in the order the rank fixes", () => {
    const round = roomRound(pack, gapRoom, gap.id, byOption);
    assert.deepEqual(round.options, gap.options.slice().sort());
    assert.deepEqual(roomRound(pack, gapRoom, gap.id, byOption).options, round.options, "same rank, same order");
    assert.deepEqual(
      new Set(roomRound(pack, gapRoom, gap.id, reversed).options),
      new Set(gap.options),
      "another rank keeps the same options",
    );
  });

  it("asks the gap's tested item, as a gap prompt", () => {
    const round = roomRound(pack, gapRoom, gap.id, byOption);
    assert.equal(round.promptId, gap.id);
    assert.equal(round.itemId, gap.tests);
    assert.equal(round.promptKind, "gap");
  });

  it("still resolves a retired gap sentence", () => {
    assert.equal(roomRound(withoutGaps(pack), gapRoom, gap.id, byOption).promptId, gap.id);
  });

  it("throws on an id that isn't a gap sentence", () => {
    assert.throws(() => roomRound(pack, gapRoom, "no-such-gap", byOption));
  });
});

describe("isRightAnswer on a Gap Guard pick", () => {
  for (const meta of listPacks()) {
    const pack = getPack(meta.id);
    it(`${meta.id}: only the gap's answer is right`, () => {
      for (const gap of askableGaps(pack).slice(0, 20)) {
        const round = roomRound(pack, gapRoom, gap.id, byOption);
        for (const option of round.options ?? []) {
          assert.equal(isRightAnswer(pack, round, option), option === gap.answer, `${gap.id}: ${option}`);
        }
      }
    });
  }
});
