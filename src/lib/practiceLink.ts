"use client";

import type { PromptKind } from "@/game/types";

/**
 * The Wordbook starts a practice duel by linking to the title page with the
 * way to practise in the address bar; the page stays static and reads it in
 * the browser.
 */
const PARAM = "practice";
const KINDS: readonly PromptKind[] = ["toTarget", "toBase", "gap"];

export const practiceHref = (kind: PromptKind) => `/?${PARAM}=${kind}`;

/** The way to practise in the address bar; null when there is none, and on the server. */
export function readPracticeWay(): PromptKind | null {
  if (typeof window === "undefined") return null;
  const kind = new URLSearchParams(window.location.search).get(PARAM);
  return (KINDS as readonly string[]).includes(kind ?? "") ? (kind as PromptKind) : null;
}

/** Takes the way back out of the address bar once it has been read. */
export function stripPracticeWay() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, "", url);
}
