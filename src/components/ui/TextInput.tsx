"use client";

import { useLayoutEffect, useRef, type ComponentProps, type KeyboardEvent, type RefObject } from "react";
import u from "./ui.module.css";

/**
 * The answer field: a native, uncontrolled `<input>`, so React re-renders
 * never interrupt an IME composition. Enter calls `onEnter`, but never while
 * a composition is in progress. Each new `freshKey` (a new prompt, or the
 * countdown before the first one) empties the field and focuses it; `null`
 * leaves it alone. The phone keyboard never corrects or completes what the
 * player types.
 */
export function TextInput({
  ref,
  label,
  freshKey,
  onEnter,
  className,
  ...props
}: Omit<ComponentProps<"input">, "ref" | "aria-label" | "onKeyDown" | "onCompositionStart" | "onCompositionEnd"> & {
  /** The caller reads the typed value through it. */
  ref: RefObject<HTMLInputElement | null>;
  /** Its accessible name; the field shows no visible label. */
  label: string;
  freshKey: string | null;
  onEnter: () => void;
}) {
  const composing = useRef(false);

  // A layout effect, so the focus lands while the START press is still being
  // handled and phones open the keyboard: a focus from a later timer would
  // not count as a user gesture.
  useLayoutEffect(() => {
    if (freshKey == null || !ref.current) return;
    ref.current.value = "";
    ref.current.focus();
  }, [freshKey, ref]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    // keyCode 229 covers Safari, which fires the committing Enter after compositionend.
    if (e.nativeEvent.isComposing || composing.current || e.keyCode === 229) return;
    e.preventDefault();
    onEnter();
  };

  return (
    <input
      ref={ref}
      className={`${u.textInput} ${className ?? ""}`}
      aria-label={label}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="go"
      onKeyDown={onKeyDown}
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={() => (composing.current = false)}
      {...props}
    />
  );
}
