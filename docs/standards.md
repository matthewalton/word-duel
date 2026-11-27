# Code standards

Every agent follows these when building, and the reviewer checks every PR against them (see Review in `docs/agents/orca-bot.md`). Each rule says why in one line and, where it helps, points at code that already does it. Words in **bold** are `GLOSSARY.md` terms.

## 1. Correctness

- **Handle the empty and odd cases the game really has**: an empty pool after a difficulty or retired-item filter, a pack with no gap sentences (`Minigame.hasContent`), a guest (`null`) next to an account, a list that hasn't loaded yet. Why: a draw must never deal from an empty pool, and a guest must never see or send account data. See the practice duel's fallback in `startDraw` (`src/game/useDuel.ts`).
- **Retired items are never asked, but their ids still resolve.** Draws read `askableWords`/`askableGaps`; word history checks every id, retired ones included (`lookup` in `src/server/history.ts`). Why: ADR 0007, history outlives content.
- **Timers and async calls can't land late.** Clear intervals and timeouts in the effect cleanup, and guard a promise that sets state with a `live` flag (`useLastMissed`, the missed list in `useDuel`). Why: a duel left mid-fuse or a pack switched mid-load must not dispatch into the next one.
- **Races are settled by the server, not by timing.** A versus round is won by one conditional `UPDATE … WHERE outcome IS NULL` (`answer` in `src/server/versusRoom.ts`), and every server action is safe to repeat (a duel's browser-made `id` keeps a double send to one row). Why: ADR 0012; two browsers and a retry must agree.
- **Don't swallow errors silently.** A `catch` either shows the player something or carries a comment saying what happens instead (`// Offline: no comebacks this time.`). Server code throws or logs; it never returns success it didn't have. Why: an empty catch hides the bug and the reader can't tell it was meant.
- **The server checks everything the browser sends.** Server actions take `unknown`, parse with a strict zod schema and check ids against the pack (`duelSchema` and `isValidRound` in `src/server/history.ts`). Why: anyone can call a server action.

## 2. TypeScript

- **`strict` stays on; no `any`, no `@ts-ignore`, no unchecked `as`.** The one deliberate exception is the pack JSON casts in `src/packs/index.ts`, which `pnpm check:packs` validates instead (so zod stays out of the browser). Narrow `unknown` with zod or a type guard (`isBestEntry` in `src/server/progress.ts`). Why: a cast is a type hole the compiler can't see.
- **Derive types from the schema that already exists**: `z.infer` for packs (`src/packs/types.ts`) and server input (`DuelRecord`), `$inferSelect` for tables (`Room` in `src/server/versusRoom.ts`), `as const satisfies` for shared lists (`DIRECTIONS`, `PROMPT_KINDS`). Why: one source of truth, no drift.
- **Unions over flags, and every case handled.** Model state as discriminated unions (`DuelAction`, `Phase`, `Reason`); a `switch` on one covers every member, ending in a `never` check when it has a `default`. Why: adding a member then fails to compile where it isn't handled.
- **`null` means "doesn't apply", not "not loaded"** where both exist: `best: null` is a guest, a missing key in `MissedLists` is still loading. Write which one in the doc comment. Why: guest vs account is decided by these values.

## 3. Modern React and performance

React 19 and Next.js 16 App Router. Read `node_modules/next/dist/docs/` before using a Next API; it differs from older versions.

- **Pages stay static; the session is read in the browser.** `src/app/page.tsx`, `src/app/play/page.tsx` and `src/app/wordbook/page.tsx` render a client screen and never call `headers()` or the session. Account data goes through `"use server"` actions in `src/server/` that read the session themselves. Why: ADR 0006/0008, the hub must be fast and cacheable.
- **Server-only code imports `server-only`** (`src/server/db.ts`, `auth.ts`), and secrets are read on the server only. Nothing that needs the database, zod or a secret ships to the client. Why: bundle size and leaked keys.
- **No effect for derived state.** Compute it in render, or reset state by a key during render (`useLastMissed` keys its state by user and pack). Effects are for timers, subscriptions and server calls. Browser-only values come from `useSyncExternalStore` with a server snapshot (`currentPackId` in `src/lib/packChoice.ts`), not a mount effect. Why: an extra render and a flash of wrong content.
- **Game rules live in the pure reducer**, controllers wire them to clocks and servers (`duelReducer` vs `useDuel`/`useVersusDuel`). Timed actions carry `at` so the reducer stays pure. Why: ADR 0002, versus reuses it, and it can be tested.
- **Stable keys**: an id when a list can reorder, grow in the middle or shrink; an index only for lists fixed while shown (fuse segments, the review list at game over). Why: index keys on changing lists mix up state and effects.
- **Stream only what is per request.** A page that needs a request value (route params) wraps that part in `<Suspense>` so the shell stays static (`src/app/versus/[code]/page.tsx`); data a client screen needs from an account loads through a server action, not by making the page dynamic. Why: the shell renders at build time and paints at once.
- **Memo only where it pays**: a `useMemo` that keeps an object prop stable for an effect's deps (`opts` in `GameScreen`) is fine; wrapping cheap components in `memo` is noise. Disabling `react-hooks/exhaustive-deps` needs a comment saying why. Why: memo has a cost and hides real dependency bugs.

## 4. Simplicity and reuse

- **The smallest change that does the job.** No options, props or config nobody asked for; no abstraction for one caller. Why: every knob is code to read and test.
- **Reuse before adding**: `isAcceptedAnswer` for any answer check, `LangSpan`/`Template` for tagged text, the registry helpers for pack content, `RULES`/`VERSUS` in `src/config/game.ts` for numbers, `strings.ts` for copy, the shared controls in `src/components/ui/` (ADR 0013), the existing CSS modules and `--s`/`--px` for sizing. Why: two copies drift.
- **No dead code**: remove what the change made unused, and no commented-out code. Why: it misleads the next reader.
- **Comments say why or what a value means, in glossary terms**, not what the next line does. Name things with **glossary** words (`round`, `fuse`, `missed item`, never `question`, `timer`, `weak word`). Why: one vocabulary in code, issues and the game.

## 5. Accessibility

- **Real elements, through the shared set**: `Button` from `src/components/ui/` for actions (it renders `<button type="button">`), `<a>`/`Link` for navigation, `<input>` with a label, and the shared `Dialog` (Radix Dialog) for modals, `Menu` for menus, `ToggleGroup` for a one-of-several switch and `Tabs` for tabs (`HowToDialog`, `LanguagePicker`, ADR 0013). No clickable `div`, no hand-built open state or key handling for a menu or dialog. Why: keyboard, focus and screen readers come for free, and every control shares one focus ring.
- **Playable by keyboard**: focus moves to the answer input on each new prompt and to the next action at game over (`WordStrike.tsx`), Enter submits, Escape closes a dialog. Text input never submits during IME composition (check `isComposing` and `keyCode 229`, as in `WordStrike.tsx`). Why: Korean, Japanese and Chinese typists would submit half a word.
- **`lang` and `dir` on every target- or base-language text**, taken from the pack (`LangSpan`, `FeedbackBand`). Why: screen readers and line breaking pick the right language; ADR 0001.
- **Contrast and size**: text keeps at least 4.5:1 on the dark grid, and sizes scale with `--s`. Hearts and icons that carry meaning have a text label or `aria-label`; decorative ones are `aria-hidden`. Why: the game is read fast, under a fuse.
- **Respect `prefers-reduced-motion`**: each CSS module ends with a `@media (prefers-reduced-motion: reduce)` block that stops shakes, sparks and flashes. Why: motion sensitivity.

## 6. Architecture and ADRs

Follow every ADR in `docs/adr/`. A change that breaks one needs a new or updated ADR in the same PR, agreed with Matt. ADR 0004 lists directions not to bring back.

- **No language specifics in game code** (ADR 0001). Words, gap sentences, fonts, text direction, word-break, feedback phrases and matching settings live in `src/packs/<id>/` JSON; components never name a language, script or font.
- **Pack content only through the registry** (`src/packs/index.ts`; ADR 0007). Every item and prompt has an `id` that is never changed or reused; retire an item instead of deleting it.
- **All interface text in `src/i18n/strings.ts`.** No literal copy in components.
- **Outcomes are whose heart broke** (ADR 0002): `{ loser, reason }`, never "correct: true".
- **Answers are strictly right or wrong** via `src/lib/matching.ts`; no partial credit (ADR 0004).
- **Guest first** (ADR 0006, 0008): nothing requires signing in, but only accounts keep anything. No best scores or word history in the browser; `localStorage` is only for settings like the language picker (ADR 0011), read and written inside try/catch.
- **Database only on the server**, through `src/server/`; the browser never talks to Postgres or Ably's publish API (ADR 0012).
- **Two fonts**: Pixelify Sans for short game text (titles, minigame names, buttons, scores, labels); the pack's one smooth rounded font (`fonts.words`, Jua for Korean) for every target- or base-language word and anything read as sentences (descriptions, how-to steps, credits). Pixelated prompt text and pixel body text were rejected.
- **Pixel style everywhere**: hard square edges, 4px borders, unblurred offset shadows, `steps()` motion only. Sizing steps through `--s` and `--px` in `src/app/globals.css`; the dark grid covers the whole page.
- **New screens follow an agreed board on the design canvas** (`docs/design.md`).

## 7. Tests

- **Logic changes come with `node --test` tests** in a `*.test.mts` next to the module (`src/lib/random.test.mts`): game rules and the reducer, draw order, matching, scoring, and server checks. Pure functions first; that is why rules live in the reducer and `src/lib/`. Why: these are the rules players notice when they break.
- **Checks green before review**: `pnpm check:packs`, `eslint src scripts`, `tsc --noEmit`, `pnpm test` and `pnpm build` (`.github/workflows/checks.yml`). UI changes are also checked in the browser at desktop and phone width.

## Severity

Every review finding gets one grade:

- **High**: a bug or wrong behaviour, a security or data issue, an accessibility blocker, or breaking an ADR. Fixed before the PR is ready.
- **Medium**: a real cost to maintainability or performance, missing tests for changed logic, a type hole, or an outdated React pattern with a real downside. Fixed before the PR is ready, unless the builder explains in the PR why not.
- **Low**: naming, small simplifications, nits. The builder fixes them or lists them in the PR as possible follow-ups.

Findings on code the PR didn't touch aren't graded; the reviewer may suggest them as `found-by-bot` issues instead.
