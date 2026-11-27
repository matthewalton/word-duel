import type { PromptKind, Reason } from "@/game/types";

/** One round as item stats need it: which item, how it was asked, and its outcome. */
export type TotalsRound = { itemId: string; promptKind: PromptKind; outcome: Reason };

/** Running totals for one item and prompt kind, the shape of an item stat row. */
export type ItemTotals = {
  itemId: string;
  promptKind: PromptKind;
  right: number;
  wrong: number;
  timeouts: number;
  /** Right answers since the last miss for the item, or all of them if none. */
  streak: number;
  lastOutcome: Reason;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastMissedAt: Date | null;
};

/**
 * Totals per item and prompt kind, from rounds in the order they were played.
 * Recording a duel adds one duel's totals onto the stored ones (ADR 0008).
 */
export function totalsByItem(rounds: readonly { r: TotalsRound; at: Date }[]): ItemTotals[] {
  const totals = new Map<string, ItemTotals>();
  for (const { r, at } of rounds) {
    const key = `${r.itemId}\u0000${r.promptKind}`;
    let t = totals.get(key);
    if (!t) {
      t = { itemId: r.itemId, promptKind: r.promptKind, right: 0, wrong: 0, timeouts: 0, streak: 0, lastOutcome: r.outcome, firstSeenAt: at, lastSeenAt: at, lastMissedAt: null };
      totals.set(key, t);
    }
    if (r.outcome === "correct") {
      t.right += 1;
      t.streak += 1;
    } else {
      if (r.outcome === "wrong") t.wrong += 1;
      else t.timeouts += 1;
      t.streak = 0;
      t.lastMissedAt = at;
    }
    t.lastOutcome = r.outcome;
    t.lastSeenAt = at;
  }
  return [...totals.values()];
}
