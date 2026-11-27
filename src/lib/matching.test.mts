/**
 * Unit tests for answer matching, run against real packs' matching settings.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchingSettingsSchema } from "../packs/schema.ts";
import type { MatchingSettings } from "../packs/types.ts";
import esEn from "../packs/es-en/matching.json" with { type: "json" };
import frEn from "../packs/fr-en/matching.json" with { type: "json" };
import { isAcceptedAnswer, normalizeAnswer } from "./matching.ts";

const fr = matchingSettingsSchema.parse(frEn);
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

describe("French answers", () => {
  it("accepts l'eau, leau and eau for l'eau", () => {
    for (const given of ["l'eau", "leau", "eau", "L'Eau", "l’eau", "l' eau"]) {
      assert.ok(accepts(fr, "fr", ["l'eau"], given), given);
    }
  });

  it("doesn't accept another word or the elided word alone", () => {
    for (const given of ["lait", "l'", "l", "eaux", "le eau x"]) {
      assert.ok(!accepts(fr, "fr", ["l'eau"], given), given);
    }
  });

  it("ignores leading articles", () => {
    for (const given of ["le chat", "chat", "un chat", "Le Chat"]) assert.ok(accepts(fr, "fr", ["le chat"], given), given);
    for (const given of ["la maison", "maison", "une maison"]) assert.ok(accepts(fr, "fr", ["la maison"], given), given);
    for (const given of ["les yeux", "yeux", "des yeux"]) assert.ok(accepts(fr, "fr", ["les yeux"], given), given);
  });

  it("keeps an article that is the whole answer", () => {
    assert.equal(normalizeAnswer("la", fr, "fr"), "la");
  });

  it("makes accents optional but keeps the letters", () => {
    for (const given of ["l'été", "l'ete", "lete", "ete"]) assert.ok(accepts(fr, "fr", ["l'été"], given), given);
    for (const given of ["le café", "cafe", "CAFÉ"]) assert.ok(accepts(fr, "fr", ["le café"], given), given);
    assert.ok(!accepts(fr, "fr", ["le café"], "caf"));
  });

  it("counts a phone keyboard's curly apostrophe as straight", () => {
    assert.ok(accepts(fr, "fr", ["aujourd'hui"], "aujourd’hui"));
    assert.ok(accepts(fr, "en", ["o'clock"], "o’clock"));
  });

  it("doesn't join a spaced article on", () => {
    assert.ok(!accepts(fr, "fr", ["le chat"], "lechat"));
  });

  it("ignores English articles and verb markers", () => {
    for (const given of ["water", "the water", "The Water"]) assert.ok(accepts(fr, "en", ["water"], given), given);
    for (const given of ["an apple", "apple", "a apple"]) assert.ok(accepts(fr, "en", ["apple"], given), given);
    for (const given of ["eat", "to eat"]) assert.ok(accepts(fr, "en", ["to eat"], given), given);
  });

  it("doesn't strip an elision in English", () => {
    assert.ok(!accepts(fr, "en", ["eau"], "l'eau"));
  });
});

describe("Spanish answers", () => {
  it("keep their articles and accents optional", () => {
    for (const given of ["el agua", "agua", "un agua"]) assert.ok(accepts(es, "es", ["el agua"], given), given);
    assert.ok(accepts(es, "es", ["el día"], "dia"));
  });
});
