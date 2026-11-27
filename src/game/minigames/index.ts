import type { LanguagePack } from "@/packs/types";
import type { Direction, Minigame, PromptKind } from "../types";
import { gapGuard } from "./GapGuard";
import { wordStrike } from "./WordStrike";

/** Minigame registry. New minigames are added here as separate modules. */
export const MINIGAMES: Minigame[] = [wordStrike, gapGuard];

export function getMinigame(id: string): Minigame {
  return MINIGAMES.find((m) => m.id === id) ?? MINIGAMES[0];
}

/** The minigames the pack has content for, in registry order. */
export function minigamesFor(pack: LanguagePack): Minigame[] {
  return MINIGAMES.filter((m) => m.hasContent(pack));
}

/** The prompt kind a duel of this minigame asks: its direction, or gaps. */
export function promptKindOf(minigame: Minigame, direction: Direction): PromptKind {
  return minigame.usesDirection ? direction : "gap";
}

/**
 * How many missed items a practice duel of this minigame would ask, from the
 * account's missed lists; null for a guest or while the list loads.
 */
export function practiceCount(
  minigame: Minigame,
  pack: LanguagePack,
  missed: Partial<Record<PromptKind, readonly string[]>> | null,
  direction: Direction,
): number | null {
  const list = missed?.[promptKindOf(minigame, direction)];
  return list ? minigame.practiceItems(pack, list).length : null;
}
