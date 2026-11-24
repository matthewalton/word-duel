# Word Duel

A pixel-art vocabulary game in which the player fights a rival by answering prompts in a language they are learning.

## The duel

**Duel**:
One game from START to game over, made of rounds against a single rival.
_Avoid_: Match, session

**Ready screen**:
The duel board before the first round: hearts and score are shown, the prompt is hidden, and a START button sits in the middle. Shown when a duel is opened from the title screen; play again after game over skips it.
_Avoid_: Lobby, start screen (that is the title screen)

**Countdown**:
The 3, 2, 1, GO! after START and before the first round. It runs once per duel, not after a stage clear.

**Rival**:
The opponent whose hearts the player breaks. In solo play the rival is the CPU, and its hearts are drawn as stage progress rather than as hearts; in versus it would be the other player.
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
_Avoid_: Streak

**Best score**:
The highest score reached, kept per language pack and per minigame.
_Avoid_: High score

## Content

**Language pack**:
A self-contained set of data for one target language learned from one base language: words, gap sentences, fonts, feedback phrases and matching settings.
_Avoid_: Language, course, deck

**Target language**:
The language being learned.
_Avoid_: Foreign language, L2

**Base language**:
The language the player already knows, used for translations and answers in the reverse direction.
_Avoid_: Native language, L1

**Direction**:
Which way a Word Strike round is translated: base → target or target → base.

**Prompt**:
The text the player must answer: a word or a gap sentence.
_Avoid_: Card, question

**Accepted answer**:
Any answer that counts as right for a prompt. Matching is strictly right or wrong.
_Avoid_: Correct answer (when more than one form is valid)

**Feedback band**:
The strip shown over the bottom of the prompt after an outcome: one short label and one target-language word (the feedback phrase or the answer).
_Avoid_: Toast, message bar

**Stage band**:
The feedback band shown instead of CORRECT on the right answer that clears a stage: STAGE and the new stage number, with the pack's stage-clear phrase.

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

**Title screen**:
The screen before a duel where the player chooses a minigame, its direction, and plays.
_Avoid_: Menu, home, start screen

**Active card**:
The minigame on the title screen that Enter or PLAY will start. Other minigames' cards are inactive and show their preview dimmed.
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
A player who has not signed in. Guests can play everything; their progress is kept in this browser only.
_Avoid_: Anonymous user, logged-out user

**Account**:
A signed-in player's record, reached through one or more OAuth providers; more providers are linked from the account menu. Progress kept in an account follows the player across devices.
_Avoid_: Profile, user (in interface text)

**Guest merge**:
Bringing a browser's guest progress into an account whenever the browser holds any while signed in: a guest best score only fills a minigame the account has no score for (an account best is never replaced), word history is added, and the browser's guest progress is then deleted.
_Avoid_: Sync, import
