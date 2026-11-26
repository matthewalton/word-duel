"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import styles from "@/components/game.module.css";
import { HowToStep, PreviewFuse, StageProgressVisual } from "@/components/HowToParts";
import { wordBreakStyle } from "@/components/LangSpan";
import t from "@/components/title.module.css";
import { fill, strings } from "@/i18n/strings";
import { askableWords } from "@/packs";
import type { LanguagePack } from "@/packs/types";
import {
  langText,
  type ControlsProps,
  type LangText,
  type Minigame,
  type MinigameOptions,
  type ShowcaseProps,
} from "../types";
import { buildRound, startDraw } from "./wordStrikeRounds";

function WordStrikeControls({ round, phase, onSubmit, onStart }: ControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const composing = useRef(false);

  const inGame = phase === "countdown" || phase === "playing" || phase === "resolving";
  // Typing is allowed during the countdown so the input can hold focus, but
  // nothing submits until the round is live (and the input is cleared then).
  const editable = phase === "countdown" || phase === "playing";

  // Focus while the START press is still being handled, so phones open the
  // keyboard: a focus from the later timer would not count as a user gesture.
  useLayoutEffect(() => {
    if (phase !== "countdown" || !inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.focus();
  }, [phase]);

  // Fresh, focused input for every new prompt. The input is uncontrolled so
  // IME composition is never interrupted by React re-renders.
  useEffect(() => {
    if (phase !== "playing" || !inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.focus();
  }, [round.promptId, phase]);

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
        readOnly={!editable}
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
        onClick={phase === "gameOver" ? onStart : submitNow}
        disabled={phase !== "gameOver" && phase !== "playing"}
      >
        {phase === "gameOver" ? strings.start : strings.go}
      </button>
    </div>
  );
}

/** The pack's first word as prompt and typed answer, in the chosen direction. */
function sample(pack: LanguagePack, opts: MinigameOptions): { prompt: LangText; answer: LangText; answerName: string } {
  const word = askableWords(pack)[0];
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
  usesDifficulty: true,
  hasContent: (pack) => askableWords(pack).length > 0,
  sampleRound: (pack, opts) => buildRound(pack, opts, askableWords(pack)[0]),
  startDraw,
  Controls: WordStrikeControls,
  Preview: WordStrikePreview,
  HowTo: WordStrikeHowTo,
};
