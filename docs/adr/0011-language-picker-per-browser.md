# The language picker is remembered per browser, cards show only with content, and Spanish accents are optional

The top bar has a **language picker**: a button naming the current pack's target language in its own words and font (한국어, Español) that opens a menu of every pack. Picking one switches the whole game to that pack: minigame cards, direction toggle, duels, Wordbook, best scores and word history, all of which were already kept per pack. The picker shows only when there are two or more packs. `DEFAULT_PACK_ID` in `src/config/game.ts` is the pack on a first visit (Korean).

The choice is remembered in this browser (`localStorage`, read and written inside try/catch), not on the account. It is a setting, not progress, so ADR 0008 still holds: guests keep no best scores or word history in the browser. The hub, Single player and wordbook pages stay static: they render the default pack on the server and switch to the stored choice in the browser.

A **minigame** card shows only when the pack has something for it to ask (`Minigame.hasContent`), so a pack can ship with Word Strike only and gain Gap Guard later without an empty card.

When typing Spanish, accents are optional (`ignoreDiacritics`): "arbol" counts for "árbol" and "nino" for "niño", and the reveal always shows the accented form. Answers are still strictly right or wrong; a missing accent is a spelling slip a learner makes while typing on an English keyboard, not a different word, and the pack leaves out pairs that differ only by an accent. Spanish articles are leading words, so "gato" and "el gato" both count; the article isn't checked against the noun's gender, but every prompt and reveal shows it.

## Update: the language step and remembered settings (#71)

Navigation now starts with a **language step** at `/` (design canvas round 20): a tile per pack, REMEMBER MY LANGUAGE and CONTINUE, which opens the hub. REMEMBER is on by default and kept in this browser like the pack: when it is on and a pack is stored, `/` goes straight to the hub; turning it off, on the step or with REMEMBER ON THIS DEVICE in the language picker's menu, brings the step back on the next visit, never in the middle of one. The pack itself stays stored either way, so `/play` and the Wordbook keep it. Because only the browser knows which screen `/` opens, the static page renders the bare grid and the browser fills in the step or the hub.

The difficulty and direction last picked on the minigame cards are kept in this browser too, so the hub's quick PLAY and a new versus room use them; a first visit gets Normal, base → target. They are settings, like the pack, so ADR 0008 still holds.

This reverses the rejected option below: with three packs, and Versus and Study beside the solo game, the first choice is the language, and remembering it keeps returning players one screen from playing.

## Considered options

- **Store the choice on the account.** Deferred: it would need a schema change and only helps players on several devices; the browser setting covers everyone, guests included.
- **A language step before the title screen.** Rejected at first: one more screen before playing, for a choice most players make once. Adopted in #71 with REMEMBER on by default (see the update above).
- **Show a minigame's card with a "coming soon" note.** Rejected: an unplayable card on the title screen is noise.
- **Require accents.** Rejected: most learners type on keyboards without them, and the reveal teaches the accented form anyway.
