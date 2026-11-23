import type { ReactNode } from "react";
import { PixelHeart } from "./PixelHeart";
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

/** Shared third step: the rival's hearts, one already broken. */
export function HeartsBreakingVisual() {
  return (
    <>
      <PixelHeart full color="var(--rival)" />
      <PixelHeart full color="var(--rival)" />
      <PixelHeart full={false} color="var(--rival)" />
    </>
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
