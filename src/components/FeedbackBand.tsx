import type { ReactNode } from "react";
import type { DuelState } from "@/game/duel";
import { fill, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import styles from "./game.module.css";
import { LangSpan } from "./LangSpan";

/**
 * The band over the bottom of the prompt after an outcome: one pixel label
 * and one target- or base-language word. Nothing shows while playing.
 * The right answer that clears a stage shows the STAGE band instead of CORRECT.
 */
export function FeedbackBand({ state, pack }: { state: DuelState; pack: LanguagePack }) {
  const { outcome, phase, round, fxKey, stage } = state;
  const target = pack.meta.target;

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
        <div key={`${phase}-${fxKey}`} className={`${styles.band} ${band.tone}`}>
          <span className={styles.bandLabel}>{band.label}</span>
          {band.word && <span className={styles.bandWord}>{band.word}</span>}
        </div>
      )}
    </div>
  );
}
