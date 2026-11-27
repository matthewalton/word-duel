"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { DEFAULT_PACK_ID, PACK_PENDING_ATTR, PACK_STORAGE_KEY, SETTING_KEYS } from "@/config/game";
import { getPack, listPacks } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import { entryFor, type Entry } from "./entry";
import { storedSetting } from "./storedSetting";

/**
 * The language pack the player picked, remembered in this browser only, not
 * on the account (ADR 0011). Storage can be missing or blocked, so every read
 * and write is guarded and falls back to the default pack.
 */
const STORAGE_KEY = PACK_STORAGE_KEY;

const listeners = new Set<() => void>();
/** The choice made this page load, kept in case storage refuses the write. */
let chosen: string | null = null;

const isPackId = (id: string | null): id is string => id != null && listPacks().some((p) => p.id === id);

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function currentPackId(): string {
  const id = chosen ?? readStored();
  return isPackId(id) ? id : DEFAULT_PACK_ID;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab picking a language changes this one too.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    chosen = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function choosePack(id: string) {
  if (!isPackId(id)) return;
  chosen = id;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private window or blocked storage: the choice lasts until the page closes.
  }
  for (const l of listeners) l();
}

/** REMEMBER MY LANGUAGE: on unless the player turned it off on this device. */
const rememberSetting = storedSetting(SETTING_KEYS.rememberPack, ["on", "off"] as const, "on");

export const useRememberPack = () => rememberSetting.use() === "on";
export const setRememberPack = (on: boolean) => rememberSetting.set(on ? "on" : "off");

/**
 * Which screen `/` shows, decided once per page load: turning REMEMBER off
 * while on the hub only brings the language step back on the next visit.
 */
let entry: Entry | null = null;

function currentEntry(): Entry {
  entry ??= entryFor(rememberSetting.read() === "on", isPackId(readStored()));
  return entry;
}

/** The language step's CONTINUE: switch to the pack and show the hub. */
export function enterHub(id: string) {
  entry = "hub";
  choosePack(id);
}

/** The first screen at `/`; null on the server, which can't know it. */
export function useEntry(): Entry | null {
  return useSyncExternalStore(subscribe, currentEntry, () => null);
}

/**
 * The chosen pack. The server snapshot is the default pack, so the static
 * page hydrates without a mismatch and then switches to the stored choice.
 */
export function useChosenPack(): LanguagePack {
  const id = useSyncExternalStore(subscribe, currentPackId, () => DEFAULT_PACK_ID);
  // Show the page once it shows the chosen pack (see PACK_PENDING_ATTR).
  useLayoutEffect(() => {
    if (id === currentPackId()) document.documentElement.removeAttribute(PACK_PENDING_ATTR);
  }, [id]);
  return getPack(id);
}
