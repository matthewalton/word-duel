# Backlog

Ideas waiting to be shaped. When one is picked up, grill it (`/grill-with-docs`), write a spec at `.scratch/<feature-slug>/spec.md`, then break it into tickets under `.scratch/<feature-slug>/issues/`.

Status: `idea` → `shaping` → `specced` → `in progress` → `done` (or `dropped`, with a reason).

| Feature | Status | Notes |
| --- | --- | --- |
| Responsive game screen | done | Steps up in size with the window; fills the height. |
| Full-screen game background | done | The dark grid covers the whole page; a miss flashes the page edge. |
| Title screen | done | Split cards with an active card (lights-off inactive), how-to panel, phone carousel. Design on the start-screens canvas, round 4 "Lights off". |
| Account sign-in | idea | Needs a backend, which breaks "local only, no backend". Grill before starting: worth an ADR. |
| Weakest-word tracking | idea | Record misses per word and per direction; surface weak words. Open question: does it need accounts, or start in localStorage? |
| Two-player versus | idea | Room code, same prompt, server decides who answered first. See ADR 0002. |
| Language picker + more packs | idea | Pack registry already supports it. |
