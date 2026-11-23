# Word Duel (placeholder name)

A small pixel-art word duel for vocabulary practice. Local only, no backend.

```bash
npm install
npm run dev   # http://localhost:3000
```

Rename the game in `src/config/game.ts` (`GAME_NAME`).

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
| `src/components/` | Screen, HUD, hearts, prompt board, effects |

## Adding a language pack

1. Copy `src/packs/ko-en/` to a new folder and replace the data.
2. Pick a smooth, rounded Google font for prompts and a readable body font that covers the script (`meta.json` → `fonts`).
3. Set `dir` and `wordBreak` per language in `meta.json`.
4. Register it in `src/packs/index.ts` and point `ACTIVE_PACK_ID` at it.

Gap sentences mark the blank with `___`.

## Adding a minigame

Write a module that implements `Minigame` (`src/game/types.ts`): it builds `Round`s from the pack and renders its own controls. Hearts, scoring, fuse, banners and effects come from the shared duel. Then add it to `src/game/minigames/index.ts` and give it a label in `strings.modes`.

## Versus mode (later)

The reducer takes outcomes as *whose heart broke* (`loser: "you" | "rival"`), not as *was the answer right*. A versus controller can replace `useDuel`'s fuse and CPU logic with server messages ("rival answered first" → `loser: "you"`) while reusing `duelReducer`, the minigames and the whole screen. The rival's hearts take the CPU's place in the HUD.

## Credits (Korean pack)

- Word selection: 국립국어원 (National Institute of Korean Language), *한국어 학습용 어휘 목록* (2003), level-1 nouns. KOGL Type 1 (attribution). <https://www.korean.go.kr/front_eng/down/down_02V.do?etc_seq=70>
- English answers: hand-edited, using glosses from [kengdic](https://github.com/garfieldnate/kengdic) (Joe Speigle and contributors) as reference. LGPL 2.0 or later; the repo README also offers MPL 2.0, and its `datapackage.json` lists CC BY-SA 3.0.

Credits are also in `src/packs/ko-en/meta.json` and shown under the game screen.
