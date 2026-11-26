# Design canvas export

A snapshot of the Word Duel design canvas (https://claude.ai/artifact/4aRo9VYK8D2ZWZp2Nifpis), exported on 2026-11-26 so any agent can read the mock-ups as files. Each round explored two to four options for one screen or feature; the agreed one was then built in `src/`.

## Reading the files

- `canvas/*.dc.html` is one artboard each. The markup and inline styles carry the exact colours, sizes, borders, shadows and spacing; the `<style>` block holds the `steps()` keyframes; the `<script type="text/x-dc">` class at the bottom holds the states and sample data (`renderVals()` returns the values the `{{…}}` placeholders take).
- `<sc-for>` repeats its contents for each item in a list, `<sc-if>` shows them only when a value is true, and `<dc-import name="X" …>` reuses artboard `X` with the props given (many small files are just one import of a bigger board).
- `canvas/canvas.json` is the canvas layout: where each board sits and the round titles.
- The files reference a `support.js` that the canvas supplies and that is not in this export, so opening one straight in a browser shows unfilled `{{…}}` placeholders. To see one rendered, open the canvas link above.

## What was built

The code in `src/` is the source of truth for what shipped; these boards show the options considered and why the shipped one looks the way it does. Picks below were worked out by comparing the boards with the code. Later rounds refine earlier ones, so the newest round on a screen wins.

| Round | Built | How it carried on |
| --- | --- | --- |
| Before START (Word Strike, Gap Guard) | C · title and mode cards | Refined in rounds 2 to 6 |
| 2 · minimal, full screen | C1 · minimal split (`MinSplit`, `MinPhone`) | Round 3 kept the split |
| 3 · active card that expands | `StartSplit`, `StartCarousel` on a phone | The title screen today |
| 4 · inactive card | 3 · Lights off (`InactiveDark`) | |
| 5 · two fonts | C · Pixelify Sans for all game text, Jua for anything read | Now a rule in AGENTS.md |
| 6 · direction toggle | 1 · outlined, names with an arrow, one button (`ToggleOutline`) | `DirectionLabel` |
| 7 · duel screen | Mixed: C's header and input, A's feedback band | Round 8 |
| 8 · where the fuse goes | 3 · burns in under the word (`DuelTimerWord`) | Round 9 |
| 9 · duel screen, final | All boards as shown, desktop and phone, both minigames | The duel today |
| 10 · ready screen | A · bare START, plus the 3 · 2 · 1 · GO! countdown | |
| 11 · last answer, game over | All boards as shown | Round 12 replaced the separate stage card |
| 12 · clearing a stage | 2 · one STAGE band instead of CORRECT (`StageB`) | `FeedbackBand` |
| 13 · optional sign-in | All boards as shown | |
| 14 · linking sign-ins | B · one list of sign-in methods, LINKED or LINK (`AccountLinkList`) | |
| 15 · wordbook and the ways in | All boards; all three ways in were built | Round 16 replaced the rows |
| 16 · wordbook rows | 3 · accordion (`WordbookRowExpand`) | |
| 17 · COMEBACK | B · band, sparks off the word, the stage chunk glints (`ComebackSparks`) | |
| 18 · difficulty | A · three-way switch (`DifficultyRow`, `DifficultyPhone`) | |

## Keeping it current

This is a copy, not a sync. New mock-ups still go on the canvas first (AGENTS.md, Working on a feature); after a round is agreed, export its boards here and add them to the index below.

## Rounds

### Word Strike: before START

| File | What it shows | Size |
| --- | --- | --- |
| [Main.dc.html](canvas/Main.dc.html) | A · How-to card · Word Strike | 760×640 |
| [AttractStrike.dc.html](canvas/AttractStrike.dc.html) | B · Attract demo · Word Strike | 760×640 |
| [TitleStrike.dc.html](canvas/TitleStrike.dc.html) | C · Title + mode cards · Word Strike | 760×640 |

### Gap Guard: before START

| File | What it shows | Size |
| --- | --- | --- |
| [HowToGap.dc.html](canvas/HowToGap.dc.html) | A · How-to card · Gap Guard | 760×640 |
| [AttractGap.dc.html](canvas/AttractGap.dc.html) | B · Attract demo · Gap Guard | 760×640 |
| [TitleGap.dc.html](canvas/TitleGap.dc.html) | C · Title + mode cards · Gap Guard | 760×640 |

### Round 2: minimal, full screen, explain on demand

| File | What it shows | Size |
| --- | --- | --- |
| [MinSplit.dc.html](canvas/MinSplit.dc.html) | C1 · Minimal split | 1280×800 |
| [MinExplain.dc.html](canvas/MinExplain.dc.html) | C1 · Explain more open | 1280×800 |
| [MinFocus.dc.html](canvas/MinFocus.dc.html) | C2 · Minimal single focus | 1280×800 |
| [MinPhone.dc.html](canvas/MinPhone.dc.html) | C1 · Phone | 390×844 |

### Round 3: split with an active card that expands

| File | What it shows | Size |
| --- | --- | --- |
| [StartSplit.dc.html](canvas/StartSplit.dc.html) | C3 · Split, Word Strike active (try it) | 1280×800 |
| [StartSplitGap.dc.html](canvas/StartSplitGap.dc.html) | C3 · Split, Gap Guard active | 1280×800 |
| [StartCarousel.dc.html](canvas/StartCarousel.dc.html) | C3 · Phone carousel (try it) | 390×844 |

### Round 4: what the inactive card shows

| File | What it shows | Size |
| --- | --- | --- |
| [InactiveName.dc.html](canvas/InactiveName.dc.html) | Inactive 1 · Big name | 1280×800 |
| [InactiveSpine.dc.html](canvas/InactiveSpine.dc.html) | Inactive 2 · Narrow spine | 1280×800 |
| [InactiveDark.dc.html](canvas/InactiveDark.dc.html) | Inactive 3 · Lights off | 1280×800 |
| [InactiveTeaser.dc.html](canvas/InactiveTeaser.dc.html) | Inactive 4 · Teaser | 1280×800 |

### Round 5: two fonts, quieter language picker

| File | What it shows | Size |
| --- | --- | --- |
| [TypeSplit.dc.html](canvas/TypeSplit.dc.html) | Type A · Pixel names, Jua for reading | 1280×800 |
| [TypeB.dc.html](canvas/TypeB.dc.html) | Type B · Pixel only for controls and scores | 1280×800 |
| [TypeC.dc.html](canvas/TypeC.dc.html) | Type C · Pixel for all game text | 1280×800 |
| [TypeSwap.dc.html](canvas/TypeSwap.dc.html) | Type A · one swap button instead of two | 1280×800 |

### Round 6: type C, smaller controls, one toggle

| File | What it shows | Size |
| --- | --- | --- |
| [ToggleOutline.dc.html](canvas/ToggleOutline.dc.html) | Toggle 1 · Outlined, arrow only | 1280×800 |
| [ToggleSplit.dc.html](canvas/ToggleSplit.dc.html) | Toggle 2 · Swap key in the middle | 1280×800 |
| [ToggleKey.dc.html](canvas/ToggleKey.dc.html) | Toggle 3 · Swap key between plain names | 1280×800 |

### Round 7: duel screen in one box, climb stages instead of CPU hearts

| File | What it shows | Size |
| --- | --- | --- |
| [DuelCabinet.dc.html](canvas/DuelCabinet.dc.html) | Duel A · One cabinet, fuse under the HUD | 1280×800 |
| [DuelTower.dc.html](canvas/DuelTower.dc.html) | Duel B · Stage tower, fuse on the input | 1280×800 |
| [DuelPath.dc.html](canvas/DuelPath.dc.html) | Duel C · Stage path, fuse is the top edge | 1280×800 |
| [DuelCabinetPhone.dc.html](canvas/DuelCabinetPhone.dc.html) | Duel A · Phone | 390×844 |

### Round 8: C header and input, A feedback band, four places for the fuse

| File | What it shows | Size |
| --- | --- | --- |
| [DuelTimerDrain.dc.html](canvas/DuelTimerDrain.dc.html) | Timer 1 · Prompt area drains · progress in the separator | 1280×800 |
| [DuelTimerHeader.dc.html](canvas/DuelTimerHeader.dc.html) | Timer 2 · Countdown in the header · progress pips by score | 1280×800 |
| [DuelTimerWord.dc.html](canvas/DuelTimerWord.dc.html) | Timer 3 · Burns in under the word · progress up the left edge | 1280×800 |
| [DuelTimerEdge.dc.html](canvas/DuelTimerEdge.dc.html) | Timer 4 · Strip above the feedback · progress in the separator | 1280×800 |

### Round 8: the same frame on a right answer, a wrong answer and a new stage

| File | What it shows | Size |
| --- | --- | --- |
| [DuelStateHit.dc.html](canvas/DuelStateHit.dc.html) | Right answer | 1280×800 |
| [DuelStateMiss.dc.html](canvas/DuelStateMiss.dc.html) | Wrong answer | 1280×800 |
| [DuelStateStage.dc.html](canvas/DuelStateStage.dc.html) | Next stage | 1280×800 |

### Round 9: thin progress bar, fuse under the word, no language toggle

| File | What it shows | Size |
| --- | --- | --- |
| [DuelFinalPlaying.dc.html](canvas/DuelFinalPlaying.dc.html) | Final · Playing | 1280×800 |
| [DuelFinalHit.dc.html](canvas/DuelFinalHit.dc.html) | Final · Right answer | 1280×800 |
| [DuelFinalMiss.dc.html](canvas/DuelFinalMiss.dc.html) | Final · Wrong answer | 1280×800 |
| [DuelFinalStage.dc.html](canvas/DuelFinalStage.dc.html) | Final · Next stage | 1280×800 |

### Round 9: phone

| File | What it shows | Size |
| --- | --- | --- |
| [DuelPhonePlaying.dc.html](canvas/DuelPhonePlaying.dc.html) | Phone · Playing | 390×844 |
| [DuelPhoneHit.dc.html](canvas/DuelPhoneHit.dc.html) | Phone · Right answer | 390×844 |
| [DuelPhoneMiss.dc.html](canvas/DuelPhoneMiss.dc.html) | Phone · Wrong answer | 390×844 |
| [DuelPhoneStage.dc.html](canvas/DuelPhoneStage.dc.html) | Phone · Next stage | 390×844 |

### Round 9: Gap Guard in the same frame

| File | What it shows | Size |
| --- | --- | --- |
| [DuelGapPlaying.dc.html](canvas/DuelGapPlaying.dc.html) | Gap Guard · Playing | 1280×800 |
| [DuelGapHit.dc.html](canvas/DuelGapHit.dc.html) | Gap Guard · Right answer | 1280×800 |
| [DuelGapMiss.dc.html](canvas/DuelGapMiss.dc.html) | Gap Guard · Wrong answer | 1280×800 |
| [DuelGapStage.dc.html](canvas/DuelGapStage.dc.html) | Gap Guard · Next stage | 1280×800 |

### Round 9: Gap Guard on a phone

| File | What it shows | Size |
| --- | --- | --- |
| [DuelGapPhonePlaying.dc.html](canvas/DuelGapPhonePlaying.dc.html) | Gap Guard phone · Playing | 390×844 |
| [DuelGapPhoneHit.dc.html](canvas/DuelGapPhoneHit.dc.html) | Gap Guard phone · Right answer | 390×844 |
| [DuelGapPhoneMiss.dc.html](canvas/DuelGapPhoneMiss.dc.html) | Gap Guard phone · Wrong answer | 390×844 |
| [DuelGapPhoneStage.dc.html](canvas/DuelGapPhoneStage.dc.html) | Gap Guard phone · Next stage | 390×844 |

### Round 10: ready screen, START, then 3 · 2 · 1 · GO! before the first round

| File | What it shows | Size |
| --- | --- | --- |
| [ReadyBare.dc.html](canvas/ReadyBare.dc.html) | Ready A · Bare START (try it) | 1280×800 |
| [ReadyRule.dc.html](canvas/ReadyRule.dc.html) | Ready B · Direction + one rule line (try it) | 1280×800 |
| [ReadyCount.dc.html](canvas/ReadyCount.dc.html) | Countdown · held on 2 | 1280×800 |
| [ReadyPhoneBare.dc.html](canvas/ReadyPhoneBare.dc.html) | Phone · Ready A (try it) | 390×844 |
| [ReadyPhoneRule.dc.html](canvas/ReadyPhoneRule.dc.html) | Phone · Ready B (try it) | 390×844 |
| [ReadyPhoneCount.dc.html](canvas/ReadyPhoneCount.dc.html) | Phone · Countdown on GO! | 390×844 |

### Round 11: see the last answer, then review your misses at game over

| File | What it shows | Size |
| --- | --- | --- |
| [EndLastMiss.dc.html](canvas/EndLastMiss.dc.html) | 1 · Last heart breaks: the answer is held for 1.5s | 1280×800 |
| [EndOver.dc.html](canvas/EndOver.dc.html) | 2 · Then game over, with the misses to review | 1280×800 |
| [EndOverGap.dc.html](canvas/EndOverGap.dc.html) | Gap Guard · Game over with review | 1280×800 |
| [EndPhoneOver.dc.html](canvas/EndPhoneOver.dc.html) | Phone · Game over with review | 390×844 |
| [EndPhoneOverGap.dc.html](canvas/EndPhoneOverGap.dc.html) | Gap Guard phone · Game over with review | 390×844 |

### Round 11: CORRECT, then a stage card on its own

| File | What it shows | Size |
| --- | --- | --- |
| [StageCard.dc.html](canvas/StageCard.dc.html) | After the CORRECT band: the stage card | 1280×800 |
| [StageCardPhone.dc.html](canvas/StageCardPhone.dc.html) | Phone · Stage card | 390×844 |

### Round 12: three ways to clear a stage, playing on a loop

| File | What it shows | Size |
| --- | --- | --- |
| [StageA.dc.html](canvas/StageA.dc.html) | Option 1 · Bar and header only (plays on a loop) | 1280×800 |
| [StageB.dc.html](canvas/StageB.dc.html) | Option 2 · One STAGE band instead of CORRECT (plays on a loop) | 1280×800 |
| [StageC.dc.html](canvas/StageC.dc.html) | Option 3 · Nothing extra (plays on a loop) | 1280×800 |

### Round 13: optional sign-in, guest play stays first

| File | What it shows | Size |
| --- | --- | --- |
| [SignIn.dc.html](canvas/SignIn.dc.html) | 1 · Guest: SIGN IN in the corner (try the whole flow) | 1280×800 |
| [SignInPanel.dc.html](canvas/SignInPanel.dc.html) | 2 · Sign-in panel: three providers, guest stays an option | 1280×800 |
| [SignInMenu.dc.html](canvas/SignInMenu.dc.html) | 3 · Signed in: your progress came with you; menu to sign out | 1280×800 |
| [EndOverGuest.dc.html](canvas/EndOverGuest.dc.html) | 4 · Game over as a guest: offer to keep these words | 1280×800 |
| [SignInPhone.dc.html](canvas/SignInPhone.dc.html) | Phone · Guest (try it) | 390×844 |
| [SignInPhonePanel.dc.html](canvas/SignInPhonePanel.dc.html) | Phone · Sign-in panel | 390×844 |

### Round 14: link Google, GitHub and Discord into one account

| File | What it shows | Size |
| --- | --- | --- |
| [AccountLink.dc.html](canvas/AccountLink.dc.html) | A · Linked ones in the 'Signed in with' line, LINK buttons below (try it) | 1280×800 |
| [AccountLinkError.dc.html](canvas/AccountLinkError.dc.html) | A · GitHub already has its own account: refused (click LINK GITHUB) | 1280×800 |
| [AccountLinkList.dc.html](canvas/AccountLinkList.dc.html) | B · One list of sign-in methods, LINKED or LINK (try it) | 1280×800 |
| [AccountLinkListError.dc.html](canvas/AccountLinkListError.dc.html) | B · GitHub already has its own account: refused (click LINK) | 1280×800 |

### Round 15: WORDBOOK, your missed and best words in two tabs

| File | What it shows | Size |
| --- | --- | --- |
| [Wordbook.dc.html](canvas/Wordbook.dc.html) | 1 · MISSED tab, newest first (try the tabs and ORDER) | 1280×800 |
| [WordbookBest.dc.html](canvas/WordbookBest.dc.html) | 2 · BEST tab: most accurate, 5+ answers | 1280×800 |
| [WordbookGuest.dc.html](canvas/WordbookGuest.dc.html) | 3 · Guest: sign in to keep a wordbook | 1280×800 |
| [WordbookEmpty.dc.html](canvas/WordbookEmpty.dc.html) | 4 · Signed in, nothing played yet | 1280×800 |
| [WordbookPhone.dc.html](canvas/WordbookPhone.dc.html) | Phone · MISSED (try it) | 390×844 |
| [WordbookPhoneBest.dc.html](canvas/WordbookPhoneBest.dc.html) | Phone · BEST | 390×844 |

### Round 15: three ways in: title bar, account menu, game over

| File | What it shows | Size |
| --- | --- | --- |
| [TitleWordbook.dc.html](canvas/TitleWordbook.dc.html) | A · Title bar: WORDBOOK on the left, for everyone (guest shown, click it) | 1280×800 |
| [TitleWordbookMenu.dc.html](canvas/TitleWordbookMenu.dc.html) | B · Signed in: WORDBOOK also heads the account menu | 1280×800 |
| [EndOverWordbook.dc.html](canvas/EndOverWordbook.dc.html) | C · Game over with an account: OPEN WORDBOOK under the misses | 1280×800 |
| [TitleWordbookPhone.dc.html](canvas/TitleWordbookPhone.dc.html) | Phone · Title bar: book button left of the name | 390×844 |

### Round 16: calmer wordbook rows, no GAP or EN > 한 chips

| File | What it shows | Size |
| --- | --- | --- |
| [WordbookRowBar.dc.html](canvas/WordbookRowBar.dc.html) | Row 1 · One pixel bar per word: right and missed, no breakdown | 1280×800 |
| [WordbookRowWords.dc.html](canvas/WordbookRowWords.dc.html) | Row 2 · Plain sentence, plus which way it goes wrong only when it matters | 1280×800 |
| [WordbookRowExpand.dc.html](canvas/WordbookRowExpand.dc.html) | Row 3 · Accordion: word and misses in the header, stats inside (try it) | 1280×800 |
| [WordbookRowExpandPhone.dc.html](canvas/WordbookRowExpandPhone.dc.html) | Phone · Row 3 (try it) | 390×844 |

### Round 17: COMEBACK, a right answer on a word you last missed

| File | What it shows | Size |
| --- | --- | --- |
| [ComebackDark.dc.html](canvas/ComebackDark.dc.html) | A · Dark COMEBACK band with twinkling pixels (plays on a loop) | 1280×800 |
| [ComebackSparks.dc.html](canvas/ComebackSparks.dc.html) | B · COMEBACK band, sparks burst off the word, the stage chunk glints (plays on a loop) | 1280×800 |
| [ComebackStamp.dc.html](canvas/ComebackStamp.dc.html) | C · COMEBACK band plus a FIXED! stamp by the word (plays on a loop) | 1280×800 |
| [ComebackPhone.dc.html](canvas/ComebackPhone.dc.html) | Phone · A, switch option in Tweaks | 390×844 |

### Round 18: pick a difficulty for Word Strike

| File | What it shows | Size |
| --- | --- | --- |
| [DifficultyRow.dc.html](canvas/DifficultyRow.dc.html) | A · Three-way switch above PLAY, one line on what it asks (try it) | 1280×800 |
| [DifficultyCycle.dc.html](canvas/DifficultyCycle.dc.html) | B · One button beside the language toggle, click to cycle (try it) | 1280×800 |
| [DifficultyTabs.dc.html](canvas/DifficultyTabs.dc.html) | C · Tabs on the preview, which shows a word from that level (try it) | 1280×800 |
| [DifficultyPhone.dc.html](canvas/DifficultyPhone.dc.html) | Phone · A (try it) | 390×844 |

