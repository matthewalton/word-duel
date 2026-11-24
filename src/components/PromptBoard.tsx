import { useEffect, useRef, type ReactNode } from "react";
import type { DuelState } from "@/game/duel";
import { strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import { FeedbackBand } from "./FeedbackBand";
import { FuseBar } from "./FuseBar";
import { GameOverPanel } from "./GameOverPanel";
import styles from "./game.module.css";
import { LangSpan, wordBreakStyle } from "./LangSpan";

/**
 * The middle of the board: START on the ready screen, then the countdown,
 * then the prompt, its fuse, the feedback band over it, and game over.
 */
export function PromptBoard({
  state,
  pack,
  fuseLit,
  onStart,
  gameOverExtra,
}: {
  state: DuelState;
  pack: LanguagePack;
  fuseLit: number;
  onStart: () => void;
  gameOverExtra?: ReactNode;
}) {
  const { round, outcome, phase, fxKey } = state;
  const waiting = phase === "idle" || phase === "countdown";
  const hit = outcome?.reason === "correct";
  const lost = outcome != null && !hit;
  const fxClass = hit ? styles.promptHit : lost ? styles.promptMiss : "";
  const fuseActive = phase === "playing" || phase === "resolving";

  return (
    <div className={styles.promptArea}>
      {phase === "idle" && <ReadyStart onStart={onStart} />}

      <div className={styles.countdownLive} role="status" aria-live="assertive">
        {phase === "countdown" && (
          <span key={state.count} className={state.count > 0 ? styles.countNumber : styles.countGo}>
            {state.count > 0 ? state.count : strings.countdownGo}
          </span>
        )}
      </div>

      {!waiting && (
        <>
          <p
            key={`${round.promptId}-${fxKey}`}
            className={`${styles.prompt} ${round.gap ? styles.promptSentence : ""} ${fxClass}`}
            lang={round.prompt.lang}
            dir={round.prompt.dir}
            style={wordBreakStyle(round.prompt)}
          >
            {round.gap ? (
              <>
                {round.gap.before}
                <span className={`${styles.blank} ${hit ? styles.blankFilled : ""}`}>
                  {hit ? round.reveal.text : " "}
                </span>
                {round.gap.after}
              </>
            ) : (
              round.prompt.text
            )}
          </p>

          {round.translation && (
            <p className={styles.translation} style={wordBreakStyle(round.translation)}>
              <LangSpan t={round.translation} />
            </p>
          )}

          <FuseBar lit={fuseActive ? fuseLit : 20} active={fuseActive} />
        </>
      )}

      <FeedbackBand state={state} pack={pack} />

      {phase === "gameOver" && <GameOverPanel state={state} pack={pack} extra={gameOverExtra} />}
    </div>
  );
}

/** The ready screen: one START button, pressed by click, Enter or Space. */
function ReadyStart({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    // Enter also works when focus has wandered off the button.
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest("button, input, a, textarea, select")) return;
      e.preventDefault();
      onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <div className={styles.ready}>
      <button ref={ref} type="button" className={`${styles.goldButton} ${styles.startButton}`} onClick={onStart}>
        {strings.start}
      </button>
      <span className={styles.readyHint}>{strings.pressEnter}</span>
    </div>
  );
}
