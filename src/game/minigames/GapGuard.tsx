"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/game.module.css";
import { HeartsBreakingVisual, HowToStep } from "@/components/HowToParts";
import t from "@/components/title.module.css";
import { strings } from "@/i18n/strings";
import { pickIndex, shuffle } from "@/lib/random";
import { GAP_MARKER, type LanguagePack } from "@/packs/types";
import { langText, type ControlsProps, type Minigame, type Round, type ShowcaseProps } from "../types";

function buildRound(pack: LanguagePack, index: number, shuffleOptions: boolean): Round {
  const gap = pack.gaps[index];
  const { target, base } = pack.meta;
  const [before, after = ""] = gap.sentence.split(GAP_MARKER);
  return {
    id: `gap-guard:${index}`,
    itemIndex: index,
    hint: strings.hintFillGap,
    prompt: langText(target, gap.sentence),
    gap: { before, after },
    translation: langText(base, gap.translation),
    accepted: [gap.answer],
    reveal: langText(target, gap.answer),
    answerLang: { code: target.code, dir: target.dir },
    options: shuffleOptions ? shuffle(gap.options) : gap.options.slice(),
  };
}

const NO_OPTIONS: string[] = [];

function GapGuardControls({ round, phase, outcome, onSubmit, onStart }: ControlsProps) {
  const startRef = useRef<HTMLButtonElement>(null);
  const options = round.options ?? NO_OPTIONS;
  const live = phase === "playing";
  const showStart = phase === "idle" || phase === "gameOver";

  useEffect(() => {
    if (phase === "gameOver") startRef.current?.focus();
  }, [phase]);

  // Number keys 1–9 pick an option.
  useEffect(() => {
    if (!live) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= options.length) onSubmit(options[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, options, onSubmit]);

  const stateClass = (option: string) => {
    if (!outcome) return "";
    if (option === outcome.given) return outcome.reason === "correct" ? styles.choiceRight : styles.choiceWrong;
    if (outcome.reason !== "correct" && option === round.reveal.text) return styles.choiceReveal;
    return "";
  };

  return (
    <div className={styles.choiceArea}>
      <div className={styles.choiceRow}>
        {options.map((option, i) => (
          <button
            key={`${round.id}-${option}`}
            type="button"
            className={`${styles.choiceButton} ${stateClass(option)}`}
            lang={round.answerLang.code}
            dir={round.answerLang.dir}
            disabled={!live}
            onClick={() => onSubmit(option)}
          >
            <span className={styles.choiceKey} aria-hidden="true">
              {i + 1}
            </span>
            {option}
          </button>
        ))}
      </div>
      {showStart && (
        <button ref={startRef} type="button" className={styles.goldButton} onClick={onStart}>
          {strings.start}
        </button>
      )}
    </div>
  );
}

function GapGuardPreview({ pack }: ShowcaseProps) {
  const round = buildRound(pack, 0, false);
  const { lang, dir } = round.prompt;
  return (
    <span className={t.preview}>
      <span className={`${t.pvPrompt} ${t.pvSentence}`} lang={lang} dir={dir} style={{ wordBreak: round.prompt.wordBreak ?? "normal" }}>
        {round.gap?.before}
        <span className={t.pvBlank}>{round.reveal.text}</span>
        {round.gap?.after}
      </span>
      <span className={t.pvChips}>
        {(round.options ?? []).map((o) => (
          <span key={o} lang={lang} dir={dir} className={`${t.pvChip} ${o === round.reveal.text ? t.pvChipOn : ""}`}>
            {o}
          </span>
        ))}
      </span>
    </span>
  );
}

function GapGuardHowTo({ pack }: ShowcaseProps) {
  const round = buildRound(pack, 0, false);
  const { lang, dir } = round.prompt;
  const steps = strings.minigameInfo["gap-guard"].steps;
  return (
    <>
      <HowToStep
        n={1}
        text={steps[0]}
        visual={
          <span className={`${t.stepPrompt} ${t.stepSentence}`} lang={lang} dir={dir}>
            {round.gap?.before}
            <span className={t.stepBlank}>{"\u00A0"}</span>
            {round.gap?.after}
          </span>
        }
      />
      <HowToStep
        n={2}
        text={steps[1]}
        visual={(round.options ?? []).map((o) => (
          <span key={o} lang={lang} dir={dir} className={`${t.stepChip} ${o === round.reveal.text ? t.stepChipOn : ""}`}>
            {o}
          </span>
        ))}
      />
      <HowToStep n={3} text={steps[2]} visual={<HeartsBreakingVisual />} />
    </>
  );
}

export const gapGuard: Minigame = {
  id: "gap-guard",
  usesDirection: false,
  sampleRound: (pack) => buildRound(pack, 0, false),
  nextRound: (pack, _opts, previous) =>
    buildRound(pack, pickIndex(pack.gaps.length, previous?.itemIndex ?? null), true),
  Controls: GapGuardControls,
  Preview: GapGuardPreview,
  HowTo: GapGuardHowTo,
};
