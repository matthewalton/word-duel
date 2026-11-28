"use client";

import type { PromptKind } from "@/game/types";

/**
 * The way to practise, handed from the Wordbook to the Single player area in
 * memory during a client-side navigation, so the practice duel is the first
 * thing shown. Lost on a reload, which shows the Single player menu.
 */
let practiceWay: PromptKind | null = null;

/** Called as a practice link navigates to the Single player area. */
export function startPractice(kind: PromptKind) {
  practiceWay = kind;
}

/** The way to practise, once: later calls return null until the next startPractice. */
export function takePracticeWay(): PromptKind | null {
  const kind = practiceWay;
  practiceWay = null;
  return kind;
}
