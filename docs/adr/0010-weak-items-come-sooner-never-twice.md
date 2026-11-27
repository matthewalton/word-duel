# Weak items come sooner, never twice

For an account, the **missed items** (items whose last outcome in this prompt kind was a miss, wrong or too slow) are worked in early in every duel's draw order: in each block of three rounds one deals a missed item, at a random place in the block, until every missed item in the pool has been dealt; the rest of the pool follows in a plain shuffle. When the pool reshuffles, the next pass works them in early the same way. In Word Strike a prompt card counts as missed if any word on it is.

The list is the one comebacks already load from item stats (ADR 0008). It is fixed when the duel starts: a missed item answered right this duel is still worked in early on the next pass, and play again starts from the list as the last duel left it. If the list hasn't loaded by the first round, the duel starts with a plain shuffle and works the missed items into the rest of the pass once it arrives.

Difficulty still applies (ADR 0009): only missed items in the chosen tiers are in the pool to be worked in. Scoring, the fuse and comebacks don't change. Guests keep the plain shuffle; they have no word history.

## Practice duels

An account can also play a **practice duel**, picked with MISSED ONLY on a minigame's card on the title screen. It draws only the missed items for that card's prompt kind (Word Strike's direction, or gaps), any tier: difficulty doesn't apply, and the switch greys out. The list is fixed when the duel starts and dealt in the same shuffled no-repeat order, reshuffling once every item is dealt; play again starts from the list as the last duel left it. In Gap Guard each missed item is asked through one of its gap sentences, picked at random. It needs at least 5 missed items; the count shows on the toggle.

Everything else plays as a normal duel, comebacks included. Its rounds go into word history like any duel's, so a missed item answered right leaves the list. It never saves a best score and game over never calls it a new best (it shows PRACTICE instead), so best scores stay comparable: a duel of only the words you got wrong isn't the same game. Guests see the toggle, but choosing it asks them to sign in (ADR 0008).

## Considered options

- **Ask missed items twice, or more often than others.** Rejected: it breaks the no-repeat rule (nothing comes back until the whole pool has been dealt), and seeing the same word twice in a duel teaches its position, not the word. Coming early gets the same "meet it again soon" effect.
- **Missed items first, all in a row.** Rejected: a duel that opens with a run of the player's weakest words feels like a punishment, and costs hearts before the player has warmed up. One in three keeps them early but mixed in.
- **A weakness score from miss rate, runs and answer time.** Left for later. "Last missed" is what comebacks already use, needs no new data, and is easy to explain.
