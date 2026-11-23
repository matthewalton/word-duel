import type { DuelState } from "@/game/duel";
import { strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import styles from "./game.module.css";
import { LangSpan, Template } from "./LangSpan";

export function FeedbackLine({ state, pack }: { state: DuelState; pack: LanguagePack }) {
  const { outcome, phase, round } = state;
  const target = pack.meta.target;

  let content: React.ReactNode = " ";
  let tone = "";
  if (phase === "idle") {
    content = strings.idleMessage;
  } else if (outcome?.reason === "correct") {
    tone = styles.feedbackRight;
    content = (
      <>
        <span lang={target.code} dir={target.dir} className={styles.feedbackPhrase}>
          {pack.feedback.correct}
        </span>{" "}
        {strings.correct}
      </>
    );
  } else if (outcome) {
    tone = styles.feedbackWrong;
    content = (
      <Template
        text={outcome.reason === "timeout" ? strings.tooSlow : strings.wrong}
        values={{ answer: <LangSpan t={round.reveal} className={styles.feedbackAnswer} /> }}
      />
    );
  }

  return (
    <p className={`${styles.feedback} ${tone}`} role="status" aria-live="polite">
      {content}
    </p>
  );
}
