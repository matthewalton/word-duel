"use client";

import { useEffect, useRef } from "react";
import { duelSounds, type SoundView } from "@/game/duelSounds";
import { armUnlock, playSound } from "./sound";

/**
 * Plays a duel's sound effects (ADR 0016): each change in what the duel
 * shows plays the sounds `duelSounds` picks for it, once. A side effect at
 * the screen, so the reducer and the controllers' timing stay as they are.
 */
export function useDuelSounds({ versus, phase, count, fxKey, outcome, fuseLit, lockedOut, result }: SoundView) {
  const prev = useRef<SoundView | null>(null);

  useEffect(armUnlock, []);

  useEffect(() => {
    const view = { versus, phase, count, fxKey, outcome, fuseLit, lockedOut, result };
    for (const sound of duelSounds(prev.current, view)) playSound(sound);
    prev.current = view;
  }, [versus, phase, count, fxKey, outcome, fuseLit, lockedOut, result]);
}
