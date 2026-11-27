import type { ReactNode } from "react";
import t from "./title.module.css";

/** One numbered, illustrated step in the how-to panel. */
export function HowToStep({ n, visual, text }: { n: number; visual: ReactNode; text: string }) {
  return (
    <li className={t.step}>
      <span className={t.stepNumber}>{n}</span>
      <span className={t.stepVisual}>{visual}</span>
      <p className={t.stepText}>{text}</p>
    </li>
  );
}

/** Shared third step: the stage progress bar, two of three chunks filled. */
export function StageProgressVisual() {
  return (
    <span className={t.stepProgress} aria-hidden="true">
      <span className={t.stepProgressOn} />
      <span className={t.stepProgressOn} />
      <span />
    </span>
  );
}

/** A 14-segment fuse with the given number lit. */
export function PreviewFuse({ lit }: { lit: number }) {
  return (
    <span className={t.pvFuse} aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className={i < lit ? t.pvFuseOn : undefined} />
      ))}
    </span>
  );
}
