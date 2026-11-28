/**
 * Validates every language pack in `src/packs/` (ADR 0007):
 *
 * - each file matches its schema (`src/packs/schema.ts`), with no unknown
 *   fields, exactly one blank per gap sentence, exactly three different options per
 *   gap and the answer among them;
 * - ids are unique across the whole pack;
 * - every prompt's `tests` names an item (word or grammar), and a prompt that
 *   is still asked doesn't test a retired item;
 * - no word's main meaning is the bare form of another's clarified one
 *   ("to work" next to "to work (function)"): if two words share a meaning
 *   with different senses, both name their sense.
 *
 *   pnpm check:packs
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { normalizeAnswer, withoutClarifier } from "../src/lib/matching.ts";
import { askableWords } from "../src/packs/index.ts";
import { languagePackSchema } from "../src/packs/schema.ts";
import type { WordItem } from "../src/packs/types.ts";
import { PACKS_DIR, readJson } from "./pack-json.mts";

const FILES = ["meta", "words", "grammar", "gaps", "feedback", "matching"] as const;

let failed = false;
const fail = (pack: string, message: string) => {
  failed = true;
  console.error(`✗ ${pack}: ${message}`);
};

for (const dir of readdirSync(PACKS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const name = dir.name;
  const raw: Record<string, unknown> = {};
  for (const file of FILES) {
    const path = join(PACKS_DIR, name, `${file}.json`);
    if (existsSync(path)) raw[file] = readJson(path);
    else fail(name, `missing ${file}.json`);
  }

  const parsed = languagePackSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [file, index, ...rest] = issue.path;
      const entry = typeof index === "number" ? (raw[file as string] as { id?: string }[])[index] : undefined;
      const where = [`${String(file)}.json`, typeof index === "number" ? `[${index}]${entry?.id ? ` ${entry.id}` : ""}` : index, ...rest]
        .filter((p) => p !== undefined)
        .join(" ");
      fail(name, `${where}: ${issue.message}`);
    }
    continue;
  }

  const pack = parsed.data;
  if (pack.meta.id !== name) fail(name, `meta.json id "${pack.meta.id}" doesn't match the folder name`);

  const seen = new Map<string, string>();
  const entries = [
    ...pack.words.map((e) => ["words", e] as const),
    ...pack.grammar.map((e) => ["grammar", e] as const),
    ...pack.gaps.map((e) => ["gaps", e] as const),
  ];
  for (const [file, e] of entries) {
    const first = seen.get(e.id);
    if (first) fail(name, `duplicate id "${e.id}" in ${first}.json and ${file}.json`);
    else seen.set(e.id, file);
  }

  const items = new Map([...pack.words, ...pack.grammar].map((i) => [i.id, i]));
  for (const gap of pack.gaps) {
    const item = items.get(gap.tests);
    if (!item) fail(name, `gaps.json ${gap.id}: tests "${gap.tests}", which is not an item`);
    else if (item.retired && !gap.retired) fail(name, `gaps.json ${gap.id}: tests retired item "${gap.tests}"`);
  }

  // Keyed like Word Strike's prompt cards, so "to sleep" and "sleep" stay apart.
  const key = (text: string) => normalizeAnswer(text, pack.matching, pack.meta.base.code, { keepWordClassMarkers: true });
  const isBare = (w: WordItem) => withoutClarifier(w.base[0]) === w.base[0];
  const words = askableWords(pack);
  const bare = new Map(words.filter(isBare).map((w) => [key(w.base[0]), w]));
  for (const w of words.filter((w) => !isBare(w))) {
    const other = bare.get(key(withoutClarifier(w.base[0])));
    if (other) {
      fail(name, `words.json ${other.id}: "${other.base[0]}" needs a clarifier, as ${w.id} is "${w.base[0]}"`);
    }
  }

  if (!failed) {
    console.log(`✓ ${name}: ${pack.words.length} words, ${pack.grammar.length} grammar items, ${pack.gaps.length} gaps`);
  }
}

if (failed) process.exit(1);
