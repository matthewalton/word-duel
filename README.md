# Word Duel (placeholder name)

A small pixel-art word duel for vocabulary practice. Everything works as a guest; signing in (OAuth) keeps best scores in an account. See ADR 0006.

```bash
pnpm install  # also enables the repo's git hooks (.githooks/)
pnpm dev      # http://localhost:3000
```

CI (`.github/workflows/checks.yml`, **Checks**) runs on every pull request and push to `main`: pack check, eslint, tsc, `pnpm test` and `pnpm build`, on the Node version in `.nvmrc`.

Rename the game in `src/config/game.ts` (`GAME_NAME`).

Without a `.env.local` the game runs as guest-only; SIGN IN shows but can't complete. To work on accounts, see [Accounts](#accounts).

## Layout

| Path | What lives there |
| --- | --- |
| `src/config/game.ts` | Game name, default pack id, duel rules (hearts, fuse, scoring) |
| `src/i18n/strings.ts` | All interface text |
| `src/packs/<id>/` | A language pack: `meta.json`, `words.json`, `grammar.json`, `gaps.json`, `feedback.json`, `matching.json` |
| `src/packs/schema.ts` | Pack schemas (zod); `src/packs/types.ts` infers the types from them |
| `src/packs/index.ts` | Pack registry (the only way game code reads pack content) and font loading |
| `scripts/` | `pnpm check:packs` validates every pack; `pnpm packs:ids` gives new entries an id |
| `src/lib/matching.ts` | The one answer-matching function, driven by pack settings |
| `src/game/duel.ts` | Pure duel reducer shared by every minigame |
| `src/game/useDuel.ts` | Solo controller: fuse timer, CPU rival, best scores |
| `src/game/minigames/` | One module per minigame, plus the registry |
| `src/components/` | Title screen, how-to panel, duel screen, HUD, hearts, prompt board, effects, sign-in panel and account corner |
| `src/components/ui/` | Shared controls: Button, Dialog, Menu, Toggle group, Panel (Radix behaviour, our pixel styles; ADR 0013) |
| `src/lib/progress.ts` | Best scores, for accounts only: a guest has none |
| `src/lib/useAccount.ts` | Session in the browser, loading account best scores, sign in and out |
| `src/server/` | Server only: Drizzle schema, database, Better Auth, server actions for account data |
| `drizzle/` | Generated SQL migrations |

## Pack content

A pack's content is **items** (what the player learns) and **prompts** (one way of asking about an item); see ADR 0007. Every entry has an envelope (`id`, `kind`, and `tests` on prompts) and a payload for its kind, one entry per line:

| File | Kind | Payload |
| --- | --- | --- |
| `words.json` | item, `word` | `target`, optional `targetAlt`, `base` (accepted answers, main one first), `tier` (1 easiest to 3; ADR 0009) |
| `grammar.json` | item, `grammar` | `target` (e.g. `을/를`), `base` (short description), `tier` (1 easiest to 3, set by hand; ADR 0009) |
| `gaps.json` | prompt, `gap` | `tests` (an item id), `sentence` with one `___`, `translation`, `answer`, `options` |

A Word Strike round asks a word item directly; a gap tests the one item named by `tests`.

- **Adjectives** show the masculine singular (`target`). In packs whose adjectives agree, the feminine singular goes in `targetAlt` when it is spelt differently, so it counts as right too; plurals stay out. Gap sentences test agreement on purpose.
- **Ids are forever.** Word history points at item ids, so never change or reuse one, even to fix a typo in the word. Homographs get one entry and id per meaning (`눈.eye`, `눈.snow`).
- **Retire, don't delete.** Set `"retired": true` on an entry to stop asking it; prompts that test a retired item stop too.
- **Adding entries:** write them without `id`/`kind`, run `pnpm packs:ids` (it only fills in missing ids), add `tests` to new gaps, then run `pnpm check:packs`.

`pnpm check:packs` validates every pack against `src/packs/schema.ts`: no unknown fields, ids unique across the pack, every `tests` pointing to an item, the answer among the options, and exactly one `___` per sentence.

## Adding a language pack

1. Copy `src/packs/ko-en/` to a new folder named after the pack id and replace the data (see Pack content).
2. Pick one smooth, rounded Google font that covers both scripts, for every word in either language (`meta.json` → `fonts.words`). Interface text stays in the pixel font.
3. Set `dir`, `wordBreak` and `nativeName` per language in `meta.json`.
4. Register it in `src/packs/index.ts`. The language picker lists it by itself, and a minigame's card shows only if the pack has content for it.
5. Run `pnpm check:packs`.

## Adding a minigame

Write a module that implements `Minigame` (`src/game/types.ts`): it builds `Round`s from the pack (reading entries through the registry, skipping retired ones via `askableWords`/`askableGaps`, and setting each round's `itemId`, `promptId`, `promptKind` and `tier`; set `usesDifficulty` if it draws by `opts.difficulty`, and give it blurbs in `strings.difficulty.blurbs`) and renders its own controls, its title-screen `Preview` and its three `HowTo` steps. Hearts, scoring, fuse, banners and effects come from the shared duel. Then add it to `src/game/minigames/index.ts`, and give it a label in `strings.modes` and a description and steps in `strings.minigameInfo`.

## Accounts

Postgres (Neon, through the Vercel Marketplace) with Drizzle, and Better Auth for OAuth sign-in with Google, GitHub and Discord. Decisions are in ADR 0006.

**Databases**: prod is the main branch of the Neon project; local development and every agent use its `dev` branch, one shared by all worktrees. `.env.local` holds dev values only, and prod values live only in Vercel's Production environment. On dev you, and agents, may run migrations and write test data, accounts included. `pnpm db:reset:dev` prints how to reset dev from prod (Neon's "Reset from parent"), which replaces its schema and data with prod's.

**Local setup**

1. Copy `.env.example` to `.env.local`; each value's comment says where its dev value comes from. `vercel link` to the Word Duel project and `vercel env pull .env.local` fills most of them from the Development environment (`BETTER_AUTH_URL=http://localhost:3000`, the dev GitHub app), but the Neon integration gives it prod's database: replace `DATABASE_URL` and `DATABASE_URL_UNPOOLED` with the `dev` branch's connection strings and delete the `PG*` and `POSTGRES_*` lines. Put local-only overrides in `.env.development.local`, which the pull doesn't touch.
2. Without Vercel access, fill `.env.local` by hand: a Postgres `DATABASE_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL=http://localhost:3000`, and a client id and secret for each provider. A provider without both is left out. Versus also needs `ABLY_API_KEY`, an Ably key with Publish, Subscribe and Presence, restricted to `versus:*` channels; it is read on the server only. Dev shares prod's Ably key, so in development a room's channel is `versus:dev-<code>` and never meets a prod room.
3. `pnpm db:migrate` to create the tables. It names the host it migrates: check that it's the dev branch.

In Vercel, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` and the GitHub id and secret have different values for Production and Development. Google and Discord use one app for both.

**OAuth apps**: each provider needs the callback `<BETTER_AUTH_URL>/api/auth/callback/<google|github|discord>`, once for `http://localhost:3000` and once for production. GitHub allows one callback per app, so make a dev app and a production app.

**Schema changes**: edit `src/server/schema.ts`, run `pnpm db:generate` and commit the new file in `drizzle/`, then `pnpm db:migrate` to apply it to dev. Prod gets it when Matt runs `pnpm db:migrate:prod` from a checkout linked to Vercel: it pulls the Production credentials into a private temp folder, shows the prod host and asks before migrating, and deletes the folder afterwards, even when the migration fails. `pnpm db:migrate:prod --dry-run` prints the steps without fetching anything. Better Auth's four tables (user, session, account, verification) must keep its field names.

Server actions in `src/server/` check the session themselves; never trust a user id sent from the browser.

## Versus

Two players race on Word Strike in a private room (ADR 0012). The server is the referee: `src/server/versus.ts` (server actions) and `src/server/versusRoom.ts` deal the prompts, check answers and decide each round in one conditional `UPDATE`, then publish the room's snapshot over Ably (`src/server/ably.ts`, REST only). Browsers never publish: they listen and enter the channel's presence over Ably's realtime protocol on a plain WebSocket, with a token for their own room only (`src/lib/versusChannel.ts`); the server asks Ably who is present to tell when a player has dropped. A rematch starts the next match in the same room. `src/game/useVersusDuel.ts` replays snapshots through `duelReducer`, whose outcomes are *whose heart broke* (`loser: "you" | "rival" | null`), so the duel screen and Word Strike's controls are shared with solo.

## Credits (Korean pack)

- Word selection: 국립국어원 (National Institute of Korean Language), *한국어 학습용 어휘 목록* (2003), nouns from grades A, B and C, which set their tiers 1, 2 and 3. KOGL Type 1 (attribution). <https://www.korean.go.kr/front_eng/down/down_02V.do?etc_seq=70>
- English answers: hand-edited, using glosses from [kengdic](https://github.com/garfieldnate/kengdic) (Joe Speigle and contributors) as reference. LGPL 2.0 or later; the repo README also offers MPL 2.0, and its `datapackage.json` lists CC BY-SA 3.0.

Credits are also in `src/packs/ko-en/meta.json` and shown under the game screen.

## Credits (Spanish pack)

- Word selection and tiers: Hermit Dave, [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Spanish, OpenSubtitles 2018): each word's most frequent form ranked in the top 1,000, 3,000 or 6,000 sets tiers 1, 2 and 3 (ADR 0009). CC BY-SA 4.0.
- English answers: written by hand, with [English Wiktionary](https://en.wiktionary.org/) as reference. CC BY-SA 4.0.

Credits are also in `src/packs/es-en/meta.json` and shown under the game screen.

## Credits (French pack)

- Word selection and tiers: Hermit Dave, [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (French, OpenSubtitles 2018): each word's most frequent form ranked in the top 1,000, 3,000 or 6,000 sets tiers 1, 2 and 3 (ADR 0009). CC BY-SA 4.0.
- English answers: written by hand, with [English Wiktionary](https://en.wiktionary.org/) as reference. CC BY-SA 4.0.

Credits are also in `src/packs/fr-en/meta.json` and shown under the game screen.
