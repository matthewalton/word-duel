# Design canvas

Every Word Duel mock-up lives on the design canvas, https://claude.ai/artifact/4aRo9VYK8D2ZWZp2Nifpis (private), and only there; the repo keeps no copy. Each round explores two to four options for one screen or feature, as boards; the agreed one is then built in `src/`. New screens follow an agreed board (AGENTS.md, Working on a feature).

## Reading a board

- Open one board in a browser at `https://claude.ai/artifact/4aRo9VYK8D2ZWZp2Nifpis#artboard-<Board>`, for example `#artboard-DifficultyRow`.
- Agents with the Artifact tool read a board's source as the canvas file `project/<Board>.dc.html` (`read` with that `path`; a `files` listing shows every board). The markup and inline styles carry the exact colours, sizes, borders, shadows and spacing; the `<style>` block holds the `steps()` keyframes; the `<script type="text/x-dc">` class at the bottom holds the states and sample data (`renderVals()` returns the values the `{{…}}` placeholders take).
- `<sc-for>` repeats its contents for each item in a list, `<sc-if>` shows them only when a value is true, and `<dc-import name="X" …>` reuses board `X` with the props given (many small boards are just one import of a bigger one).
- `project/canvas.json` is the canvas layout: where each board sits and the round titles.
- Specs and issues name the agreed boards and link them; code comments name the board (`DifficultyRow`).

## What was built

The code in `src/` is the source of truth for what shipped; the boards show the options considered and why the shipped one looks the way it does. Later rounds refine earlier ones, so the newest round on a screen wins.

| Round | Built | How it carried on |
| --- | --- | --- |
| Before START (Word Strike, Gap Guard) | C · title and mode cards (`TitleStrike`, `TitleGap`) | Refined in rounds 2 to 6 |
| 2 · minimal, full screen | C1 · minimal split (`MinSplit`, `MinPhone`) | Round 3 kept the split |
| 3 · active card that expands | `StartSplit`, `StartCarousel` on a phone | The title screen today |
| 4 · inactive card | 3 · Lights off (`InactiveDark`) | |
| 5 · two fonts | C · Pixelify Sans for all game text, Jua for anything read (`TypeC`) | Now a rule in docs/standards.md |
| 6 · direction toggle | 1 · outlined, names with an arrow, one button (`ToggleOutline`) | `DirectionLabel` |
| 7 · duel screen | Mixed: C's header and input (`DuelPath`), A's feedback band (`DuelCabinet`) | Round 8 |
| 8 · where the fuse goes | 3 · burns in under the word (`DuelTimerWord`) | Round 9 |
| 9 · duel screen, final | All boards as shown, desktop and phone, both minigames | The duel today |
| 10 · ready screen | A · bare START, plus the 3 · 2 · 1 · GO! countdown (`ReadyBare`, `ReadyCount`) | |
| 11 · last answer, game over | All boards as shown | Round 12 replaced the separate stage card |
| 12 · clearing a stage | 2 · one STAGE band instead of CORRECT (`StageB`) | `FeedbackBand` |
| 13 · optional sign-in | All boards as shown | |
| 14 · linking sign-ins | B · one list of sign-in methods, LINKED or LINK (`AccountLinkList`) | |
| 15 · wordbook and the ways in | All boards; all three ways in were built | Round 16 replaced the rows |
| 16 · wordbook rows | 3 · accordion (`WordbookRowExpand`) | |
| 17 · COMEBACK | B · band, sparks off the word, the stage chunk glints (`ComebackSparks`) | |
| 18 · difficulty | A · three-way switch (`DifficultyRow`, `DifficultyPhone`) | |
| 19 · versus | A · VERSUS in the title bar (`VersusTitleBar`), waiting 2 · player cards (`VersusWaitSlots`), the versus duel (`VersusDuel`), game over 1 · in the duel frame (`VersusOverPanel`), and their phone boards | REMATCH came with #36 (rival-asked state in the boards' Tweaks) |
| 20 · navigation | Mixed: A's language step (`NavDoorsLanguage`), C's hub (`NavSplitHub`), A's area screens with the title strip and back button, no side tabs (`NavDoorsSingle`), and their phone boards | The language step, hub and Single player area today (#71); the Versus and Study areas (`NavDoorsVersus`, `NavDoorsStudy`, contents from `NavKitVersus` and `NavKitStudy`, without QUICK MATCH) came with #81 |

When a design round is agreed and built, add its row here.
