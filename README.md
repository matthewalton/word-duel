# Word Duel (placeholder name)

A small pixel-art word duel for vocabulary practice. Everything works as a guest; signing in (OAuth) keeps best scores in an account. See ADR 0006.

```bash
pnpm install  # also enables the repo's git hooks (.githooks/)
pnpm dev      # http://localhost:3000
```

Rename the game in `src/config/game.ts` (`GAME_NAME`).

Without a `.env.local` the game runs as guest-only; SIGN IN shows but can't complete. To work on accounts, see [Accounts](#accounts).

## Layout

| Path | What lives there |
| --- | --- |
| `src/config/game.ts` | Game name, active pack id, duel rules (hearts, fuse, scoring) |
| `src/i18n/strings.ts` | All interface text |
| `src/packs/<id>/` | A language pack: `meta.json`, `words.json`, `gaps.json`, `feedback.json`, `matching.json` |
| `src/packs/types.ts` | Pack schema |
| `src/packs/index.ts` | Pack registry and font loading |
| `src/lib/matching.ts` | The one answer-matching function, driven by pack settings |
| `src/game/duel.ts` | Pure duel reducer shared by every minigame |
| `src/game/useDuel.ts` | Solo controller: fuse timer, CPU rival, best scores |
| `src/game/minigames/` | One module per minigame, plus the registry |
| `src/components/` | Title screen, how-to panel, duel screen, HUD, hearts, prompt board, effects, sign-in panel and account corner |
| `src/lib/progress.ts` | Where best scores go: this browser for a guest, the account when signed in |
| `src/lib/useAccount.ts` | Session in the browser, guest merge on sign-in, sign in and out |
| `src/server/` | Server only: Drizzle schema, database, Better Auth, server actions for account data |
| `drizzle/` | Generated SQL migrations |

## Adding a language pack

1. Copy `src/packs/ko-en/` to a new folder and replace the data.
2. Pick one smooth, rounded Google font that covers both scripts, for every word in either language (`meta.json` → `fonts.words`). Interface text stays in the pixel font.
3. Set `dir`, `wordBreak` and `nativeName` per language in `meta.json`.
4. Register it in `src/packs/index.ts` and point `ACTIVE_PACK_ID` at it.

Gap sentences mark the blank with `___`.

## Adding a minigame

Write a module that implements `Minigame` (`src/game/types.ts`): it builds `Round`s from the pack and renders its own controls, its title-screen `Preview` and its three `HowTo` steps. Hearts, scoring, fuse, banners and effects come from the shared duel. Then add it to `src/game/minigames/index.ts`, and give it a label in `strings.modes` and a description and steps in `strings.minigameInfo`.

## Accounts

Postgres (Neon, through the Vercel Marketplace) with Drizzle, and Better Auth for OAuth sign-in with Google, GitHub and Discord. Decisions are in ADR 0006.

**Local setup**

1. `vercel link` to the Word Duel project, then `vercel env pull .env.local`. It pulls the Development environment, which holds everything in `.env.example` with local values (`BETTER_AUTH_URL=http://localhost:3000`, the dev GitHub app). The pull overwrites `.env.local`; put local-only overrides in `.env.development.local`.
2. Without Vercel access, fill `.env.local` from `.env.example` by hand: a Postgres `DATABASE_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL=http://localhost:3000`, and a client id and secret for each provider. A provider without both is left out.
3. `pnpm db:migrate` to create the tables.

In Vercel, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` and the GitHub id and secret have different values for Production and Development. Google and Discord use one app for both.

**OAuth apps**: each provider needs the callback `<BETTER_AUTH_URL>/api/auth/callback/<google|github|discord>`, once for `http://localhost:3000` and once for production. GitHub allows one callback per app, so make a dev app and a production app.

**Schema changes**: edit `src/server/schema.ts`, run `pnpm db:generate` and commit the new file in `drizzle/`, then `pnpm db:migrate`. Better Auth's four tables (user, session, account, verification) must keep its field names.

Server actions in `src/server/` check the session themselves; never trust a user id sent from the browser.

## Versus mode (later)

The reducer takes outcomes as *whose heart broke* (`loser: "you" | "rival"`), not as *was the answer right*. A versus controller can replace `useDuel`'s fuse and CPU logic with server messages ("rival answered first" → `loser: "you"`) while reusing `duelReducer`, the minigames and the whole screen. The rival's hearts take the CPU's place in the HUD.

## Credits (Korean pack)

- Word selection: 국립국어원 (National Institute of Korean Language), *한국어 학습용 어휘 목록* (2003), level-1 nouns. KOGL Type 1 (attribution). <https://www.korean.go.kr/front_eng/down/down_02V.do?etc_seq=70>
- English answers: hand-edited, using glosses from [kengdic](https://github.com/garfieldnate/kengdic) (Joe Speigle and contributors) as reference. LGPL 2.0 or later; the repo README also offers MPL 2.0, and its `datapackage.json` lists CC BY-SA 3.0.

Credits are also in `src/packs/ko-en/meta.json` and shown under the game screen.
