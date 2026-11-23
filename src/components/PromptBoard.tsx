import { RULES } from "@/config/game";
import type { DuelState } from "@/game/duel";
import { fill, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import { FuseBar } from "./FuseBar";
import styles from "./game.module.css";
import { LangSpan, wordBreakStyle } from "./LangSpan";

export function PromptBoard({
  state,
  pack,
  fuseLit,
}: {
  state: DuelState;
  pack: LanguagePack;
  fuseLit: number;
}) {
  const { round, outcome, phase, fxKey } = state;
  const hit = outcome?.reason === "correct";
  const lost = outcome != null && !hit;
  const fxClass = hit ? styles.promptHit : lost ? styles.promptMiss : "";
  const target = pack.meta.target;
  const fuseActive = phase === "playing" || phase === "resolving";

  return (
    <div className={`${styles.board} ${lost ? styles.boardJolt : ""}`}>
      <p className={styles.hint}>{round.hint}</p>

      <p
        key={`${round.id}-${fxKey}`}
        className={`${styles.prompt} ${fxClass}`}
        lang={round.prompt.lang}
        dir={round.prompt.dir}
        style={wordBreakStyle(round.prompt)}
      >
        {round.gap ? (
          <>
            {round.gap.before}
            <span className={`${styles.blank} ${hit ? styles.blankFilled : ""}`}>
              {hit ? round.reveal.text : " "}
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

      {outcome && (
        <span key={`float-${fxKey}`} className={`${styles.floatLabel} ${hit ? styles.floatHit : styles.floatMiss}`}>
          {hit ? fill(strings.pointsLabel, { points: outcome.points }) : strings.heartLostLabel}
        </span>
      )}

      {phase === "stageClear" && (
        <div className={styles.banner} role="status">
          <span className={styles.bannerTitle}>{fill(strings.stageBanner, { stage: state.stage })}</span>
          <span className={styles.bannerSub}>{fill(strings.stageBannerSub, { bonus: RULES.stageBonus })}</span>
          {pack.feedback.stageClear && (
            <span className={styles.bannerPhrase} lang={target.code} dir={target.dir}>
              {pack.feedback.stageClear}
            </span>
          )}
        </div>
      )}

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
