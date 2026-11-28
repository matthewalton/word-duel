/*
 * Writes the Anki export as an `.apkg` deck: a zip holding `collection.anki2`
 * (a legacy schema-11 Anki collection in SQLite, which every Anki client
 * imports) and an empty `media` list.
 *
 * The schema and the default collection, deck options and note type JSON are
 * ported from the Python genanki (https://github.com/kerrickstaley/genanki),
 * under its MIT licence:
 *
 * The MIT License
 *
 * Copyright (c) 2017 Kerrick Staley.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import JSZip from "jszip";
import type { SqlJsStatic } from "sql.js";
import { GAME_NAME } from "../config/game.ts";
import { fill, strings } from "../i18n/strings.ts";
import { GAP_MARKER, type LanguagePack } from "../packs/types.ts";
import { ankiCards, ankiDeckName, gameSlug, localDate, type ExportEntry } from "./ankiExport.ts";

/**
 * The two note types' ids, shared by every pack so a re-import reuses them
 * instead of adding copies. Chosen once in 2^30..2^31 (as genanki
 * recommends): never change them, even if the fields or templates change.
 */
export const ITEM_NOTE_TYPE_ID = 1734062917;
export const GAP_NOTE_TYPE_ID = 1734062918;

/** A pack's deck id, from its pack id so renaming the language keeps the deck. */
export function ankiDeckId(pack: LanguagePack): number {
  // FNV-1a, 32-bit, over the UTF-8 bytes.
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(`${gameSlug}:deck:${pack.meta.id}`)) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return 2 ** 30 + (hash % 2 ** 30);
}

const SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null,
  ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null,
  models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null,
  usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null,
  flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null,
  mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null,
  ivl integer not null, factor integer not null, reps integer not null, lapses integer not null,
  left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null,
  ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null,
  type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`;

const COLLECTION_CONF = {
  activeDecks: [1],
  addToCur: true,
  collapseTime: 1200,
  curDeck: 1,
  curModel: "1425279151691",
  dueCounts: true,
  estTimes: true,
  newBury: true,
  newSpread: 0,
  nextPos: 1,
  sortBackwards: false,
  sortType: "noteFld",
  timeLim: 0,
};

const DEFAULT_DECK = {
  collapsed: false,
  conf: 1,
  desc: "",
  dyn: 0,
  extendNew: 10,
  extendRev: 50,
  id: 1,
  lrnToday: [0, 0],
  mod: 1425279151,
  name: "Default",
  newToday: [0, 0],
  revToday: [0, 0],
  timeToday: [0, 0],
  usn: 0,
};

const DECK_OPTIONS = {
  "1": {
    autoplay: true,
    id: 1,
    lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
    maxTaken: 60,
    mod: 0,
    name: "Default",
    new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20, separate: true },
    replayq: true,
    rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 100 },
    timer: 0,
    usn: 0,
  },
};

const LATEX_PRE =
  "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n" +
  "\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n";
const LATEX_POST = "\\end{document}";

// Plain and not language-specific: the system font, and Anki's own colours
// so its night mode still works. Pack fonts stay in the game (ADR 0003).
const CSS = `.card { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 20px; line-height: 1.5; text-align: center; }
.front { font-size: 2em; }
.text { font-size: 1.5em; }
.translation, .extra { font-size: 0.9em; opacity: 0.7; }
.translation { margin-top: 0.5em; }
.cloze { font-weight: bold; color: blue; }
.nightMode .cloze { color: lightblue; }`;

const CLOZE_FRONT = "<div class=text>{{cloze:Text}}</div><div class=translation>{{Translation}}</div>";

type Template = { name: string; qfmt: string; afmt: string };

function noteType(id: number, name: string, type: 0 | 1, fields: string[], tmpl: Template, mod: number, did: number) {
  return {
    id,
    name,
    type,
    mod,
    usn: -1,
    sortf: 0,
    did,
    tmpls: [{ ...tmpl, ord: 0, bqfmt: "", bafmt: "", did: null }],
    flds: fields.map((f, ord) => ({ name: f, ord, font: "Liberation Sans", size: 20, rtl: false, sticky: false, media: [] })),
    css: CSS,
    latexPre: LATEX_PRE,
    latexPost: LATEX_POST,
    latexsvg: false,
    tags: [],
    vers: [],
    // Card 0 exists when field 0 isn't empty (Anki ignores this for cloze types).
    req: [[0, "any", [0]]],
  };
}

/** Pack text on one line: tabs and line breaks become one space, trimmed. */
const flat = (text: string) => text.replace(/[\t\r\n]+/g, " ").trim();

/** Plain text, HTML-escaped. */
function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Pack text as an HTML field. */
const html = (text: string) => escape(flat(text));

/** A field as Anki sorts and checksums it: tags stripped and our escapes undone. */
function plain(field: string): string {
  return field
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** Anki's duplicate-check checksum: the first 8 hex digits of the field's SHA-1, as a number. */
async function checksum(field: string): Promise<number> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(field)));
  return ((digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0;
}

/** The card ords a cloze note makes: one per distinct cloze number (c1 → 0), as genanki's `_cloze_cards`. */
function clozeOrds(text: string): number[] {
  const ords = new Set<number>();
  for (const [, n] of text.matchAll(/\{\{c(\d+)::[\s\S]+?\}\}/g)) if (Number(n) > 0) ords.add(Number(n) - 1);
  return ords.size ? [...ords].sort((a, b) => a - b) : [0];
}

/**
 * The `.apkg` bytes for the MISSED tab's entries: item cards on the
 * `<game name>` note type and gap cards on `<game name> Cloze`, in the deck
 * `<game name>::<target language>`. `SQL` is an initialised sql.js, brought
 * by the caller so the browser and the tests each load their own.
 */
export async function buildApkg(
  pack: LanguagePack,
  entries: readonly ExportEntry[],
  now: Date,
  SQL: SqlJsStatic,
): Promise<Uint8Array> {
  const { items, gaps } = ankiCards(pack, entries);
  const ms = now.getTime();
  const secs = Math.floor(ms / 1000);
  const deckId = ankiDeckId(pack);

  const notes = [
    ...items.map((c) => ({ ...c, mid: ITEM_NOTE_TYPE_ID, fields: [html(c.front), html(c.back)] })),
    ...gaps.map((c) => {
      const [before, ...after] = flat(c.sentence).split(GAP_MARKER);
      const text = `${escape(before)}{{c1::${html(c.answer)}}}${escape(after.join(GAP_MARKER))}`;
      return { ...c, mid: GAP_NOTE_TYPE_ID, fields: [text, html(c.translation), html(c.backExtra)] };
    }),
  ];

  const models = {
    [ITEM_NOTE_TYPE_ID]: noteType(
      ITEM_NOTE_TYPE_ID,
      GAME_NAME,
      0,
      ["Front", "Back"],
      { name: "Card 1", qfmt: "<div class=front>{{Front}}</div>", afmt: "{{FrontSide}}<hr id=answer>{{Back}}" },
      secs,
      deckId,
    ),
    [GAP_NOTE_TYPE_ID]: noteType(
      GAP_NOTE_TYPE_ID,
      fill(strings.wordbook.ankiClozeType, { game: GAME_NAME }),
      1,
      ["Text", "Translation", "Back Extra"],
      { name: "Cloze", qfmt: CLOZE_FRONT, afmt: `${CLOZE_FRONT}<hr id=answer><div class=extra>{{Back Extra}}</div>` },
      secs,
      deckId,
    ),
  };
  const decks = {
    "1": DEFAULT_DECK,
    [deckId]: {
      id: deckId,
      name: ankiDeckName(pack),
      desc: fill(strings.wordbook.ankiDeckDesc, { game: GAME_NAME, date: localDate(now) }),
      mod: secs,
      usn: -1,
      dyn: 0,
      conf: 1,
      collapsed: false,
      extendNew: 0,
      extendRev: 50,
      newToday: [0, 0],
      revToday: [0, 0],
      lrnToday: [0, 0],
      timeToday: [0, 0],
    },
  };

  const db = new SQL.Database();
  try {
    db.run(SCHEMA);
    db.run("INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')", [
      secs,
      ms,
      ms,
      JSON.stringify(COLLECTION_CONF),
      JSON.stringify(models),
      JSON.stringify(decks),
      JSON.stringify(DECK_OPTIONS),
    ]);
    // Note and card ids only need to be unique in the file: Anki matches notes by guid.
    let cardId = ms + notes.length;
    for (const [i, note] of notes.entries()) {
      const noteId = ms + i;
      const sortField = plain(note.fields[0]);
      db.run("INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')", [
        noteId,
        note.guid,
        note.mid,
        secs,
        ` ${note.tags.join(" ")} `,
        note.fields.join("\x1f"),
        sortField,
        await checksum(sortField),
      ]);
      const ords = note.mid === GAP_NOTE_TYPE_ID ? clozeOrds(note.fields[0]) : [0];
      for (const ord of ords) {
        // New cards, due in ORDER.
        db.run("INSERT INTO cards VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')", [
          cardId++,
          noteId,
          deckId,
          ord,
          secs,
          i + 1,
        ]);
      }
    }
    const zip = new JSZip();
    zip.file("collection.anki2", db.export());
    zip.file("media", "{}");
    return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  } finally {
    db.close();
  }
}
