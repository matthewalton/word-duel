# Word Duel

A pixel-art vocabulary game in which the player fights a rival by answering prompts in a language they are learning.

## The duel

**Duel**:
One game from START to game over, made of rounds against a single rival.
_Avoid_: Match, session

**Ready screen**:
The duel board before the first round: hearts and score are shown, the prompt is hidden, and a START button sits in the middle. Shown when a duel is opened from the hub or the Single player area; play again after game over skips it.
_Avoid_: Lobby, start screen

**Countdown**:
The 3, 2, 1, GO! after START and before the first round. It runs once per duel, not after a stage clear.

**Rival**:
The opponent whose hearts the player breaks. In solo play the rival is the CPU, and its hearts are drawn as stage progress rather than as hearts; in versus it is the other player, whose hearts are drawn as hearts.
_Avoid_: Enemy, opponent, mascot

**Heart**:
One unit of life in a heart row. A right answer breaks one of the rival's hearts; a wrong answer or timeout breaks one of the player's.
_Avoid_: Life, HP

**Stage progress**:
How many right answers are left before the next stage, drawn in solo play as a thin bar of chunks under the header. Each chunk is one of the CPU rival's hearts.
_Avoid_: Level bar, XP

**Round**:
One prompt and its outcome.
_Avoid_: Question, turn

**Outcome**:
The result of a round, expressed as whose heart broke and why (correct, wrong or timeout).

**Fuse**:
The time limit on a round, shown as a shrinking bar. A code term only: interface text never says "fuse", it says time.
_Avoid_: Timer, countdown (the countdown is the 3, 2, 1 before the first round)

**Stage**:
A level of the duel. Clearing all of the rival's hearts advances the stage and shortens the fuse.
_Avoid_: Level, wave

**Combo**:
The number of right answers in a row; it multiplies points up to a cap.

**Difficulty**:
Easy, Normal or Hard, picked on the minigame cards in the Single player area; one setting shared by both minigames, remembered in this browser, and used by the hub's quick PLAY and by a new room. It decides which tiers the duel draws items from: Easy tier 1, Normal tiers 1–2, Hard every tier. A gap sentence counts as the tier of the item it tests. It does not change the fuse.
_Avoid_: Level (a stage is a level of the duel), mode
_Avoid_: Streak

**Best score**:
The highest score reached, kept per language pack and per minigame. Only an account has one; a guest has no best score, even for the page.
_Avoid_: High score

## Versus

**Versus**:
Two players racing each other on the same Word Strike or Gap Guard prompts in a private room. The first right answer (or pick) the server receives breaks the other player's heart; a wrong one locks that player out of the round, and if nobody is right in time no heart breaks. The last player with hearts wins. Guests and accounts both play; only an account keeps a versus record (ADR 0012).
_Avoid_: Multiplayer, PvP, online mode

**Room**:
Where one versus duel is played: two seats, PLAYER 1 who made it and PLAYER 2 who joined, with the maker's language pack, minigame, difficulty and (for Word Strike) direction. Every duel in the room, rematches included, plays its minigame. A room nobody joins expires after 30 minutes.
_Avoid_: Lobby, match, game

**Rematch**:
The next versus duel in the same room with the same settings, started from REMATCH at game over once both players have pressed it: fresh hearts, a fresh shuffle and the countdown again. A room closes when both players have left it, or 10 minutes after its last duel ended.
_Avoid_: Play again (that is solo), replay

**Leaving**:
A player leaves a room by pressing MENU, or by being gone (tab closed, connection lost) for 15 seconds. Leaving before a versus duel is won loses it: the other player sees "Rival left: you win". A player who has left can't come back to the room.
_Avoid_: Quitting, forfeiting, disconnecting

**Versus record**:
An account's versus duels, read from the account menu's VERSUS RECORD: played, won, lost (and win rate from 5 played), head-to-head against each rival account, and the 10 most recent. A rival who leaves loses; duels against guests count in the totals only. Only duels won after it shipped are in it. Interface text says "match" here, as in "Recent matches".
_Avoid_: Stats, versus history, ladder

**Room code**:
The four letters that name a room, from consonants that can't be misread (no I, O, L, Y or vowels, so they never spell a word). Typed into the hub's VERSUS panel or the Versus area, or opened as the link `/versus/<code>`.
_Avoid_: Room ID, PIN, invite code

## Content

**Language pack**:
A self-contained set of data for one target language learned from one base language: words, gap sentences, fonts, feedback phrases and matching settings.
_Avoid_: Language, course, deck

**Language picker**:
The language chip in the top bar: it names the current language pack's target language in its own words and opens a menu of every pack, with REMEMBER ON THIS DEVICE. The choice is remembered in this browser, not on the account; it shows only when there are two or more packs.
_Avoid_: Language switcher, language menu, settings

**Language step**:
The first screen at `/`: one tile per language pack, REMEMBER MY LANGUAGE (on by default) and CONTINUE, which opens the hub. Skipped when a language is remembered on this device.
_Avoid_: Onboarding, language screen

**Target language**:
The language being learned.
_Avoid_: Foreign language, L2

**Base language**:
The language the player already knows, used for translations and answers in the reverse direction.
_Avoid_: Native language, L1

**Direction**:
Which way a Word Strike round is translated: base → target or target → base.

**Item**:
One thing the player learns in a language pack: a word, or a grammar point such as the object particle 을/를. Word history is kept per item, whichever minigame asked it.
_Avoid_: Card, entry, vocab

**Tier**:
How hard an item is, from 1 (easiest) to 3, set in the language pack: a word's comes from its grade or frequency band in the source list, a grammar point's is set by hand in the order a course teaches it. A right answer is worth more points the higher its item's tier.
_Avoid_: Grade (that is the source list's word for it), level

**Prompt**:
One way of asking about an item, which the player must answer: a word to translate or a gap sentence. Each prompt tests exactly one item.
_Avoid_: Card, question

**Prompt kind**:
How a prompt asks about its item: translate to the target language, translate to the base language, or fill a gap. An item's stats are kept separately for each prompt kind.
_Avoid_: Mode (that word is avoided for minigames), skill

**Accepted answer**:
Any answer that counts as right for a prompt. Matching is strictly right or wrong.
_Avoid_: Correct answer (when more than one form is valid)

**Feedback band**:
The strip shown over the bottom of the prompt after an outcome: one short label and one target-language word (the feedback phrase or the answer).
_Avoid_: Toast, message bar

**Stage band**:
The feedback band shown instead of CORRECT on the right answer that clears a stage: STAGE and the new stage number, with the pack's stage-clear phrase.

**Comeback**:
A right answer, by an account, to an item whose last outcome in this prompt kind was a miss before the duel began. It shows the comeback band in place of CORRECT (the stage band still wins), sparks burst off the prompt and the breaking stage chunk glints. Each item makes one comeback per duel; guests never see one.
_Avoid_: Redemption, revenge, fixed

**Missed item**:
An item whose last outcome in a prompt kind, for an account, was a miss (wrong or too slow). Comebacks use it, and every duel's draw order works missed items in early, about one round in three, until they have all been dealt (ADR 0010).
_Avoid_: Weak word, mistake

**Comeback band**:
The feedback band shown on a comeback: COMEBACK and the pack's comeback phrase.

**Practice duel**:
A duel, for an account, that asks only its missed items for one prompt kind, any tier, started from PRACTISE MISSED in the Study area or PRACTISE MISSED WORDS in the Wordbook. Its rounds go into word history, but it never keeps a best score; the HUD and game over show PRACTICE instead. A prompt kind needs at least 5 missed items (ADR 0010).
_Avoid_: Training, review mode, missed mode

**Review list**:
The rounds the player lost in a duel, each with its accepted answer and what they gave (or "too slow"), shown at game over. Kept in memory for the duel only.
_Avoid_: Missed-words list, mistakes

**Feedback phrase**:
A short target-language exclamation shown by effects, so feedback also teaches.

## Minigames

**Minigame**:
A way of producing rounds and taking answers that shares the duel's hearts, scoring and effects.
_Avoid_: Mode, game type

**Word Strike**:
The minigame in which the player types the translation of a word.

**Hub**:
The home screen at `/` once a language is chosen, with one panel per area: SINGLE PLAYER (a quick PLAY per minigame), VERSUS (CREATE ROOM and a room code box) and STUDY. Each panel's heading is the door to its area.
_Avoid_: Title screen, menu, home page

**Area**:
One of the hub's three parts, Single player, Versus and Study, each with its own screen headed by a title strip in its colour and a back button to the hub.
_Avoid_: Mode, section, tab

**Single player area**:
The area screen at `/play` where the player chooses a minigame, its direction and difficulty, and plays against the CPU rival.
_Avoid_: Title screen, solo menu

**Versus area**:
The area screen at `/versus`: make a room (with its Word Strike / Gap Guard switch), join one by room code, and, for an account, the versus record in short with FULL RECORD.
_Avoid_: Versus panel, versus dialog, lobby

**Study area**:
The area screen at `/study`: the Wordbook, with the latest missed items, and PRACTISE MISSED for each way to practise (each Word Strike direction and Gap Guard), off until it has 5 missed items. A guest sees both dimmed under a SIGN IN banner.
_Avoid_: Study page, review area

**Quick PLAY**:
A minigame's PLAY button on the hub: it opens that minigame's duel with the difficulty and direction last picked in the Single player area.

**Top bar**:
The row on top of the hub and the area screens: the brand or a back button, an area's title strip, the language picker and the account corner (SIGN IN or the account chip).

**Active card**:
The minigame card in the Single player area that Enter or PLAY will start. Other minigames' cards are inactive and show their preview dimmed.
_Avoid_: Selected mode

**Preview**:
A static picture of one round of a minigame, built from the language pack, shown on its card.

**How-to panel**:
The illustrated rules for one minigame, opened from the active card's ? button.
_Avoid_: Help, tutorial

**Gap Guard**:
The minigame in which the player picks the missing piece of a target-language sentence from three options.

## Accounts

**Guest**:
A player who has not signed in. Guests can play everything, but nothing they do is kept after the page closes.
_Avoid_: Anonymous user, logged-out user

**Account**:
A signed-in player's record, reached through one or more OAuth providers; more providers are linked from the account menu. Progress kept in an account follows the player across devices.
_Avoid_: Profile, user (in interface text)

**Word history**:
An account's record of every round it played, kept as the round log and item stats.
_Avoid_: Mistakes, missed words

**Round log**:
Every round an account played, in order: the item and prompt, the outcome, what the player gave and how long they took.
_Avoid_: Answer history, events

**Item stats**:
An account's running totals for one item and prompt kind: right, wrong and too slow, the current run of right answers, and when it was last seen and last missed.
_Avoid_: Word score, mastery

**Wordbook**:
The page where an account reads its word history one item at a time, in two tabs: MISSED (newest miss or most missed first) and BEST (most accurate, once answered enough times). Each row opens like an accordion to show the item's stats by prompt kind, run, too slow count, average answer time and wrong answers. Reached from the Study area, the account menu and game over; a guest who opens it is asked to sign in. The MISSED tab's EXPORT TO ANKI saves its items as an Anki export.
_Avoid_: Word history page (word history is the data), mistakes, review list (that is game over's list)

**Anki export**:
A text file of the Wordbook's MISSED tab, in its current order, that Anki imports directly (File › Import) into the deck `<game name>::<target language>`. It holds one **item card** per missed item (front the target, back every accepted answer or the grammar description) and, for an item missed in Gap Guard, one **gap card** per gap sentence testing it (front the sentence with its blank and translation, back the answer and the filled sentence). Each card's id comes from the item or prompt id, so exporting again updates the same notes. Built in the browser, for accounts only.
_Avoid_: Deck, flashcard export, download
