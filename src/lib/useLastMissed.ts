"use client";

import { useEffect, useState } from "react";
import type { PromptKind } from "@/game/types";
import { loadMissed } from "./history";

/** The account's missed items (ids) per prompt kind; a kind is missing until it loads. */
export type MissedLists = Partial<Record<PromptKind, string[]>>;

const KINDS: PromptKind[] = ["toTarget", "toBase", "gap"];

/**
 * The signed-in account's missed items in this pack, for the title screen's
 * MISSED ONLY counts. Reloaded each time `active` turns on (back on the title
 * screen after a duel), so the counts follow the duel just played. Null for a
 * guest.
 */
export function useLastMissed(packId: string, userId: string | null, active: boolean): MissedLists | null {
  const key = `${userId}\u0000${packId}`;
  const [loaded, setLoaded] = useState<{ key: string; lists: MissedLists }>({ key, lists: {} });

  useEffect(() => {
    if (!userId || !active) return;
    let live = true;
    for (const kind of KINDS) {
      loadMissed(packId, kind)
        .then((itemIds) => {
          if (!live || !itemIds) return;
          setLoaded((prev) => ({ key, lists: { ...(prev.key === key ? prev.lists : {}), [kind]: itemIds } }));
        })
        .catch(() => {
          // Offline: the count stays hidden and practice stays off.
        });
    }
    return () => {
      live = false;
    };
  }, [packId, userId, active, key]);

  if (!userId) return null;
  return loaded.key === key ? loaded.lists : {};
}
