import { RULES } from "@/config/game";
import type { DuelState } from "@/game/duel";
import { fill, strings } from "@/i18n/strings";
import styles from "./game.module.css";
import { HeartRow } from "./PixelHeart";

const pad = (n: number) => String(n).padStart(4, "0");

/** Top of the board: your hearts, the score, and stage progress underneath. */
export function Hud({ state }: { state: DuelState }) {
  const { hearts, maxHearts, outcome, fxKey, phase, stage } = state;
  // The heart that just broke is the first empty slot of your row.
  const breaking = outcome?.loser === "you" ? hearts.you : null;
  const scored = outcome?.reason === "correct" && phase === "resolving";
  const gained = scored ? outcome.points + (outcome.stageCleared ? RULES.stageBonus : 0) : 0;

  return (
    <>
      <div className={styles.hud}>
        <div className={styles.hudSide}>
          <span className={styles.hudLabel}>{strings.you}</span>
          <HeartRow
            count={hearts.you}
            max={maxHearts}
            color="var(--player)"
            breakingIndex={breaking}
            fxKey={fxKey}
            label={fill(strings.heartsAria, { who: strings.you, n: hearts.you, max: maxHearts })}
          />
        </div>
        <div className={styles.scoreBox} aria-live="polite">
          {state.best != null && (
            <span className={styles.best}>{fill(strings.best, { score: pad(state.best) })}</span>
          )}
          <span className={styles.scoreRow}>
            {scored && (
              <span key={`pts-${fxKey}`} className={styles.pointsTag}>
                {fill(strings.pointsLabel, { points: gained })}
              </span>
            )}
            <span className={styles.score} aria-label={`${strings.score} ${state.score}`}>
              {pad(state.score)}
            </span>
          </span>
        </div>
      </div>
      <StageProgress state={state} stage={stage} />
    </>
  );
}

/**
 * Right answers still needed for the next stage. In solo play each chunk is
 * one of the CPU rival's hearts (ADR 0005); the reducer still counts hearts.
 */
function StageProgress({ state, stage }: { state: DuelState; stage: number }) {
  const max = state.maxHearts;
  const done = max - state.hearts.rival;
  return (
    <div
      className={styles.stageProgress}
      role="meter"
      aria-label={fill(strings.stageProgressAria, { stage, n: done, max })}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={done}
    >
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < done ? styles.stageChunkOn : undefined} />
      ))}
    </div>
  );
}
