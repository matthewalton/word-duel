import type { DuelState } from "@/game/duel";
import { fill, strings } from "@/i18n/strings";
import styles from "./game.module.css";
import { HeartRow } from "./PixelHeart";

const pad = (n: number) => String(n).padStart(4, "0");

export function Hud({ state }: { state: DuelState }) {
  const { hearts, maxHearts, outcome, fxKey, stage } = state;
  // The heart that just broke is the first empty slot of the loser's row.
  const breaking = (side: "you" | "rival") =>
    outcome && outcome.loser === side ? hearts[side] : null;
  // After a stage clear the rival refills, so don't replay the break.
  const rivalBreaking = state.phase === "stageClear" ? null : breaking("rival");
  const rivalLabel = fill(strings.rival, { stage });

  return (
    <div className={styles.hud}>
      <div className={styles.hudSide}>
        <span className={`${styles.hudLabel} ${styles.youLabel}`}>{strings.you}</span>
        <HeartRow
          count={hearts.you}
          max={maxHearts}
          color="var(--player)"
          breakingIndex={breaking("you")}
          fxKey={fxKey}
          label={fill(strings.heartsAria, { who: strings.you, n: hearts.you, max: maxHearts })}
        />
      </div>
      <div className={styles.scoreBox} aria-live="polite">
        <span className={styles.best}>{fill(strings.best, { score: pad(state.best) })}</span>
        <span className={styles.score} aria-label={`${strings.score} ${state.score}`}>
          {pad(state.score)}
        </span>
      </div>
      <div className={`${styles.hudSide} ${styles.hudSideEnd}`}>
        <HeartRow
          count={hearts.rival}
          max={maxHearts}
          color="var(--rival)"
          breakingIndex={rivalBreaking}
          fxKey={fxKey}
          label={fill(strings.heartsAria, { who: rivalLabel, n: hearts.rival, max: maxHearts })}
        />
        <span className={`${styles.hudLabel} ${styles.rivalLabel}`}>{rivalLabel}</span>
      </div>
    </div>
  );
}
