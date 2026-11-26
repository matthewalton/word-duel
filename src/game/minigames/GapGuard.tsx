"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/game.module.css";
import { HowToStep, StageProgressVisual } from "@/components/HowToParts";
import t from "@/components/title.module.css";
import { strings } from "@/i18n/strings";
import { FIT_STEPS_CHOICE, useFitText } from "@/lib/useFitText";
import { drawOrder, shuffle } from "@/lib/random";
import { askableGaps, itemTier } from "@/packs";
import { GAP_MARKER, type GapPrompt, type LanguagePack } from "@/packs/types";
import { langText, type ControlsProps, type Minigame, type Round, type RoundDraw, type ShowcaseProps } from "../types";

function buildRound(pack: LanguagePack, gap: GapPrompt, shuffleOptions: boolean): Round {
  const { target, base } = pack.meta;
  const [before, after = ""] = gap.sentence.split(GAP_MARKER);
  return {
    itemId: gap.tests,
    promptId: gap.id,
    promptKind: "gap",
    tier: itemTier(pack, gap.tests),
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
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const options = round.options ?? NO_OPTIONS;
  const live = phase === "playing";
  // START on the ready screen lives on the board; this one is play again.
  const showStart = phase === "gameOver";
  // Before the first round the choices stay blank so they don't give the sample away.
  const waiting = phase === "idle" || phase === "countdown";

  useEffect(() => {
    if (phase === "gameOver") startRef.current?.focus();
  }, [phase]);

  // One shared size for the row, so a short option doesn't look oddly large
  // next to a long one that had to shrink.
  useFitText(
    () => buttonRefs.current.filter((el): el is HTMLButtonElement => el != null),
    () => buttonRefs.current[0]?.clientWidth ?? 0,
    [round.promptId],
    FIT_STEPS_CHOICE,
  );

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
            key={`${round.promptId}-${option}`}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
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
            {waiting ? "\u00A0" : option}
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
  const round = buildRound(pack, askableGaps(pack)[0], false);
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
  const round = buildRound(pack, askableGaps(pack)[0], false);
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
      <HowToStep n={3} text={steps[2]} visual={<StageProgressVisual />} />
    </>
  );
}

export const gapGuard: Minigame = {
  id: "gap-guard",
  usesDirection: false,
  usesDifficulty: false,
  hasContent: (pack) => askableGaps(pack).length > 0,
  sampleRound: (pack) => buildRound(pack, askableGaps(pack)[0], false),
  startDraw: (pack): RoundDraw => {
    const draw = drawOrder(askableGaps(pack));
    return {
      next: () => buildRound(pack, draw.next(), true),
      workIn: (missedItemIds) => {
        const missed = new Set(missedItemIds);
        draw.workIn((gap) => missed.has(gap.tests));
      },
    };
  },
  Controls: GapGuardControls,
  Preview: GapGuardPreview,
  HowTo: GapGuardHowTo,
};
