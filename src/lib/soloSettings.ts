"use client";

import { DEFAULT_DIFFICULTY, DIFFICULTIES, SETTING_KEYS } from "@/config/game";
import type { Difficulty, Direction } from "@/game/types";
import { storedSetting } from "./storedSetting";

const DIRECTIONS = ["toTarget", "toBase"] as const satisfies readonly Direction[];

/**
 * The difficulty and direction last picked on the minigame cards, kept in
 * this browser (ADR 0011), so the hub's quick PLAY and a versus room use them
 * too. A first visit gets Normal, base → target.
 */
const difficultySetting = storedSetting<Difficulty>(SETTING_KEYS.difficulty, DIFFICULTIES, DEFAULT_DIFFICULTY);
const directionSetting = storedSetting<Direction>(SETTING_KEYS.direction, DIRECTIONS, "toTarget");

export interface SoloSettings {
  difficulty: Difficulty;
  direction: Direction;
  setDifficulty: (d: Difficulty) => void;
  setDirection: (d: Direction) => void;
}

export function useSoloSettings(): SoloSettings {
  return {
    difficulty: difficultySetting.use(),
    direction: directionSetting.use(),
    setDifficulty: difficultySetting.set,
    setDirection: directionSetting.set,
  };
}
