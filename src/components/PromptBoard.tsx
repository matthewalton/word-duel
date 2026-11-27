import { useEffect, useRef, type ReactNode } from "react";
import type { DuelState } from "@/game/duel";
import { strings } from "@/i18n/strings";
import { FIT_STEPS_PROMPT, useFitText } from "@/lib/useFitText";
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
  band,
  gameOverPanel,
}: {
  state: DuelState;
  pack: LanguagePack;
  fuseLit: number;
  onStart: () => void;
  gameOverExtra?: ReactNode;
  /** Versus: its own feedback band in place of the solo one. */
  band?: ReactNode;
  /** Versus: its own game over in place of the solo one. */
  gameOverPanel?: ReactNode;
}) {
  const { round, outcome, phase, fxKey } = state;
  const waiting = phase === "idle" || phase === "countdown";
  // Whose heart broke colours the prompt; in versus nobody's may have.
  const hit = outcome?.loser === "rival";
  const lost = outcome?.loser === "you";
  const fxClass = hit ? styles.promptHit : lost ? styles.promptMiss : "";
  const comeback = phase === "resolving" && outcome?.comeback;
  const fuseActive = phase === "playing" || phase === "resolving";

  const promptRef = useRef<HTMLParagraphElement | null>(null);
  useFitText(
    () => (promptRef.current ? [promptRef.current] : []),
    () => promptRef.current?.clientWidth ?? 0,
    // The <p> below remounts (fresh node, needing a fresh measurement) on
    // every fxKey change too, not just a new prompt: resolving a gap fills
    // the blank with the real answer, which can be wider than the gap was.
    [round.promptId, fxKey],
    FIT_STEPS_PROMPT,
  );

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
            ref={promptRef}
            key={`${round.promptId}-${fxKey}`}
            className={`${styles.prompt} ${round.gap ? styles.promptSentence : ""} ${fxClass} ${comeback ? styles.promptComeback : ""}`}
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
            {comeback && <ComebackSparks />}
          </p>

          {round.translation && (
            <p className={styles.translation} style={wordBreakStyle(round.translation)}>
              <LangSpan t={round.translation} />
            </p>
          )}

          <FuseBar lit={fuseActive ? fuseLit : 20} active={fuseActive} />
        </>
      )}

      {band !== undefined ? band : <FeedbackBand state={state} pack={pack} />}

      {phase === "gameOver" && (gameOverPanel ?? <GameOverPanel state={state} pack={pack} extra={gameOverExtra} />)}
    </div>
  );
}

const SPARKS = 8;

/** Pixel sparks that burst off the prompt on a comeback; placed by the stylesheet. */
function ComebackSparks() {
  return (
    <span className={styles.sparks} aria-hidden="true">
      {Array.from({ length: SPARKS }, (_, i) => (
        <span key={i} className={styles.spark} />
      ))}
    </span>
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
