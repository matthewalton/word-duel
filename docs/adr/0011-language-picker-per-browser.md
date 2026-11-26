# The language picker is remembered per browser, cards show only with content, and Spanish accents are optional

The title screen's top bar has a **language picker**: a button naming the current pack's target language in its own words and font (한국어, Español) that opens a menu of every pack. Picking one switches the whole game to that pack: title cards, direction toggle, duels, Wordbook, best scores and word history, all of which were already kept per pack. The picker shows only when there are two or more packs. `DEFAULT_PACK_ID` in `src/config/game.ts` is the pack on a first visit (Korean).

The choice is remembered in this browser (`localStorage`, read and written inside try/catch), not on the account. It is a setting, not progress, so ADR 0008 still holds: guests keep no best scores or word history in the browser. The title and wordbook pages stay static: they render the default pack on the server and switch to the stored choice in the browser.

A **minigame** card shows only when the pack has something for it to ask (`Minigame.hasContent`), so a pack can ship with Word Strike only and gain Gap Guard later without an empty card.

When typing Spanish, accents are optional (`ignoreDiacritics`): "arbol" counts for "árbol" and "nino" for "niño", and the reveal always shows the accented form. Answers are still strictly right or wrong; a missing accent is a spelling slip a learner makes while typing on an English keyboard, not a different word, and the pack leaves out pairs that differ only by an accent. Spanish articles are leading words, so "gato" and "el gato" both count; the article isn't checked against the noun's gender, but every prompt and reveal shows it.

## Considered options

- **Store the choice on the account.** Deferred: it would need a schema change and only helps players on several devices; the browser setting covers everyone, guests included.
- **A language step before the title screen.** Rejected: one more screen before playing, for a choice most players make once.
- **Show a minigame's card with a "coming soon" note.** Rejected: an unplayable card on the title screen is noise.
- **Require accents.** Rejected: most learners type on keyboards without them, and the reveal teaches the accented form anyway.
