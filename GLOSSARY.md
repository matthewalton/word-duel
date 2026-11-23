# Word Duel

A pixel-art vocabulary game in which the player fights a rival by answering prompts in a language they are learning.

## The duel

**Duel**:
One game from START to game over, made of rounds against a single rival.
_Avoid_: Match, session

**Rival**:
The opponent whose hearts the player breaks. In solo play the rival is the CPU; in versus it would be the other player.
_Avoid_: Enemy, opponent, mascot

**Heart**:
One unit of life in a heart row. A right answer breaks one of the rival's hearts; a wrong answer or timeout breaks one of the player's.
_Avoid_: Life, HP

**Round**:
One prompt and its outcome.
_Avoid_: Question, turn

**Outcome**:
The result of a round, expressed as whose heart broke and why (correct, wrong or timeout).

**Fuse**:
The time limit on a round, shown as a shrinking bar.
_Avoid_: Timer, countdown

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

**Feedback phrase**:
A short target-language exclamation shown by effects, so feedback also teaches.

## Minigames

**Minigame**:
A way of producing rounds and taking answers that shares the duel's hearts, scoring and effects.
_Avoid_: Mode, game type

**Word Strike**:
The minigame in which the player types the translation of a word.

**Gap Guard**:
The minigame in which the player picks the missing piece of a target-language sentence from three options.
