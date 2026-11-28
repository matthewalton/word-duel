import { GAME_NAME } from "../config/game.ts";
import { findItem } from "../packs/index.ts";
import type { LanguagePack } from "../packs/types.ts";
import type { WordbookEntry } from "../server/wordbook.ts";

/** What the export needs from a Wordbook entry: the item, and how it was missed per prompt kind. */
export type ExportEntry = Pick<WordbookEntry, "itemId" | "kinds">;

/** An item card: the item's target on the front, its accepted answers or grammar description on the back. */
export type ItemCard = { guid: string; front: string; back: string; tags: string[] };

/**
 * A gap card: a gap sentence (still holding its blank) and the answer that
 * fills it, its translation, and the tested item ("이/가 — subject particle").
 */
export type GapCard = {
  guid: string;
  sentence: string;
  answer: string;
  translation: string;
  backExtra: string;
  tags: string[];
};

/** The game's name as it appears in a file name or tag: "Word Duel" → "word-duel". */
export const gameSlug = GAME_NAME.toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

/** YYYY-MM-DD in the player's local time. */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const missedInGap = (e: ExportEntry) => e.kinds.some((k) => k.kind === "gap" && k.wrong + k.timeouts > 0);

/**
 * An answer Anki can't cloze: `::` or `{{` would end the cloze marker early,
 * and `}}` (or a closing `}`) would close it early.
 */
const unclozable = (answer: string) => /::|\{\{|\}\}|\}$/.test(answer);

/**
 * The Anki export's cards, as plain text: one item card per missed item the
 * pack knows, in the given order, then a gap card for each non-retired gap
 * sentence testing an item missed in the gap prompt kind. Each guid is built
 * from the item or prompt id, which never changes (ADR 0007), so importing a
 * later export updates the same notes.
 */
export function ankiCards(
  pack: LanguagePack,
  entries: readonly ExportEntry[],
): { items: ItemCard[]; gaps: GapCard[] } {
  const packId = pack.meta.id;
  const guid = (id: string) => `wd:${packId}:${id}`;
  const tagsFor = (tier: number) => [`${gameSlug}::${packId}`, `${gameSlug}::tier-${tier}`];

  const items: ItemCard[] = [];
  const gaps: GapCard[] = [];
  for (const entry of entries) {
    const item = findItem(pack, entry.itemId);
    if (!item) continue;
    const back = item.kind === "word" ? item.base.join("; ") : item.base;
    items.push({ guid: guid(item.id), front: item.target, back, tags: tagsFor(item.tier) });
    if (!missedInGap(entry)) continue;
    for (const gap of pack.gaps) {
      if (gap.retired || gap.tests !== item.id || unclozable(gap.answer)) continue;
      gaps.push({
        guid: guid(gap.id),
        sentence: gap.sentence,
        answer: gap.answer,
        translation: gap.translation,
        backExtra: `${item.target} — ${back}`,
        tags: [...tagsFor(item.tier), `${gameSlug}::gap`],
      });
    }
  }
  return { items, gaps };
}

/** The deck the export lands in: one subdeck per pack under the game's name. */
export const ankiDeckName = (pack: LanguagePack) => `${GAME_NAME}::${pack.meta.target.name}`;

/** `word-duel-<pack id>-missed-<YYYY-MM-DD>.apkg`, dated in the player's local time. */
export const ankiFileName = (pack: LanguagePack, now: Date) =>
  `${gameSlug}-${pack.meta.id}-missed-${localDate(now)}.apkg`;
