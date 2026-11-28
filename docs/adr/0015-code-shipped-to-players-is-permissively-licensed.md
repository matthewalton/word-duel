# Code shipped to players is permissively licensed

The Anki export's `.apkg` deck (#116) is written in the browser, so its library ships to every player who taps EXPORT TO ANKI. Matt first approved genanki-js for it, but it is AGPL-3.0-or-later (a fork of the AGPL mkanki), and shipping it in the client bundle would put the AGPL's source-offer terms on Word Duel, a private repo. It was rejected for its licence on 2026-11-28. Instead `src/lib/ankiPackage.ts` writes the `.apkg` itself on **sql.js** (MIT) and **JSZip** (dual MIT or GPL-3.0-or-later; we take MIT), with the schema and default JSON ported from the MIT-licensed Python **genanki**, whose notice the file keeps. From now on a new client dependency's licence is checked before it is added: code that ships to players is permissive (MIT, BSD, Apache-2.0, ISC and the like), never copyleft. Server-only and dev-only tools are not shipped and are not bound by this rule. The Credits page (#119) will list these licences to players.

## Considered options

- **genanki-js.** Rejected: AGPL-3.0-or-later in the client bundle.
- **A server route that builds the deck.** Rejected: the AGPL's network clause reaches server code too, and the deck needs nothing the browser doesn't already have.
