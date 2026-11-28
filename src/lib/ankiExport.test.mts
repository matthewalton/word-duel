/**
 * Unit tests for the Anki export's cards and names (#73, #116).
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPack } from "../packs/index.ts";
import type { LanguagePack } from "../packs/types.ts";
import { ankiCards, ankiDeckName, ankiFileName, type ExportEntry } from "./ankiExport.ts";

const pack: LanguagePack = {
  ...getPack("ko-en"),
  words: [
    { id: "불.fire", kind: "word", target: "불", base: ["fire", "light"], tier: 1 },
    { id: "물.water", kind: "word", target: "물", targetAlt: ["믈"], base: ["water"], tier: 2 },
    { id: "old.word", kind: "word", target: "옛", base: ["old"], tier: 3, retired: true },
  ],
  grammar: [{ id: "grammar.subject", kind: "grammar", target: "이/가", base: "subject particle", tier: 2 }],
  gaps: [
    {
      id: "gap.cat",
      kind: "gap",
      tests: "grammar.subject",
      sentence: "고양이___ 자요.",
      translation: "The cat is sleeping.",
      answer: "가",
      options: ["가", "이", "를"],
    },
    {
      id: "gap.retired",
      kind: "gap",
      tests: "grammar.subject",
      sentence: "꽃___ 예뻐요.",
      translation: "The flower is pretty.",
      answer: "이",
      options: ["이", "가", "을"],
      retired: true,
    },
    {
      id: "gap.sky",
      kind: "gap",
      tests: "grammar.subject",
      sentence: "하늘___ 파래요.",
      translation: "The sky is blue.",
      answer: "이",
      options: ["이", "가", "을"],
    },
  ],
};

const missed = (itemId: string, kinds: ExportEntry["kinds"] = [{ kind: "toTarget", right: 0, wrong: 1, timeouts: 0 }]) => ({
  itemId,
  kinds,
});
const gapMiss = (itemId: string) =>
  missed(itemId, [
    { kind: "toTarget", right: 0, wrong: 2, timeouts: 0 },
    { kind: "gap", right: 0, wrong: 0, timeouts: 1 },
  ]);
const guids = (entries: ExportEntry[], p = pack) => {
  const { items, gaps } = ankiCards(p, entries);
  return [...items, ...gaps].map((c) => c.guid);
};

describe("ankiCards", () => {
  it("puts every accepted answer of a word on the back, without the other target spellings", () => {
    assert.deepEqual(ankiCards(pack, [missed("불.fire"), missed("물.water")]).items, [
      { guid: "wd:ko-en:불.fire", front: "불", back: "fire; light", tags: ["word-duel::ko-en", "word-duel::tier-1"] },
      { guid: "wd:ko-en:물.water", front: "물", back: "water", tags: ["word-duel::ko-en", "word-duel::tier-2"] },
    ]);
  });

  it("puts a grammar item's description on the back", () => {
    assert.deepEqual(ankiCards(pack, [missed("grammar.subject")]), {
      items: [
        {
          guid: "wd:ko-en:grammar.subject",
          front: "이/가",
          back: "subject particle",
          tags: ["word-duel::ko-en", "word-duel::tier-2"],
        },
      ],
      gaps: [],
    });
  });

  it("keeps the given order", () => {
    assert.deepEqual(guids([missed("물.water"), missed("불.fire")]), ["wd:ko-en:물.water", "wd:ko-en:불.fire"]);
    assert.deepEqual(guids([missed("불.fire"), missed("물.water")]), ["wd:ko-en:불.fire", "wd:ko-en:물.water"]);
  });

  it("skips items the pack doesn't know, and keeps retired ones", () => {
    assert.deepEqual(guids([missed("gone.item"), missed("old.word")]), ["wd:ko-en:old.word"]);
  });

  it("adds gap cards after the item cards, only for items missed in the gap prompt kind, skipping retired sentences", () => {
    const { items, gaps } = ankiCards(pack, [gapMiss("grammar.subject"), missed("불.fire")]);
    assert.deepEqual(
      items.map((c) => c.guid),
      ["wd:ko-en:grammar.subject", "wd:ko-en:불.fire"],
    );
    assert.deepEqual(gaps, [
      {
        guid: "wd:ko-en:gap.cat",
        sentence: "고양이___ 자요.",
        answer: "가",
        translation: "The cat is sleeping.",
        backExtra: "이/가 — subject particle",
        tags: ["word-duel::ko-en", "word-duel::tier-2", "word-duel::gap"],
      },
      {
        guid: "wd:ko-en:gap.sky",
        sentence: "하늘___ 파래요.",
        answer: "이",
        translation: "The sky is blue.",
        backExtra: "이/가 — subject particle",
        tags: ["word-duel::ko-en", "word-duel::tier-2", "word-duel::gap"],
      },
    ]);
  });

  it("gives a gap card its item's tier, and a word's answers in Back Extra", () => {
    const withWordGap: LanguagePack = {
      ...pack,
      gaps: [{ id: "gap.fire", kind: "gap", tests: "불.fire", sentence: "___이 났어요.", translation: "There's a fire.", answer: "불", options: ["불", "물", "옛"] }],
    };
    const [gap] = ankiCards(withWordGap, [gapMiss("불.fire")]).gaps;
    assert.equal(gap.backExtra, "불 — fire; light");
    assert.deepEqual(gap.tags, ["word-duel::ko-en", "word-duel::tier-1", "word-duel::gap"]);
  });

  it("adds no gap cards when the gap prompt kind has only right answers", () => {
    const rightInGap = missed("grammar.subject", [
      { kind: "toTarget", right: 0, wrong: 1, timeouts: 0 },
      { kind: "gap", right: 3, wrong: 0, timeouts: 0 },
    ]);
    assert.deepEqual(ankiCards(pack, [rightInGap]).gaps, []);
  });

  it("skips a gap sentence whose answer would break the cloze marker", () => {
    const unsafe = (answer: string): LanguagePack => ({
      ...pack,
      gaps: [{ ...pack.gaps[0], answer, options: [answer, "이", "를"] }],
    });
    for (const answer of ["a::b", "{{a", "a}}", "a}"]) {
      assert.deepEqual(ankiCards(unsafe(answer), [gapMiss("grammar.subject")]).gaps, [], answer);
    }
    assert.equal(ankiCards(unsafe("a:b {c"), [gapMiss("grammar.subject")]).gaps.length, 1);
  });

  it("keeps tags free of spaces", () => {
    const { items, gaps } = ankiCards(pack, [gapMiss("grammar.subject"), missed("불.fire")]);
    for (const tag of [...items, ...gaps].flatMap((c) => c.tags)) assert.match(tag, /^word-duel::\S+$/);
  });

  it("is empty for no entries", () => {
    assert.deepEqual(ankiCards(pack, []), { items: [], gaps: [] });
  });
});

describe("ankiFileName and ankiDeckName", () => {
  it("names the file after the pack and the local date", () => {
    assert.equal(ankiFileName(pack, new Date(2026, 10, 28, 23, 30)), "word-duel-ko-en-missed-2026-11-28.apkg");
    assert.equal(ankiFileName(pack, new Date(2027, 0, 5, 0, 1)), "word-duel-ko-en-missed-2027-01-05.apkg");
  });

  it("puts each pack in a subdeck under the game's name", () => {
    assert.equal(ankiDeckName(pack), "Word Duel::Korean");
  });
});
