import type { Minigame } from "../types";
import { gapGuard } from "./GapGuard";
import { wordStrike } from "./WordStrike";

/** Minigame registry. New minigames are added here as separate modules. */
export const MINIGAMES: Minigame[] = [wordStrike, gapGuard];

export function getMinigame(id: string): Minigame {
  return MINIGAMES.find((m) => m.id === id) ?? MINIGAMES[0];
}
