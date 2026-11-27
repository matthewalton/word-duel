"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/game.module.css";
import { HowToStep, PreviewFuse, StageProgressVisual } from "@/components/HowToParts";
import { wordBreakStyle } from "@/components/LangSpan";
import t from "@/components/title.module.css";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
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
import { buildRound, practiceWords, startDraw, startPracticeDraw } from "./wordStrikeRounds";

function WordStrikeControls({ round, phase, onSubmit, onStart, locked = false }: ControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const inGame = phase === "countdown" || phase === "playing" || phase === "resolving";
  // Typing is allowed during the countdown so the input can hold focus, but
  // nothing submits until the round is live (and the input is cleared then).
  const editable = (phase === "countdown" || phase === "playing") && !locked;

  // An empty, focused input on START (the countdown) and for every new prompt.
  const freshKey = phase === "countdown" ? "countdown" : phase === "playing" ? `prompt-${round.promptId}` : null;

  useEffect(() => {
    if (phase === "gameOver") buttonRef.current?.focus();
  }, [phase]);

  const submitNow = () => {
    const value = inputRef.current?.value ?? "";
    if (phase !== "playing" || locked || !value.trim()) return;
    onSubmit(value);
  };

  return (
    <div className={styles.typeRow}>
      <TextInput
        ref={inputRef}
        label={strings.inputLabel}
        freshKey={freshKey}
        onEnter={submitNow}
        className={styles.answerInput}
        lang={round.answerLang.code}
        dir={round.answerLang.dir}
        placeholder={round.hint}
        disabled={!inGame || locked}
        readOnly={!editable}
      />
      <Button
        ref={buttonRef}
        variant="primary"
        className={styles.goldButton}
        onClick={phase === "gameOver" ? onStart : submitNow}
        disabled={phase !== "gameOver" && (phase !== "playing" || locked)}
      >
        {phase === "gameOver" ? strings.start : strings.go}
      </Button>
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
  practiceItems: (pack, missedItemIds) => practiceWords(pack, missedItemIds).map((w) => w.id),
  startPracticeDraw,
  Controls: WordStrikeControls,
  Preview: WordStrikePreview,
  HowTo: WordStrikeHowTo,
};
