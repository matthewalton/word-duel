/**
 * Builds a real `.apkg` in Node and reads it back the way Anki would: unzip,
 * open `collection.anki2` with sql.js, query its rows (#116).
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { before, describe, it } from "node:test";
import JSZip from "jszip";
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from "sql.js";
import { getPack } from "../packs/index.ts";
import type { LanguagePack } from "../packs/types.ts";
import type { ExportEntry } from "./ankiExport.ts";
import { ankiDeckId, buildApkg, GAP_NOTE_TYPE_ID, ITEM_NOTE_TYPE_ID } from "./ankiPackage.ts";

const pack: LanguagePack = {
  ...getPack("ko-en"),
  words: [
    { id: "불.fire", kind: "word", target: "불", base: ["fire", "light"], tier: 1 },
    { id: "odd", kind: "word", target: "<b>\t가&나", base: ['say "hi"\n'], tier: 3 },
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
  ],
};

const entries: ExportEntry[] = [
  { itemId: "grammar.subject", kinds: [{ kind: "gap", right: 0, wrong: 1, timeouts: 0 }] },
  { itemId: "불.fire", kinds: [{ kind: "toTarget", right: 0, wrong: 0, timeouts: 2 }] },
  { itemId: "odd", kinds: [{ kind: "toBase", right: 1, wrong: 1, timeouts: 0 }] },
];

const now = new Date(2026, 10, 28, 12, 0);
let SQL: SqlJsStatic;

before(async () => {
  SQL = await initSqlJs();
});

async function open(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const collection = await zip.file("collection.anki2")?.async("uint8array");
  assert.ok(collection, "collection.anki2 is in the zip");
  return { zip, db: new SQL.Database(collection) };
}

function rows(db: Database, sql: string): Record<string, SqlValue>[] {
  const [result] = db.exec(sql);
  if (!result) return [];
  return result.values.map((v) => Object.fromEntries(result.columns.map((c, i) => [c, v[i]])));
}

function col(db: Database) {
  const [row] = rows(db, "SELECT * FROM col");
  return {
    ver: row.ver,
    models: JSON.parse(String(row.models)),
    decks: JSON.parse(String(row.decks)),
  };
}

describe("buildApkg", () => {
  it("zips collection.anki2 and an empty media list", async () => {
    const { zip, db } = await open(await buildApkg(pack, entries, now, SQL));
    assert.deepEqual(Object.keys(zip.files).sort(), ["collection.anki2", "media"]);
    assert.equal(await zip.file("media")?.async("string"), "{}");
    assert.equal(col(db).ver, 11);
    db.close();
  });

  it("writes item notes in order, then the gap note, with escaped HTML fields and padded tags", async () => {
    const { db } = await open(await buildApkg(pack, entries, now, SQL));
    const notes = rows(db, "SELECT guid, mid, flds, tags FROM notes ORDER BY id");
    assert.deepEqual(notes, [
      {
        guid: "wd:ko-en:grammar.subject",
        mid: ITEM_NOTE_TYPE_ID,
        flds: "이/가\x1fsubject particle",
        tags: " word-duel::ko-en word-duel::tier-2 ",
      },
      {
        guid: "wd:ko-en:불.fire",
        mid: ITEM_NOTE_TYPE_ID,
        flds: "불\x1ffire; light",
        tags: " word-duel::ko-en word-duel::tier-1 ",
      },
      {
        guid: "wd:ko-en:odd",
        mid: ITEM_NOTE_TYPE_ID,
        flds: "&lt;b&gt; 가&amp;나\x1fsay &quot;hi&quot;",
        tags: " word-duel::ko-en word-duel::tier-3 ",
      },
      {
        guid: "wd:ko-en:gap.cat",
        mid: GAP_NOTE_TYPE_ID,
        flds: "고양이{{c1::가}} 자요.\x1fThe cat is sleeping.\x1f이/가 — subject particle",
        tags: " word-duel::ko-en word-duel::tier-2 word-duel::gap ",
      },
    ]);
    db.close();
  });

  it("sets each note's sort field and checksum from its first field, tags stripped", async () => {
    const { db } = await open(await buildApkg(pack, entries, now, SQL));
    const expected = ["이/가", "불", "<b> 가&나", "고양이{{c1::가}} 자요."];
    const notes = rows(db, "SELECT sfld, csum FROM notes ORDER BY id");
    assert.deepEqual(
      notes.map((n) => n.sfld),
      expected,
    );
    for (const [i, n] of notes.entries()) {
      const sha1 = createHash("sha1").update(expected[i], "utf8").digest("hex");
      assert.equal(n.csum, parseInt(sha1.slice(0, 8), 16));
    }
    db.close();
  });

  it("makes one new card per note, in the pack's deck, due in order", async () => {
    const { db } = await open(await buildApkg(pack, entries, now, SQL));
    const cards = rows(
      db,
      "SELECT c.ord, c.did, c.type, c.queue, c.due FROM cards c JOIN notes n ON n.id = c.nid ORDER BY n.id",
    );
    const deckId = ankiDeckId(pack);
    assert.deepEqual(cards, [1, 2, 3, 4].map((due) => ({ ord: 0, did: deckId, type: 0, queue: 0, due })));
    const [counts] = rows(
      db,
      "SELECT (SELECT count(DISTINCT id) FROM notes) + (SELECT count(DISTINCT id) FROM cards) AS ids, " +
        "(SELECT count(*) FROM (SELECT id FROM notes UNION SELECT id FROM cards)) AS distinctIds",
    );
    assert.equal(counts.ids, 8);
    assert.equal(counts.distinctIds, 8);
    db.close();
  });

  it("carries the two note types and the pack's deck", async () => {
    const { db } = await open(await buildApkg(pack, entries, now, SQL));
    const { models, decks } = col(db);
    assert.deepEqual(Object.keys(models).sort(), [String(ITEM_NOTE_TYPE_ID), String(GAP_NOTE_TYPE_ID)].sort());
    const item = models[ITEM_NOTE_TYPE_ID];
    const gap = models[GAP_NOTE_TYPE_ID];
    assert.deepEqual([item.id, item.name, item.type], [ITEM_NOTE_TYPE_ID, "Word Duel", 0]);
    assert.deepEqual([gap.id, gap.name, gap.type], [GAP_NOTE_TYPE_ID, "Word Duel Cloze", 1]);
    assert.deepEqual(
      item.flds.map((f: { name: string }) => f.name),
      ["Front", "Back"],
    );
    assert.deepEqual(
      gap.flds.map((f: { name: string }) => f.name),
      ["Text", "Translation", "Back Extra"],
    );
    assert.match(gap.tmpls[0].qfmt, /\{\{cloze:Text\}\}/);

    const deckId = ankiDeckId(pack);
    assert.ok(deckId >= 2 ** 30 && deckId < 2 ** 31);
    assert.deepEqual(Object.keys(decks).sort(), ["1", String(deckId)].sort());
    assert.equal(decks[deckId].id, deckId);
    assert.equal(decks[deckId].name, "Word Duel::Korean");
    assert.equal(decks[deckId].desc, "Missed words from Word Duel, exported 2026-11-28.");
    db.close();
  });

  it("makes a cloze card per distinct cloze number", async () => {
    const twoClozes: LanguagePack = {
      ...pack,
      gaps: [{ ...pack.gaps[0], sentence: "{{c2::고양이}}___ 자요." }],
    };
    const { db } = await open(await buildApkg(twoClozes, entries.slice(0, 1), now, SQL));
    const ords = rows(db, `SELECT c.ord FROM cards c JOIN notes n ON n.id = c.nid WHERE n.mid = ${GAP_NOTE_TYPE_ID}`);
    assert.deepEqual(
      ords.map((r) => r.ord),
      [0, 1],
    );
    db.close();
  });

  it("keeps guids, note type ids and the deck id across exports on different dates", async () => {
    const ids = async (date: Date) => {
      const { db } = await open(await buildApkg(pack, entries, date, SQL));
      const { models, decks } = col(db);
      const result = {
        guids: rows(db, "SELECT guid, mid FROM notes ORDER BY id"),
        models: Object.keys(models).sort(),
        decks: Object.keys(decks).sort(),
      };
      db.close();
      return result;
    };
    assert.deepEqual(await ids(now), await ids(new Date(2027, 2, 3, 9, 15)));
  });
});
