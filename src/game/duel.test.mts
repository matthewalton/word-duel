/**
 * Unit tests for the duel reducer's versus path (ADR 0002, 0012).
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { duelReducer, initialDuel, type DuelState } from "./duel.ts";
import type { Round } from "./types.ts";

const lang = { lang: "xx", dir: "ltr" as const };

/** A gap round as versus deals it: no answers yet, the prompt standing in for the reveal. */
const dealt: Round = {
  itemId: "item",
  promptId: "gap",
  tier: 1,
  promptKind: "gap",
  hint: "",
  prompt: { ...lang, text: "a ___ c" },
  gap: { before: "a ", after: " c" },
  accepted: [],
  reveal: { ...lang, text: "a ___ c" },
  answerLang: { code: "xx", dir: "ltr" },
  options: ["b", "d", "e"],
};
const decided: Round = { ...dealt, accepted: ["b"], reveal: { ...lang, text: "b" } };

function playing(): DuelState {
  const countdown = duelReducer(initialDuel(dealt, { versus: true }), { type: "countdown" });
  return duelReducer(countdown, { type: "start", round: dealt, at: 0, fuseMs: 10_000 });
}

describe("resolve in versus", () => {
  it("takes the decided round, so the answer can be shown", () => {
    const after = duelReducer(playing(), { type: "resolve", loser: null, reason: "wrong", given: "d", round: decided, at: 1 });
    assert.equal(after.round.reveal.text, "b");
    assert.deepEqual(after.rounds.at(-1)?.round.accepted, ["b"]);
    assert.equal(after.outcome?.given, "d");
  });

  it("keeps the round it had when none is given (solo)", () => {
    const after = duelReducer(playing(), { type: "resolve", loser: "rival", reason: "correct", at: 1 });
    assert.equal(after.round, dealt);
  });

  it("breaks a heart only when someone wins", () => {
    const rivalFirst = duelReducer(playing(), { type: "resolve", loser: "you", reason: "correct", given: "d", round: decided, at: 1 });
    assert.equal(rivalFirst.hearts.you, playing().hearts.you - 1);
    const nobody = duelReducer(playing(), { type: "resolve", loser: null, reason: "timeout", round: decided, at: 1 });
    assert.deepEqual(nobody.hearts, playing().hearts);
  });
});
