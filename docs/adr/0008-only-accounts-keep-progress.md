# Only accounts keep progress, recorded as duels, rounds and item stats

Supersedes the guest data part of ADR 0006. Guests keep nothing: no best scores and no word history in the browser, and no guest merge on sign-in. A guest's best score lasts only until the page closes, and the game tells them to sign in to keep scores and word history. Keeping two stores (browser and account) and merging them cost more than it gave; guests can still play everything.

For accounts, three tables hold progress, keyed by pack id and item id (pack content itself stays in the repo, ADR 0007):

- **duel**: one row per finished or abandoned duel (minigame, direction, score, stage reached, start and end).
- **round_result**: the **round log**, append-only, one row per round: the item tested, the prompt that asked it, the prompt kind (to target, to base, gap), the outcome, what the player gave and how long they took.
- **item_stat**: **item stats**, running totals per item and prompt kind (right, wrong, timeouts, right answers in a row, last outcome, first seen, last seen, last missed). They can be rebuilt from the round log.

Each duel is sent in one write, at game over or when the player leaves it, so the three tables change in one transaction. Rounds from a tab closed mid-duel are lost.

## Why log every round now

The word history page and the "past miss" effect only need item stats. The round log is kept from the start because history that wasn't recorded can't be filled in later, and accuracy over time, answer speed, a weakness score and spaced repetition are all built from it.
