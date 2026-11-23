"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/game.module.css";
import { strings } from "@/i18n/strings";
import { pickIndex, shuffle } from "@/lib/random";
import { GAP_MARKER, type LanguagePack } from "@/packs/types";
import { langText, type ControlsProps, type Minigame, type Round } from "../types";

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

export const gapGuard: Minigame = {
  id: "gap-guard",
  usesDirection: false,
  sampleRound: (pack) => buildRound(pack, 0, false),
  nextRound: (pack, _opts, previous) =>
    buildRound(pack, pickIndex(pack.gaps.length, previous?.itemIndex ?? null), true),
  Controls: GapGuardControls,
};
