import { useEffect, useRef } from "react";
import type { DuelState } from "@/game/duel";
import { fill, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import { FeedbackBand } from "./FeedbackBand";
import { FuseBar } from "./FuseBar";
import styles from "./game.module.css";
import { LangSpan, wordBreakStyle } from "./LangSpan";

/**
 * The middle of the board: START on the ready screen, then the countdown,
 * then the prompt, its fuse, and the feedback band over it.
 */
export function PromptBoard({
  state,
  pack,
  fuseLit,
  onStart,
}: {
  state: DuelState;
  pack: LanguagePack;
  fuseLit: number;
  onStart: () => void;
}) {
  const { round, outcome, phase, fxKey } = state;
  const waiting = phase === "idle" || phase === "countdown";
  const hit = outcome?.reason === "correct";
  const lost = outcome != null && !hit;
  const fxClass = hit ? styles.promptHit : lost ? styles.promptMiss : "";
  const target = pack.meta.target;
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
            key={`${round.id}-${fxKey}`}
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

      {phase === "gameOver" && (
        <div className={`${styles.banner} ${styles.bannerOver}`} role="status">
          <span className={styles.bannerTitle}>{strings.gameOver}</span>
          <span className={styles.bannerSub}>{fill(strings.finalScore, { score: state.score })}</span>
          {state.newBest && <span className={styles.newBest}>{strings.newBest}</span>}
          {pack.feedback.gameOver && (
            <span className={styles.bannerPhrase} lang={target.code} dir={target.dir}>
              {pack.feedback.gameOver}
            </span>
          )}
          <span className={styles.bannerHint}>{strings.playAgain}</span>
        </div>
      )}
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
