import { GAME_NAME } from "../config/game.ts";
import { findItem } from "../packs/index.ts";
import { GAP_MARKER, type LanguagePack } from "../packs/types.ts";
import type { WordbookEntry } from "../server/wordbook.ts";

/** What the export needs from a Wordbook entry: the item, and how it was missed per prompt kind. */
export type ExportEntry = Pick<WordbookEntry, "itemId" | "kinds">;

type Card = { id: string; front: string; back: string; tags: string[] };

/** The game's name as it appears in a file name: "Word Duel" → "word-duel". */
const gameSlug = GAME_NAME.toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

/** YYYY-MM-DD in the player's local time. */
function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * One field of a row: tabs and line breaks become a space so the row keeps
 * its four columns; a `"` or a leading `#` would make Anki read a quoted
 * field or a comment, so such a field is quoted with inner quotes doubled.
 */
function field(text: string): string {
  const flat = text.replace(/[\t\r\n]+/g, " ").trim();
  return flat.includes('"') || flat.startsWith("#") ? `"${flat.replace(/"/g, '""')}"` : flat;
}

const missedInGap = (e: ExportEntry) => e.kinds.some((k) => k.kind === "gap" && k.wrong + k.timeouts > 0);

/**
 * The Anki export: the MISSED tab's items as a tab-separated text file Anki
 * imports directly (File › Import), its header lines setting up the import.
 * One item card per missed item the pack knows, in the given order, then a
 * gap card for each non-retired gap sentence testing an item missed in the
 * gap prompt kind. Each card's guid is built from the item or prompt id, which
 * never changes (ADR 0007), so a later export updates the same notes.
 */
export function ankiExport(
  pack: LanguagePack,
  entries: readonly ExportEntry[],
  now: Date,
): { fileName: string; text: string } {
  const packId = pack.meta.id;
  const tagsFor = (tier: number) => [`${gameSlug}::${packId}`, `${gameSlug}::tier-${tier}`];

  const itemCards: Card[] = [];
  const gapCards: Card[] = [];
  for (const entry of entries) {
    const item = findItem(pack, entry.itemId);
    if (!item) continue;
    itemCards.push({
      id: item.id,
      front: item.target,
      back: item.kind === "word" ? item.base.join("; ") : item.base,
      tags: tagsFor(item.tier),
    });
    if (!missedInGap(entry)) continue;
    for (const gap of pack.gaps) {
      if (gap.retired || gap.tests !== item.id) continue;
      gapCards.push({
        id: gap.id,
        front: `${gap.sentence} (${gap.translation})`,
        back: `${gap.answer} — ${gap.sentence.replace(GAP_MARKER, gap.answer)}`,
        tags: [...tagsFor(item.tier), `${gameSlug}::gap`],
      });
    }
  }

  const header = [
    "#separator:tab",
    "#html:false",
    "#notetype:Basic",
    `#deck:${GAME_NAME}::${pack.meta.target.name}`,
    "#columns:Guid\tFront\tBack\tTags",
    "#guid column:1",
    "#tags column:4",
  ];
  const rows = [...itemCards, ...gapCards].map((c) =>
    [`wd:${packId}:${c.id}`, c.front, c.back, c.tags.join(" ")].map(field).join("\t"),
  );
  return {
    fileName: `${gameSlug}-${packId}-missed-${localDate(now)}.txt`,
    text: [...header, ...rows].join("\n") + "\n",
  };
}
