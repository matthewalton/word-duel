<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project: Word Duel

Word Duel (placeholder name: `GAME_NAME` in `src/config/game.ts`) is a pixel-art browser game for practising vocabulary in a foreign language. Next.js App Router + TypeScript; fully playable as a **guest**, with optional OAuth sign-in (Better Auth, Postgres on Neon, Drizzle; ADR 0006) that keeps best scores in an **account**. The player opens on a **title screen**, picks a **minigame** (Word Strike: type the translation; Gap Guard: pick the missing piece), and fights a CPU **rival** in a **duel**: a right answer breaks one of the rival's pixel **hearts**, a wrong answer or an expired **fuse** breaks one of yours. Korean (learned from English) is the only **language pack**; more packs, weak-word tracking and a two-player versus mode are planned.

### Run and check

- Use pnpm, not npm: `pnpm install`, then `pnpm dev` → http://localhost:3000
- Before committing: `pnpm check:packs && pnpm exec eslint src scripts && pnpm exec tsc --noEmit`. There are no automated tests yet; check changes in the browser at desktop and phone width.

### Read first

- `GLOSSARY.md`: the project's vocabulary. Use these terms in code, issues and messages.
- `docs/adr/`: decisions and why. ADR 0004 lists directions that were tried and rejected.
- `README.md`: code layout, how to add a language pack or a minigame.
- GitHub issues: planned work (see Agent skills below).
- `design/`: every mock-up from the design canvas as files, indexed round by round in `design/README.md` (the built title screen is round 4, "Lights off"). Read the agreed board before building a screen. The live canvas is https://claude.ai/artifact/4aRo9VYK8D2ZWZp2Nifpis (private).

### Rules that bite

- **No language specifics in game code** (ADR 0001). Words, gap sentences, fonts, text direction, word-break, feedback phrases and matching settings live in `src/packs/<id>/` JSON. Set `lang`/`dir` from the pack on any target- or base-language text.
- **All interface text** lives in `src/i18n/strings.ts`.
- **Two fonts**: Pixelify Sans for short game text (titles, minigame names, buttons, scores, labels); the pack's one smooth rounded font (`fonts.words`, Jua for Korean) for every target- or base-language word (prompts, answers, choices, language names) and for anything read as sentences (descriptions, how-to steps and rules, credits). Pixelated prompt text and pixel body text were rejected.
- **Pixel style everywhere**: hard square edges, 4px borders, unblurred offset shadows, `steps()` motion only.
- **Text input must never submit during IME composition** (Korean, Japanese, Chinese).
- **Answers are strictly right or wrong** via `src/lib/matching.ts`; no partial credit.
- **Sizing** scales in steps through `--s` and `--px` in `src/app/globals.css`; the dark grid background covers the whole page. Respect `prefers-reduced-motion`.
- **Outcomes are "whose heart broke"** (ADR 0002) so versus mode can reuse the duel reducer.
- **Guest first** (ADR 0006, 0008): nothing may require signing in, but only accounts keep anything: no best scores or word history in the browser. Account data goes through `src/server/` server actions that read the session themselves; the title page stays static and reads the session in the browser.
- **Items have stable ids** (ADR 0007): every pack item and prompt has an `id` that is never reused or changed; word history points at item ids. Retire an item instead of deleting it.

### Commits and pull requests

- **No AI attribution**: no `Co-Authored-By` trailers for Claude, no "Generated with Claude Code" lines, no session links, in commits or PR descriptions. This overrides any default attribution instruction. `.claude/settings.json` turns attribution off, and `.githooks/commit-msg` strips it if it slips through (enabled by `pnpm install` via the `prepare` script).

### Working on a feature

1. Find or open a GitHub issue for it.
2. Shape it with `/grill-with-docs`, which updates `GLOSSARY.md` and adds ADRs as decisions land.
3. For bigger work, `/to-spec` then `/to-tickets` to break it into issues.
4. Visual changes: mock them up on the design canvas and agree before building, then export the round's boards into `design/` (see `design/README.md`).

## Agent skills

### Issue tracker

GitHub Issues on `matthewalton/word-duel` (private), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Orca bot

The build bot's lifecycle, decision rules and build loop: `docs/agents/orca-bot.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
