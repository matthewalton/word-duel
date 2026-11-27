/**
 * Spanish and French adjectives accept their feminine singular form as a
 * right answer (#77). The prompt and the reveal keep the masculine
 * dictionary form, so the feminine is only ever an alternative.
 *
 *   pnpm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAcceptedAnswer } from "../lib/matching.ts";
import { matchingSettingsSchema, wordItemSchema } from "./schema.ts";
import esMatching from "./es-en/matching.json" with { type: "json" };
import esWords from "./es-en/words.json" with { type: "json" };
import frMatching from "./fr-en/matching.json" with { type: "json" };
import frWords from "./fr-en/words.json" with { type: "json" };

/** Every adjective in the pack whose feminine singular is spelt differently, masculine → feminine. */
const ES: Record<string, string> = Object.fromEntries(
  `bueno claro seguro nuevo serio primero muerto rápido justo bajo viejo pequeño último loco listo malo alto vivo duro
  extraño raro perfecto largo negro tranquilo bonito lindo estúpido tonto blanco hermoso maravilloso único mismo cierto
  correcto divertido propio necesario verdadero gracioso próximo solo frío peligroso lleno enfermo ocupado rojo rico
  cansado oscuro guapo sucio corto falso famoso vacío aburrido feo izquierdo lento cercano pesado barato sano amarillo
  seco caro curioso extranjero delicioso afortunado celoso agradecido generoso sabio hambriento`
    .split(/\s+/)
    .map((m) => [m, m.replace(/o$/, "a")]),
);

const FR: Record<string, string> = {
  bon: "bonne", sûr: "sûre", vrai: "vraie", petit: "petite", seul: "seule", grand: "grande", nouveau: "nouvelle",
  dernier: "dernière", perdu: "perdue", premier: "première", vieux: "vieille", beau: "belle", gros: "grosse",
  prêt: "prête", meilleur: "meilleure", dur: "dure", important: "importante", fort: "forte", plein: "pleine",
  fou: "folle", génial: "géniale", parfait: "parfaite", mauvais: "mauvaise", bas: "basse", heureux: "heureuse",
  inquiet: "inquiète", sérieux: "sérieuse", gentil: "gentille", prochain: "prochaine", faux: "fausse",
  content: "contente", cher: "chère", long: "longue", noir: "noire", clair: "claire", joli: "jolie", chaud: "chaude",
  normal: "normale", dangereux: "dangereuse", froid: "froide", vivant: "vivante", blanc: "blanche",
  différent: "différente", amoureux: "amoureuse", blessé: "blessée", ouvert: "ouverte", humain: "humaine",
  occupé: "occupée", personnel: "personnelle", spécial: "spéciale", mignon: "mignonne", fier: "fière",
  marié: "mariée", précis: "précise", médical: "médicale", égal: "égale", idéal: "idéale",
  malheureux: "malheureuse", supérieur: "supérieure",
};

/**
 * Packs have no word class, so the lists above are kept by hand. To catch an
 * adjective added later without its feminine, a bare word (no article, not a
 * verb) with a typically masculine adjective ending must be on the list,
 * unless it's one of the few words with that ending that isn't an adjective.
 */
const none: string[] = [];

const packs = [
  { name: "es-en", lang: "es", words: esWords, matching: esMatching, feminine: ES, masculineEnding: /o$/, notAdjectives: none },
  {
    name: "fr-en", lang: "fr", words: frWords, matching: frMatching, feminine: FR,
    masculineEnding: /(eux|if|el|er|et|é|al|on)$/, notAdjectives: ["hier"],
  },
];

for (const pack of packs) {
  const words = pack.words.map((w) => wordItemSchema.parse(w));
  const settings = matchingSettingsSchema.parse(pack.matching);

  describe(`${pack.name} feminine adjectives`, () => {
    it("accepts the feminine of every listed adjective, and keeps the masculine as the shown form", () => {
      for (const [masculine, feminine] of Object.entries(pack.feminine)) {
        const word = words.find((w) => w.target === masculine || w.targetAlt?.includes(masculine));
        assert.ok(word, `${masculine} is in the pack`);
        assert.notEqual(word.target, feminine, `${masculine}: the shown form stays masculine`);
        assert.ok(word.targetAlt?.includes(feminine), `${masculine} lists ${feminine} in targetAlt`);
        assert.ok(isAcceptedAnswer(feminine, [word.target, ...(word.targetAlt ?? [])], settings, pack.lang), feminine);
      }
    });

    it("lists every bare word with a masculine adjective ending", () => {
      const bare = words.filter((w) => !/[\s']/.test(w.target) && !w.base.some((b) => b.startsWith("to ")));
      for (const w of bare) {
        if (!pack.masculineEnding.test(w.target) || pack.notAdjectives.includes(w.target)) continue;
        assert.ok(w.target in pack.feminine, `${w.id}: add its feminine to targetAlt and to this test's list`);
      }
    });
  });
}
