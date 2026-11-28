"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MinigameId } from "@/game/minigames/ids";
import type { Difficulty, Direction } from "@/game/types";
import { isRoomCode } from "@/game/versus";
import { strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import { createRoom, joinRoom } from "@/server/versus";
import { keepSeat } from "./versusSeat";

type Busy = "create" | "join" | null;

/**
 * CREATE ROOM and JOIN, shared by the hub's VERSUS panel and the Versus
 * area. A room runs the given minigame with the saved difficulty and
 * direction (the direction only counts for Word Strike) and the language
 * picker's pack; joining by code shows "no room" and "full" before
 * leaving the screen. A reply that comes back after the screen has gone
 * (the player started a duel or opened an area meanwhile) is dropped, so it
 * never pulls them into the room.
 */
export function useRoomActions({
  pack,
  minigame,
  direction,
  difficulty,
}: {
  pack: LanguagePack;
  minigame: MinigameId;
  direction: Direction;
  difficulty: Difficulty;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const go = (roomCode: string, token: string) => {
    keepSeat(roomCode, token);
    router.push(`/versus/${roomCode}`);
  };

  const create = async () => {
    setBusy("create");
    setError(null);
    const made = await createRoom({ packId: pack.meta.id, minigame, direction, difficulty }).catch(() => null);
    if (!live.current) return;
    if (made) return go(made.code, made.token);
    setBusy(null);
    setError(strings.versus.createFailed);
  };

  const join = async (code: string) => {
    if (!isRoomCode(code)) {
      setError(strings.versus.missing);
      return;
    }
    setBusy("join");
    setError(null);
    const joined = await joinRoom(code).catch(() => null);
    if (!live.current) return;
    if (joined?.ok) return go(code, joined.token);
    setBusy(null);
    setError(!joined ? strings.versus.joinFailed : joined.error === "full" ? strings.versus.full : strings.versus.missing);
  };

  return { busy, error, clearError: () => setError(null), create, join };
}
