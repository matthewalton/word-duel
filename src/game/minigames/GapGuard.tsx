"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/game.module.css";
import { HowToStep, StageProgressVisual } from "@/components/HowToParts";
import t from "@/components/title.module.css";
import { Button } from "@/components/ui/Button";
import { ChoiceButton, type ChoiceMark } from "@/components/ui/ChoiceButton";
import { strings } from "@/i18n/strings";
import { FIT_STEPS_CHOICE, useFitText } from "@/lib/useFitText";
import { drawOrder, shuffle } from "@/lib/random";
import { askableGaps } from "@/packs";
import type { GapPrompt, LanguagePack } from "@/packs/types";
import type { ControlsProps, Minigame, Round, RoundDraw, ShowcaseProps } from "../types";
import { buildGapRound, gapPool } from "./gapGuardRounds";

/** A solo round shuffles its options; the preview and how-to keep the pack's order. */
const buildRound = (pack: LanguagePack, gap: GapPrompt, shuffleOptions: boolean): Round =>
  buildGapRound(pack, gap, shuffleOptions ? shuffle(gap.options) : gap.options);

/** The askable gap sentences for each item they test. */
function gapsByItem(pack: LanguagePack): Map<string, GapPrompt[]> {
  const byItem = new Map<string, GapPrompt[]>();
  for (const gap of askableGaps(pack)) byItem.set(gap.tests, [...(byItem.get(gap.tests) ?? []), gap]);
  return byItem;
}

const NO_OPTIONS: string[] = [];

function GapGuardControls({ round, phase, outcome, onSubmit, onStart, locked = false }: ControlsProps) {
  const startRef = useRef<HTMLButtonElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const options = round.options ?? NO_OPTIONS;
  // Versus: after a pick the options stay locked until the round's result arrives.
  const live = phase === "playing" && !locked;
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

  // The pick is judged by the answer, not the reason: in versus a round can be
  // won by the other player after this one picked wrong.
  const markOf = (option: string): ChoiceMark | undefined => {
    if (!outcome) return undefined;
    if (option === outcome.given) return option === round.reveal.text ? "right" : "wrong";
    if (option === round.reveal.text) return "reveal";
    return undefined;
  };

  return (
    <div className={styles.choiceArea}>
      <div className={styles.choiceRow}>
        {options.map((option, i) => (
          <ChoiceButton
            key={`${round.promptId}-${option}`}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            keyNumber={i + 1}
            mark={markOf(option)}
            className={styles.choiceButton}
            lang={round.answerLang.code}
            dir={round.answerLang.dir}
            disabled={!live}
            onClick={() => onSubmit(option)}
          >
            {waiting ? "\u00A0" : option}
          </ChoiceButton>
        ))}
      </div>
      {showStart && (
        <Button ref={startRef} variant="primary" className={styles.goldButton} onClick={onStart}>
          {strings.start}
        </Button>
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
  usesDifficulty: true,
  hasContent: (pack) => askableGaps(pack).length > 0,
  sampleRound: (pack) => buildRound(pack, askableGaps(pack)[0], false),
  /** Deals the gaps whose tested item is within the difficulty, in a shuffled draw order. */
  startDraw: (pack, opts): RoundDraw => {
    const draw = drawOrder(gapPool(pack, opts.difficulty));
    return {
      next: () => buildRound(pack, draw.next(), true),
      workIn: (missedItemIds) => {
        const missed = new Set(missedItemIds);
        draw.workIn((gap) => missed.has(gap.tests));
      },
    };
  },
  practiceItems: (pack, missedItemIds) => {
    const byItem = gapsByItem(pack);
    return missedItemIds.filter((id) => byItem.has(id));
  },
  /** Deals the missed items in a shuffled draw order, each as one of its gap sentences. */
  startPracticeDraw: (pack, _opts, itemIds): RoundDraw => {
    const byItem = gapsByItem(pack);
    const draw = drawOrder(itemIds.filter((id) => byItem.has(id)));
    return {
      next: () => {
        const gaps = byItem.get(draw.next()) as GapPrompt[];
        return buildRound(pack, gaps[Math.floor(Math.random() * gaps.length)], true);
      },
      workIn: () => {},
    };
  },
  Controls: GapGuardControls,
  Preview: GapGuardPreview,
  HowTo: GapGuardHowTo,
};
