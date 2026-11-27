# Versus runs on Ably, with our server as the referee

Two friends race on Word Strike in a private **room**. One makes it from VERSUS in the title bar and shares its four-letter **room code** or link (`/versus/<code>`); the other joins, and both get the same prompts at the same time. The first right answer our server receives breaks the other player's heart.

**Our server decides everything.** It deals the room's prompts (Word Strike's shuffled draw within the room maker's difficulty, fixed when the room is made), checks each answer with the pack's matching settings, and records each round in Postgres (`versus_room`, `versus_round`). A round's winner is written by one conditional `UPDATE` that only succeeds while the round has no outcome, so whichever right answer the database runs first wins and the other changes nothing. A wrong answer locks that player out of the round with no heart lost; if both are wrong, or the fuse runs out with nobody right, no heart breaks and the answer is revealed. The fuse starts at the solo start and is 1 s shorter for each heart broken, down to the solo floor. There is no server timer: when a round's deadline passes, either browser asks the server to catch up, which ends the round and deals the next one. Every step is safe to repeat.

**Ably carries the result to both browsers, and browsers only listen.** After every change the server publishes the whole room as one snapshot on the channel `versus:<code>`, over Ably's REST API. A browser gets a short-lived token from our server that may subscribe to its own room's channel and nothing else, and listens over server-sent events, so there is no SDK to add. Answers go to our server as server actions, never through Ably. Each snapshot is complete and numbered, so a missed message is repaired by the next one, and a browser whose connection is down asks the server every two seconds instead. A round's accepted answers reach the browser only with its result.

**The browser replays the snapshots through the solo duel reducer** (ADR 0002): an outcome is whose heart broke, or none. The reducer gained a versus flag (no stages, scores, combos or comebacks; the duel ends when either side runs out of hearts) and takes the fuse from the server. The duel screen draws the other player's hearts where solo draws stage progress (ADR 0005).

**Guests and accounts both play** (ADR 0006, 0008). A seat is held by a secret the browser keeps for the tab; the room stores only its hash. An account lends its name to the room and nothing else; versus keeps no best score and nothing in word history. A room nobody joins expires after 30 minutes, a joined one after three hours, and expired rooms are deleted, rounds and all, whenever a new room is made.

## Considered options

- **Browsers publish to each other over Ably and agree on the winner.** Rejected: either browser could claim it answered first, and two clocks never agree on "first". One referee is simpler and can't be argued with.
- **WebSockets on our own server.** Rejected: Vercel functions don't hold connections open. Ably's free plan covers this, and our server stays stateless.
- **The Ably SDK in the browser.** Not needed: listening is all a browser does, and server-sent events do that with the browser's own `EventSource`.
- **Judging answers by when the player typed them, adjusted for latency.** Left out: answers are judged by arrival at the server.
