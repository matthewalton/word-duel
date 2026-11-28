/**
 * Unit tests for the Anki export of the Wordbook's MISSED tab (#73).
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPack } from "../packs/index.ts";
import type { LanguagePack } from "../packs/types.ts";
import { ankiExport, type ExportEntry } from "./ankiExport.ts";

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

const missed = (itemId: string, kinds: ExportEntry["kinds"] = [{ kind: "toTarget", wrong: 1, timeouts: 0 }]) => ({
  itemId,
  kinds,
});
const now = new Date(2026, 10, 28, 23, 30);
const rows = (entries: ExportEntry[], p = pack) => ankiExport(p, entries, now).text.split("\n").slice(7, -1);

describe("ankiExport", () => {
  it("starts with the header lines and ends with a newline", () => {
    const { text } = ankiExport(pack, [missed("불.fire")], now);
    assert.deepEqual(text.split("\n").slice(0, 7), [
      "#separator:tab",
      "#html:false",
      "#notetype:Basic",
      "#deck:Word Duel::Korean",
      "#columns:Guid\tFront\tBack\tTags",
      "#guid column:1",
      "#tags column:4",
    ]);
    assert.ok(text.endsWith("\n") && !text.endsWith("\n\n"));
    assert.ok(!text.includes("\r"));
  });

  it("names the file after the pack and the local date", () => {
    assert.equal(ankiExport(pack, [], now).fileName, "word-duel-ko-en-missed-2026-11-28.txt");
    assert.equal(ankiExport(pack, [], new Date(2027, 0, 5, 0, 1)).fileName, "word-duel-ko-en-missed-2027-01-05.txt");
  });

  it("puts every accepted answer of a word on the back, without the other target spellings", () => {
    assert.deepEqual(rows([missed("불.fire"), missed("물.water")]), [
      "wd:ko-en:불.fire\t불\tfire; light\tword-duel::ko-en word-duel::tier-1",
      "wd:ko-en:물.water\t물\twater\tword-duel::ko-en word-duel::tier-2",
    ]);
  });

  it("puts a grammar item's description on the back", () => {
    assert.deepEqual(rows([missed("grammar.subject")]), [
      "wd:ko-en:grammar.subject\t이/가\tsubject particle\tword-duel::ko-en word-duel::tier-2",
    ]);
  });

  it("keeps the given order", () => {
    const ids = (entries: ExportEntry[]) => rows(entries).map((r) => r.split("\t")[0]);
    assert.deepEqual(ids([missed("물.water"), missed("불.fire")]), ["wd:ko-en:물.water", "wd:ko-en:불.fire"]);
    assert.deepEqual(ids([missed("불.fire"), missed("물.water")]), ["wd:ko-en:불.fire", "wd:ko-en:물.water"]);
  });

  it("skips items the pack doesn't know, and keeps retired ones", () => {
    const ids = rows([missed("gone.item"), missed("old.word")]).map((r) => r.split("\t")[0]);
    assert.deepEqual(ids, ["wd:ko-en:old.word"]);
  });

  it("adds gap cards after the item cards, only for items missed in the gap prompt kind, skipping retired sentences", () => {
    const gapMiss = missed("grammar.subject", [
      { kind: "toTarget", wrong: 2, timeouts: 0 },
      { kind: "gap", wrong: 0, timeouts: 1 },
    ]);
    assert.deepEqual(rows([gapMiss, missed("불.fire")]), [
      "wd:ko-en:grammar.subject\t이/가\tsubject particle\tword-duel::ko-en word-duel::tier-2",
      "wd:ko-en:불.fire\t불\tfire; light\tword-duel::ko-en word-duel::tier-1",
      "wd:ko-en:gap.cat\t고양이___ 자요. (The cat is sleeping.)\t가 — 고양이가 자요.\tword-duel::ko-en word-duel::tier-2 word-duel::gap",
      "wd:ko-en:gap.sky\t하늘___ 파래요. (The sky is blue.)\t이 — 하늘이 파래요.\tword-duel::ko-en word-duel::tier-2 word-duel::gap",
    ]);
  });

  it("adds no gap cards when the gap prompt kind has only right answers", () => {
    const rightInGap = missed("grammar.subject", [
      { kind: "toTarget", wrong: 1, timeouts: 0 },
      { kind: "gap", wrong: 0, timeouts: 0 },
    ]);
    assert.equal(rows([rightInGap]).length, 1);
  });

  it("keeps tags free of spaces", () => {
    for (const row of rows([missed("grammar.subject", [{ kind: "gap", wrong: 1, timeouts: 0 }])])) {
      for (const tag of row.split("\t")[3].split(" ")) assert.match(tag, /^word-duel::\S+$/);
    }
  });

  it("flattens tabs and line breaks, and quotes fields with a quote or a leading #", () => {
    const odd: LanguagePack = {
      ...pack,
      words: [
        { id: "a", kind: "word", target: "가\t나\r\n다 ", base: ['say "hi"'], tier: 1 },
        { id: "b", kind: "word", target: "#해시", base: ["a#b"], tier: 1 },
      ],
    };
    assert.deepEqual(rows([missed("a"), missed("b")], odd), [
      'wd:ko-en:a\t가 나 다\t"say ""hi"""\tword-duel::ko-en word-duel::tier-1',
      'wd:ko-en:b\t"#해시"\ta#b\tword-duel::ko-en word-duel::tier-1',
    ]);
  });

  it("is just the header for no entries", () => {
    assert.equal(ankiExport(pack, [], now).text.split("\n").length, 8);
  });
});
