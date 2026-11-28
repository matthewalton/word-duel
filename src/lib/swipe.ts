/**
 * The rules for a swipe on the minigame cards, and the wrap-around shared by
 * the arrow keys, the carousel buttons and a swipe. No React, no DOM.
 */

/** A swipe at least this long (px) counts at any speed. */
export const SWIPE_MIN_DISTANCE = 50;
/** A quick flick needs only this distance (px)... */
export const FLICK_MIN_DISTANCE = 25;
/** ...at this average speed or faster (px/ms). */
export const FLICK_MIN_SPEED = 0.4;
/** Mostly horizontal: |dx| must be at least this many times |dy|. */
export const HORIZONTAL_RATIO = 1.5;
/** Swipes starting this close (px) to the left or right viewport edge are
 *  left to the browser's back gesture (iPhone Safari, Android). */
export const EDGE_GUARD = 20;

/**
 * Which way a finished touch drag moves the active card: 1 for the next card
 * (finger moved right to left), -1 for the previous, 0 when it is not a swipe.
 * `dx`/`dy` are the finger's movement in px, `ms` how long it took.
 */
export function swipeStep({ dx, dy, ms }: { dx: number; dy: number; ms: number }): -1 | 0 | 1 {
  const distance = Math.abs(dx);
  if (distance < HORIZONTAL_RATIO * Math.abs(dy)) return 0;
  const long = distance >= SWIPE_MIN_DISTANCE;
  const flick = distance >= FLICK_MIN_DISTANCE && ms > 0 && distance / ms >= FLICK_MIN_SPEED;
  if (!long && !flick) return 0;
  return dx < 0 ? 1 : -1;
}

/** Whether a touch starting at `x` is far enough from the viewport's edges to be a swipe. */
export function clearOfEdges(x: number, viewportWidth: number): boolean {
  return x >= EDGE_GUARD && x <= viewportWidth - EDGE_GUARD;
}

/** Moves index `i` by `delta` through `length` items, wrapping at both ends. */
export function wrapIndex(i: number, delta: number, length: number): number {
  return (((i + delta) % length) + length) % length;
}
