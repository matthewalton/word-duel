/**
 * Gives new pack entries an `id` and `kind` (ADR 0007). Only fills entries
 * that have none: existing ids are never changed, because word history points
 * at them. Run after adding words or gap sentences, then check the new ids
 * (and add `tests` to new gaps by hand):
 *
 *   pnpm packs:ids
 *
 * Word ids are `<target>.<first base answer>` (눈.eye, 눈.snow), with spaces in
 * the target as hyphens (el-gato.cat); gap ids are
 * `gap.<key words of the translation>` (gap.cat-sleeping). A clash gets a
 * numeric suffix.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PACKS_DIR, readJson, writeEntries } from "./pack-json.mts";

type Entry = Record<string, unknown>;

const STOPWORDS = new Set(["a", "an", "the", "i", "am", "is", "are", "there", "this", "to", "at", "in", "with", "and"]);

const slug = (words: string[]) =>
  words
    .join("-")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

const files: { name: string; kind: string; makeId: (e: Entry) => string }[] = [
  { name: "words.json", kind: "word", makeId: (e) => `${String(e.target).replace(/\s+/g, "-")}.${slug([(e.base as string[])[0]])}` },
  { name: "grammar.json", kind: "grammar", makeId: (e) => `grammar.${slug([e.base as string])}` },
  {
    name: "gaps.json",
    kind: "gap",
    makeId: (e) => {
      const words = (e.translation as string).toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
      return `gap.${slug(words.filter((w) => !STOPWORDS.has(w)))}`;
    },
  },
];

for (const pack of readdirSync(PACKS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const loaded = files
    .map((f) => ({ ...f, path: join(PACKS_DIR, pack.name, f.name) }))
    .filter((f) => existsSync(f.path))
    .map((f) => ({ ...f, entries: readJson(f.path) as Entry[] }));

  const taken = new Set(loaded.flatMap((f) => f.entries.map((e) => e.id).filter(Boolean)));
  for (const f of loaded) {
    let added = 0;
    const entries = f.entries.map((e) => {
      if (e.id) return e;
      const base = f.makeId(e);
      let id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
      taken.add(id);
      added++;
      return { id, kind: f.kind, ...e };
    });
    if (added) {
      writeEntries(f.path, entries);
      console.log(`${pack.name}/${f.name}: added ${added} id(s)`);
    }
  }
}
