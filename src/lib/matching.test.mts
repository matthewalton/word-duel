/**
 * Unit tests for answer matching.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchingSettingsSchema } from "../packs/schema.ts";
import type { MatchingSettings } from "../packs/types.ts";
import esEn from "../packs/es-en/matching.json" with { type: "json" };
import { isAcceptedAnswer } from "./matching.ts";

const es = matchingSettingsSchema.parse(esEn);

const accepts = (settings: MatchingSettings, lang: string, accepted: string[], given: string) =>
  isAcceptedAnswer(given, accepted, settings, lang);

describe("elided leading words", () => {
  const elided: MatchingSettings = { ignoreDiacritics: true, ignoreElidedWords: { fr: ["l'"] } };

  it("accepts the answer with the elided word, joined on, or left off", () => {
    for (const given of ["l'été", "lete", "ete", "L'Été", "l’été"]) assert.ok(accepts(elided, "fr", ["l'été"], given), given);
  });

  it("doesn't accept the elided word alone, or join one the answer doesn't have", () => {
    assert.ok(!accepts(elided, "fr", ["l'été"], "l'"));
    assert.ok(!accepts(elided, "fr", ["été"], "lete"));
  });

  it("only applies in the language it is set for", () => {
    assert.ok(!accepts(elided, "en", ["été"], "l'été"));
  });
});

describe("Spanish answers", () => {
  it("keep their articles and accents optional", () => {
    for (const given of ["el agua", "agua", "un agua"]) assert.ok(accepts(es, "es", ["el agua"], given), given);
    assert.ok(accepts(es, "es", ["el día"], "dia"));
  });
});
