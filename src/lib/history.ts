"use client";

import { HISTORY_LIMITS } from "@/config/game";
import type { DuelState } from "@/game/duel";
import type { Direction, PromptKind } from "@/game/types";
import type { MinigameId } from "@/game/minigames/ids";
import { loadLastMissed, recordDuel, type DuelRecord } from "@/server/history";
import { hasAccount } from "./progress";

/** A random v4 uuid; crypto.randomUUID needs a secure context, which a LAN address isn't. */
export function newDuelId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Duels on their way to word history; the missed list waits for them. */
const sending = new Set<Promise<void>>();

/**
 * The account's missed items for this prompt kind (null for a guest), once
 * any duel still being sent is in, so a duel just left counts.
 */
export async function loadMissed(packId: string, promptKind: PromptKind): Promise<string[] | null> {
  await Promise.all(sending);
  return loadLastMissed(packId, promptKind);
}

/**
 * Send a finished or abandoned duel to the account's word history (ADR 0008).
 * A guest sends nothing, and a duel with no rounds isn't kept.
 */
export function sendDuel(
  id: string,
  meta: { packId: string; minigameId: MinigameId; direction: Direction | null },
  state: DuelState,
  endedAt: number,
) {
  if (!hasAccount() || state.rounds.length === 0) return;
  const record: DuelRecord = {
    id,
    ...meta,
    score: state.score,
    stageReached: state.stage,
    durationMs: Math.round(Math.max(0, endedAt - state.startedAt)),
    rounds: state.rounds.slice(0, HISTORY_LIMITS.maxRounds).map((p) => ({
      itemId: p.round.itemId,
      promptId: p.round.promptId,
      promptKind: p.round.promptKind,
      outcome: p.reason,
      given: p.reason === "timeout" ? null : (p.given ?? "").slice(0, HISTORY_LIMITS.maxGivenLength),
      answerMs: p.answerMs == null ? null : Math.round(p.answerMs),
      stage: p.stage,
      atMs: Math.round(p.atMs),
    })),
  };
  const sent = recordDuel(record)
    .catch(() => {
      // Offline or signed out elsewhere: this duel isn't kept.
    })
    .finally(() => sending.delete(sent));
  sending.add(sent);
}
