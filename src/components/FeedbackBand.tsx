import type { ReactNode } from "react";
import type { DuelState } from "@/game/duel";
import { strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import styles from "./game.module.css";
import { LangSpan } from "./LangSpan";

/**
 * The band over the bottom of the prompt after an outcome: one pixel label
 * and one target- or base-language word. Nothing shows while playing.
 */
export function FeedbackBand({ state, pack }: { state: DuelState; pack: LanguagePack }) {
  const { outcome, phase, round, fxKey } = state;
  const target = pack.meta.target;

  let band: { tone: string; label: string; word: ReactNode } | null = null;
  if (phase === "stageClear") {
    band = {
      tone: styles.bandStage,
      label: strings.nextStage,
      word: pack.feedback.stageClear && (
        <span lang={target.code} dir={target.dir}>
          {pack.feedback.stageClear}
        </span>
      ),
    };
  } else if (phase === "resolving" && outcome) {
    band =
      outcome.reason === "correct"
        ? {
            tone: styles.bandRight,
            label: strings.correct,
            word: (
              <span lang={target.code} dir={target.dir}>
                {pack.feedback.correct}
              </span>
            ),
          }
        : {
            tone: styles.bandWrong,
            label: outcome.reason === "timeout" ? strings.tooSlow : strings.wrong,
            word: <LangSpan t={round.reveal} />,
          };
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
