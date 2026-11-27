# Weak items come sooner, never twice

For an account, the **missed items** (items whose last outcome in this prompt kind was a miss, wrong or too slow) are worked in early in every duel's draw order: in each block of three rounds one deals a missed item, at a random place in the block, until every missed item in the pool has been dealt; the rest of the pool follows in a plain shuffle. When the pool reshuffles, the next pass works them in early the same way. In Word Strike a prompt card counts as missed if any word on it is.

The list is the one comebacks already load from item stats (ADR 0008). It is fixed when the duel starts: a missed item answered right this duel is still worked in early on the next pass, and play again starts from the list as the last duel left it. If the list hasn't loaded by the first round, the duel starts with a plain shuffle and works the missed items into the rest of the pass once it arrives.

Difficulty still applies (ADR 0009): only missed items in the chosen tiers are in the pool to be worked in. Scoring, the fuse and comebacks don't change. Guests keep the plain shuffle; they have no word history.

## Practice duels

An account can also play a **practice duel**, started from PRACTISE MISSED WORDS at the top of the Wordbook's MISSED tab. It opens a chooser of the ways the account has missed words in the current pack, each with its count: each Word Strike direction, and Gap Guard when the pack has gap sentences. A way needs at least 5 missed items; below that it is greyed out, and the button only shows when some way has enough. Choosing a way opens that duel's usual ready screen, set to practise. Nothing about it is on the title screen.

A practice duel draws only that way's missed items, any tier (difficulty doesn't apply). The list is fixed when the duel starts and dealt in the same shuffled no-repeat order, reshuffling once every item is dealt; play again starts from the list as the last duel left it. In Gap Guard each missed grammar point is asked once per pass, through one of its gap sentences picked at random.

Everything else plays as a normal duel, comebacks included. Its rounds go into word history like any duel's, so a missed item answered right leaves the list. It never saves a best score and is never called a new best: the HUD and game over show PRACTICE where the best sits. Best scores stay comparable that way, because a duel of only the words you got wrong isn't the same game. Guests can't reach it, since the Wordbook already asks them to sign in (ADR 0008).

## Considered options

- **Ask missed items twice, or more often than others.** Rejected: it breaks the no-repeat rule (nothing comes back until the whole pool has been dealt), and seeing the same word twice in a duel teaches its position, not the word. Coming early gets the same "meet it again soon" effect.
- **Missed items first, all in a row.** Rejected: a duel that opens with a run of the player's weakest words feels like a punishment, and costs hearts before the player has warmed up. One in three keeps them early but mixed in.
- **A weakness score from miss rate, runs and answer time.** Left for later. "Last missed" is what comebacks already use, needs no new data, and is easy to explain.
