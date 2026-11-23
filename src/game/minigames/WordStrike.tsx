"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import styles from "@/components/game.module.css";
import { HowToStep, PreviewFuse, StageProgressVisual } from "@/components/HowToParts";
import { wordBreakStyle } from "@/components/LangSpan";
import t from "@/components/title.module.css";
import { fill, strings } from "@/i18n/strings";
import { pickIndex } from "@/lib/random";
import { normalizeAnswer } from "@/lib/matching";
import type { LanguagePack, WordEntry } from "@/packs/types";
import {
  langText,
  type ControlsProps,
  type LangText,
  type Minigame,
  type MinigameOptions,
  type Round,
  type ShowcaseProps,
} from "../types";

const unique = (items: string[]) => items.filter((x, i) => items.indexOf(x) === i);

/**
 * Accepted answers are gathered across the whole pack, so homographs work:
 * 눈 accepts "eye" and "snow", and "teacher" accepts 선생님 and 선생.
 */
function acceptedTargets(pack: LanguagePack, prompt: string): string[] {
  const lang = pack.meta.base.code;
  const key = normalizeAnswer(prompt, pack.matching, lang);
  return unique(
    pack.words
      .filter((w) => w.base.some((b) => normalizeAnswer(b, pack.matching, lang) === key))
      .flatMap((w) => [w.target, ...(w.targetAlt ?? [])]),
  );
}

function acceptedBases(pack: LanguagePack, word: WordEntry): string[] {
  const forms = [word.target, ...(word.targetAlt ?? [])];
  return unique(
    pack.words
      .filter((w) => forms.includes(w.target) || (w.targetAlt ?? []).some((a) => forms.includes(a)))
      .flatMap((w) => w.base),
  );
}

function buildRound(pack: LanguagePack, opts: MinigameOptions, index: number): Round {
  const word = pack.words[index];
  const { target, base } = pack.meta;
  const id = `word-strike:${index}`;
  if (opts.direction === "toTarget") {
    return {
      id,
      itemIndex: index,
      hint: fill(strings.hintTypeIn, { language: target.name }),
      prompt: langText(base, word.base[0]),
      accepted: acceptedTargets(pack, word.base[0]),
      reveal: langText(target, word.target),
      answerLang: { code: target.code, dir: target.dir },
    };
  }
  return {
    id,
    itemIndex: index,
    hint: fill(strings.hintTypeIn, { language: base.name }),
    prompt: langText(target, word.target),
    accepted: acceptedBases(pack, word),
    reveal: langText(base, word.base.slice(0, 3).join(" / ")),
    answerLang: { code: base.code, dir: base.dir },
  };
}

/** Random round whose prompt text differs from the previous one. */
function nextRound(pack: LanguagePack, opts: MinigameOptions, previous: Round | null): Round {
  let round = buildRound(pack, opts, pickIndex(pack.words.length, previous?.itemIndex ?? null));
  for (let tries = 0; previous && round.prompt.text === previous.prompt.text && tries < 20; tries++) {
    round = buildRound(pack, opts, pickIndex(pack.words.length, round.itemIndex));
  }
  return round;
}

function WordStrikeControls({ round, phase, onSubmit, onStart }: ControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const composing = useRef(false);

  const inGame = phase === "playing" || phase === "resolving" || phase === "stageClear";

  // Fresh, focused input for every new prompt. The input is uncontrolled so
  // IME composition is never interrupted by React re-renders.
  useEffect(() => {
    if (phase !== "playing" || !inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.focus();
  }, [round.id, phase]);

  useEffect(() => {
    if (phase === "gameOver") buttonRef.current?.focus();
  }, [phase]);

  const submitNow = () => {
    const value = inputRef.current?.value ?? "";
    if (phase !== "playing" || !value.trim()) return;
    onSubmit(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    // Never submit while an IME composition is in progress. keyCode 229 covers
    // Safari, which fires the committing Enter after compositionend.
    if (e.nativeEvent.isComposing || composing.current || e.keyCode === 229) return;
    e.preventDefault();
    submitNow();
  };

  return (
    <div className={styles.typeRow}>
      <input
        ref={inputRef}
        className={styles.answerInput}
        lang={round.answerLang.code}
        dir={round.answerLang.dir}
        aria-label={strings.inputLabel}
        placeholder={round.hint}
        disabled={!inGame}
        readOnly={phase !== "playing"}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        onKeyDown={onKeyDown}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={() => (composing.current = false)}
      />
      <button
        ref={buttonRef}
        type="button"
        className={styles.goldButton}
        onClick={inGame ? submitNow : onStart}
        disabled={inGame && phase !== "playing"}
      >
        {inGame ? strings.go : strings.start}
      </button>
    </div>
  );
}

/** The pack's first word as prompt and typed answer, in the chosen direction. */
function sample(pack: LanguagePack, opts: MinigameOptions): { prompt: LangText; answer: LangText; answerName: string } {
  const word = pack.words[0];
  const { target, base } = pack.meta;
  return opts.direction === "toTarget"
    ? { prompt: langText(base, word.base[0]), answer: langText(target, word.target), answerName: target.name }
    : { prompt: langText(target, word.target), answer: langText(base, word.base[0]), answerName: base.name };
}

function WordStrikePreview({ pack, opts }: ShowcaseProps) {
  const { prompt, answer } = sample(pack, opts);
  return (
    <span className={t.preview}>
      <span className={t.pvPrompt} lang={prompt.lang} dir={prompt.dir} style={wordBreakStyle(prompt)}>
        {prompt.text}
      </span>
      <span className={t.pvInput}>
        <span lang={answer.lang} dir={answer.dir}>
          {answer.text}
        </span>
        <span className={t.pvCaret} />
      </span>
      <PreviewFuse lit={9} />
    </span>
  );
}

function WordStrikeHowTo({ pack, opts }: ShowcaseProps) {
  const { prompt, answer, answerName } = sample(pack, opts);
  const steps = strings.minigameInfo["word-strike"].steps;
  return (
    <>
      <HowToStep
        n={1}
        text={steps[0]}
        visual={
          <span className={t.stepPrompt} lang={prompt.lang} dir={prompt.dir}>
            {prompt.text}
          </span>
        }
      />
      <HowToStep
        n={2}
        text={fill(steps[1], { language: answerName })}
        visual={
          <>
            <span className={t.stepInput} lang={answer.lang} dir={answer.dir}>
              {answer.text}
            </span>
            <span className={t.stepKey}>ENTER</span>
          </>
        }
      />
      <HowToStep n={3} text={steps[2]} visual={<StageProgressVisual />} />
    </>
  );
}

export const wordStrike: Minigame = {
  id: "word-strike",
  usesDirection: true,
  sampleRound: (pack, opts) => buildRound(pack, opts, 0),
  nextRound,
  Controls: WordStrikeControls,
  Preview: WordStrikePreview,
  HowTo: WordStrikeHowTo,
};
