/** Reading and writing pack JSON files in their one-entry-per-line layout. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PACKS_DIR = join(import.meta.dirname, "..", "src", "packs");

export function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Envelope keys first, then the payload in its existing order, `retired` last. */
const FIRST = ["id", "kind", "tests"];

function inline(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
  return JSON.stringify(value);
}

function line(entry: Record<string, unknown>): string {
  const keys = Object.keys(entry);
  const ordered = [
    ...FIRST.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !FIRST.includes(k) && k !== "retired"),
    ...(keys.includes("retired") ? ["retired"] : []),
  ];
  return `{ ${ordered.map((k) => `${JSON.stringify(k)}: ${inline(entry[k])}`).join(", ")} }`;
}

/** Writes an array of entries with one entry per line, so diffs stay readable. */
export function writeEntries(file: string, entries: Record<string, unknown>[]): void {
  writeFileSync(file, `[\n${entries.map((e) => `  ${line(e)}`).join(",\n")}\n]\n`);
}
