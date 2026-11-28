"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";
import { clearOfEdges, swipeStep } from "./swipe";

/** How long (ms) after a swipe the click some browsers fire on release is
 *  swallowed; later clicks (a keyboard Enter on PLAY, say) go through. */
const CLICK_AFTER_SWIPE = 500;

/** Where a gesture began; null when no gesture is being tracked. */
type Start = { id: number; x: number; y: number; at: number } | null;

/**
 * Touch swipes on an element, for spreading onto it: a recognised swipe
 * (see `swipeStep`) calls `onStep(1)` for the next item or `onStep(-1)` for
 * the previous, and swallows the click that may follow on release, so a
 * swipe that starts on a control never presses it. Only the primary touch
 * counts: mouse and pen do nothing, a second finger cancels (pinch), and so
 * does `pointercancel` (the browser took the gesture for a scroll). Gestures
 * starting near the viewport's edges, on a text field, or inside a dialog or
 * menu are left alone. The element needs `touch-action: pan-y pinch-zoom`
 * so the browser hands horizontal movement to the page.
 */
export function useSwipe(onStep: (delta: 1 | -1) => void, enabled: boolean) {
  const start = useRef<Start>(null);
  const swipedAt = useRef(-Infinity);

  return {
    onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      if (!e.isPrimary) {
        start.current = null;
        return;
      }
      const ignored =
        e.target instanceof Element &&
        e.target.closest('input, textarea, [role="dialog"], [role="menu"]');
      start.current =
        enabled && !ignored && clearOfEdges(e.clientX, window.innerWidth)
          ? { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp }
          : null;
    },
    onPointerUp(e: PointerEvent) {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      start.current = null;
      const delta = swipeStep({ dx: e.clientX - s.x, dy: e.clientY - s.y, ms: e.timeStamp - s.at });
      if (delta === 0) return;
      swipedAt.current = e.timeStamp;
      onStep(delta);
    },
    onPointerCancel(e: PointerEvent) {
      if (e.pointerId === start.current?.id) start.current = null;
    },
    onClickCapture(e: MouseEvent) {
      if (e.timeStamp - swipedAt.current > CLICK_AFTER_SWIPE) return;
      swipedAt.current = -Infinity;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}
