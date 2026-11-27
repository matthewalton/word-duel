"use client";

import { useSyncExternalStore } from "react";

/**
 * The height of the part of the page the player can see, in CSS pixels: the
 * visual viewport, which shrinks when a phone's keyboard opens. iOS Safari
 * keeps the layout viewport (and `100dvh`) at full height under the keyboard
 * and ignores `interactive-widget`, so the duel sizes itself to this instead.
 */
function subscribe(onChange: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", onChange);
  vv.addEventListener("scroll", onChange);
  return () => {
    vv.removeEventListener("resize", onChange);
    vv.removeEventListener("scroll", onChange);
  };
}

/** Pinch-zoom shrinks the visual viewport too; times its scale, only the keyboard counts. */
const visibleHeight = () => {
  const vv = window.visualViewport;
  return vv ? Math.round(vv.height * vv.scale) : null;
};

/** `null` means not known: on the server, or in a browser without `visualViewport`. */
export function useViewportHeight(): number | null {
  return useSyncExternalStore(subscribe, visibleHeight, () => null);
}

/** The page style that hands the visible height to CSS as `--vvh` (see `.page` in game.module.css). */
export function viewportHeightVar(height: number | null): { "--vvh"?: string } {
  return height == null ? {} : { "--vvh": `${height}px` };
}
