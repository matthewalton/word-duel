import type { ReactNode } from "react";
import { missesOf, type DuelState } from "@/game/duel";
import type { Miss } from "@/game/types";
import { fill, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import styles from "./game.module.css";
import { LangSpan, wordBreakStyle } from "./LangSpan";

/**
 * Game over: the score on one side, and every round the player lost this duel
 * with its answer, so they can see what to review.
 */
export function GameOverPanel({
  state,
  pack,
  extra,
}: {
  state: DuelState;
  pack: LanguagePack;
  /** Shown under the review list, e.g. the sign-in nudge for guests. */
  extra?: ReactNode;
}) {
  const target = pack.meta.target;
  const misses = missesOf(state.rounds);

  return (
    <div className={styles.gameOver} role="status">
      <div className={styles.gameOverSummary}>
        <span className={styles.bannerTitle}>{strings.gameOver}</span>
        <span className={styles.gameOverScore}>
          <span className={styles.bannerSub}>{fill(strings.finalScore, { score: state.score })}</span>
          {state.newBest && <span className={styles.newBest}>{strings.newBest}</span>}
        </span>
        {pack.feedback.gameOver && (
          <span className={styles.bannerPhrase} lang={target.code} dir={target.dir}>
            {pack.feedback.gameOver}
          </span>
        )}
        <span className={styles.bannerHint}>{strings.playAgain}</span>
      </div>

      {(misses.length > 0 || extra) && (
        <div className={styles.gameOverSide}>
          {misses.length > 0 && (
            <section className={styles.review} aria-labelledby="review-heading">
              <h2 id="review-heading" className={styles.reviewHeading}>
                {strings.toReview}
              </h2>
              <ol className={styles.reviewList}>
                {misses.map((miss, i) => (
                  <MissRow key={i} miss={miss} />
                ))}
              </ol>
            </section>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}

function MissRow({ miss }: { miss: Miss }) {
  const { round } = miss;
  const answer = <LangSpan t={round.reveal} className={styles.reviewAnswer} />;

  return (
    <li className={styles.reviewRow}>
      {round.gap ? (
        <span className={styles.reviewSentence}>
          <span lang={round.prompt.lang} dir={round.prompt.dir} style={wordBreakStyle(round.prompt)}>
            {round.gap.before}
            {answer}
            {round.gap.after}
          </span>
          {round.translation && <LangSpan t={round.translation} className={styles.reviewTranslation} />}
        </span>
      ) : (
        <span className={styles.reviewPair}>
          <LangSpan t={round.prompt} className={styles.reviewPrompt} />
          <span className={styles.reviewArrow} aria-hidden="true">
            →
          </span>
          {answer}
        </span>
      )}
      <span className={styles.reviewGuess}>
        {miss.reason === "timeout" ? (
          <span className={styles.reviewSlow}>{strings.tooSlowShort}</span>
        ) : (
          miss.given && (
            <>
              <span className={styles.srOnly}>{strings.youAnswered}</span>
              <del lang={round.answerLang.code} dir={round.answerLang.dir}>
                {miss.given}
              </del>
            </>
          )
        )}
      </span>
    </li>
  );
}
