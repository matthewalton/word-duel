<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project: Word Duel

Word Duel (placeholder name: `GAME_NAME` in `src/config/game.ts`) is a pixel-art browser game for practising vocabulary in a foreign language. Next.js App Router + TypeScript; fully playable as a **guest**, with optional OAuth sign-in (Better Auth, Postgres on Neon, Drizzle; ADR 0006) that keeps best scores in an **account**. The player opens on a **title screen**, picks a **minigame** (Word Strike: type the translation; Gap Guard: pick the missing piece), and fights a CPU **rival** in a **duel**: a right answer breaks one of the rival's pixel **hearts**, a wrong answer or an expired **fuse** breaks one of yours. Korean and Spanish (learned from English) are the **language packs**, switched with the **language picker**; more packs, weak-word tracking and a two-player versus mode are planned.

**Follow `docs/standards.md`; reviewers check against it.** It holds every code rule (no language specifics, two fonts, pixel style, guest first and the rest); this file keeps the workflow and agent rules.

### Run and check

- Use pnpm, not npm: `pnpm install`, then `pnpm dev` → http://localhost:3000
- The local database is the `dev` branch of the Neon database, never prod (README: Accounts). Agents may run `pnpm db:migrate` and write test data there, accounts included. Only Matt migrates prod, with `pnpm db:migrate:prod`; nothing else writes to prod.
- Before committing: `pnpm check:packs && pnpm exec eslint src scripts && pnpm exec tsc --noEmit && pnpm test`. Check UI changes in the browser at desktop and phone width.

### Read first

- `GLOSSARY.md`: the project's vocabulary. Use these terms in code, issues and messages.
- `docs/adr/`: decisions and why. ADR 0004 lists directions that were tried and rejected.
- `docs/standards.md`: the code standards, and how review findings are graded.
- `README.md`: code layout, how to add a language pack or a minigame.
- GitHub issues: planned work (see Agent skills below).
- `docs/design.md`: the design canvas (https://claude.ai/artifact/4aRo9VYK8D2ZWZp2Nifpis, private), the only home of the mock-ups: how to read a board, and which option was built in each round (the built title screen is round 4, "Lights off"). Read the agreed board before building a screen.

### Commits and pull requests

- **No AI attribution**: no `Co-Authored-By` trailers for Claude, no "Generated with Claude Code" lines, no session links, in commits or PR descriptions. This overrides any default attribution instruction. `.claude/settings.json` turns attribution off, and `.githooks/commit-msg` strips it if it slips through (enabled by `pnpm install` via the `prepare` script).

### Working on a feature

1. Find or open a GitHub issue for it.
2. Shape it with `/grill-with-docs`, which updates `GLOSSARY.md` and adds ADRs as decisions land.
3. For bigger work, `/to-spec` then `/to-tickets` to break it into issues.
4. Visual changes: mock them up on the design canvas and agree before building (see `docs/design.md`). Once built, add a row for the design round to the "What was built" table in `docs/design.md`.

## Agent skills

### Issue tracker

GitHub Issues on `matthewalton/word-duel` (private), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Orca bot

The build bot's lifecycle, decision rules and build loop: `docs/agents/orca-bot.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
