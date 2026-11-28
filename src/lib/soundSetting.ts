"use client";

import { SETTING_KEYS } from "../config/game.ts";
import { storedSetting } from "./storedSetting.ts";

/**
 * Whether sound effects play, kept in this browser like the language picker
 * (ADR 0011, 0016). On unless the player turned it off with the sound button.
 */
const soundSetting = storedSetting(SETTING_KEYS.sound, ["on", "off"] as const, "on");

export const soundOn = () => soundSetting.read() === "on";
export const useSoundOn = () => soundSetting.use() === "on";
export const storeSoundOn = (on: boolean) => soundSetting.set(on ? "on" : "off");
