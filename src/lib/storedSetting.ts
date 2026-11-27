"use client";

import { useSyncExternalStore } from "react";

/** The stored value when it is one of the allowed values, else the fallback. */
export function pickSetting<T extends string>(raw: string | null, values: readonly T[], fallback: T): T {
  return values.find((v) => v === raw) ?? fallback;
}

/**
 * A setting remembered in this browser only (ADR 0011): one of a few string
 * values, read and written inside try/catch so blocked storage falls back to
 * the default. Every screen that reads it sees a change at once, and so does
 * another tab.
 */
export function storedSetting<T extends string>(key: string, values: readonly T[], fallback: T) {
  const listeners = new Set<() => void>();
  /** The value set this page load, kept in case storage refuses the write. */
  let chosen: T | null = null;

  const read = (): T => {
    if (chosen) return chosen;
    try {
      return pickSetting(window.localStorage.getItem(key), values, fallback);
    } catch {
      return fallback;
    }
  };

  const subscribe = (onChange: () => void) => {
    listeners.add(onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      chosen = null;
      onChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  };

  const set = (value: T) => {
    chosen = value;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Private window or blocked storage: the setting lasts until the page closes.
    }
    for (const l of listeners) l();
  };

  /** The server snapshot is the fallback, so static pages hydrate without a mismatch. */
  const use = (): T => useSyncExternalStore(subscribe, read, () => fallback);

  return { read, set, use, subscribe };
}
