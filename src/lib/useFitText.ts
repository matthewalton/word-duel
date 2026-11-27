"use client";

import { useLayoutEffect } from "react";

/** Multiplier steps tried largest to smallest; the last is the legibility floor. */
export type FitSteps = readonly number[];

export const FIT_STEPS_PROMPT: FitSteps = [1, 0.85, 0.72, 0.6, 0.5];
export const FIT_STEPS_BAND_WORD: FitSteps = [1, 0.85, 0.72, 0.6];
export const FIT_STEPS_CHOICE: FitSteps = [1, 0.85, 0.72, 0.6, 0.5];

/**
 * Shrinks one or more same-row text elements to the largest shared step (a
 * multiplier written to each element's `--fit` custom property, which each
 * element's own CSS font-size rule multiplies into its existing
 * `calc()`/`clamp()` expression) whose unwrapped width fits `availableWidth()`.
 * Pass several elements to size a row to one uniform step; pass one to size
 * it independently. Falls back to the smallest step, where normal wrapping
 * takes over as a last resort.
 *
 * Re-measures on mount, on window resize, once the pack's runtime word font
 * finishes loading (a measurement against the fallback font can pick the
 * wrong step), and whenever `deps` changes.
 *
 * Runs in a layout effect and mutates the DOM directly to measure, reverting
 * before paint, so there is no visible flicker.
 */
export function useFitText(
  getElements: () => HTMLElement[],
  availableWidth: () => number,
  deps: readonly unknown[],
  steps: FitSteps = FIT_STEPS_PROMPT,
): void {
  useLayoutEffect(() => {
    let cancelled = false;

    const fit = () => {
      const els = getElements();
      if (els.length === 0) return;
      // Measured before any element is mutated below, so the trial below
      // can't corrupt its own yardstick.
      const target = availableWidth();
      if (!Number.isFinite(target) || target <= 0) return;

      for (const el of els) el.style.whiteSpace = "nowrap";

      let chosen = steps[steps.length - 1];
      for (const step of steps) {
        for (const el of els) el.style.setProperty("--fit", String(step));
        if (els.every((el) => el.scrollWidth <= target)) {
          chosen = step;
          break;
        }
      }

      for (const el of els) {
        el.style.setProperty("--fit", String(chosen));
        el.style.whiteSpace = "";
      }
    };

    fit();
    window.addEventListener("resize", fit);
    if (document.fonts.status !== "loaded") {
      document.fonts.ready.then(() => {
        if (!cancelled) fit();
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
