import { useRef, type ReactNode } from "react";
import type { DuelState } from "@/game/duel";
import { fill, strings } from "@/i18n/strings";
import { FIT_STEPS_BAND_WORD, useFitText } from "@/lib/useFitText";
import type { LanguagePack } from "@/packs/types";
import styles from "./game.module.css";
import { LangSpan } from "./LangSpan";

/**
 * The band over the bottom of the prompt after an outcome: one pixel label
 * and one target- or base-language word. Nothing shows while playing.
 * The right answer that clears a stage shows the STAGE band instead of CORRECT,
 * and a comeback (an item last missed, now right) shows the COMEBACK band.
 */
export function FeedbackBand({ state, pack }: { state: DuelState; pack: LanguagePack }) {
  const { outcome, phase, round, fxKey, stage } = state;
  const target = pack.meta.target;

  const bandRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const wordRef = useRef<HTMLSpanElement | null>(null);
  useFitText(
    () => (wordRef.current ? [wordRef.current] : []),
    () => {
      const bandEl = bandRef.current;
      const labelEl = labelRef.current;
      if (!bandEl || !labelEl) return 0;
      const cs = getComputedStyle(bandEl);
      const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const gap = parseFloat(cs.columnGap) || 0;
      return bandEl.clientWidth - paddingX - labelEl.getBoundingClientRect().width - gap;
    },
    [phase, fxKey],
    FIT_STEPS_BAND_WORD,
  );

  let band: { tone: string; label: string; word: ReactNode } | null = null;
  if (phase === "resolving" && outcome) {
    if (outcome.reason !== "correct") {
      band = {
        tone: styles.bandWrong,
        label: outcome.reason === "timeout" ? strings.tooSlow : strings.wrong,
        word: <LangSpan t={round.reveal} />,
      };
    } else if (outcome.stageCleared) {
      // One band, not CORRECT then a second band: the stage it leads to.
      band = {
        tone: styles.bandStage,
        label: fill(strings.stageUp, { stage: stage + 1 }),
        word: (
          <span lang={target.code} dir={target.dir}>
            {pack.feedback.stageClear ?? pack.feedback.correct}
          </span>
        ),
      };
    } else if (outcome.comeback) {
      band = {
        tone: styles.bandRight,
        label: strings.comeback,
        word: (
          <span lang={target.code} dir={target.dir}>
            {pack.feedback.comeback ?? pack.feedback.correct}
          </span>
        ),
      };
    } else {
      band = {
        tone: styles.bandRight,
        label: strings.correct,
        word: (
          <span lang={target.code} dir={target.dir}>
            {pack.feedback.correct}
          </span>
        ),
      };
    }
  }

  return (
    <div className={styles.bandSlot} role="status" aria-live="polite">
      {band && (
        <div ref={bandRef} key={`${phase}-${fxKey}`} className={`${styles.band} ${band.tone}`}>
          <span ref={labelRef} className={styles.bandLabel}>{band.label}</span>
          {band.word && (
            <span ref={wordRef} className={styles.bandWord}>
              {band.word}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
