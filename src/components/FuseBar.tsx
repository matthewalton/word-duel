import { FUSE_SEGMENTS } from "@/game/useDuel";
import { strings } from "@/i18n/strings";
import styles from "./game.module.css";

/** The fuse under the prompt. It burns in from both ends toward the middle. */
export function FuseBar({ lit, active }: { lit: number; active: boolean }) {
  const mid = (FUSE_SEGMENTS - 1) / 2;
  return (
    <div
      className={`${styles.fuse} ${active ? "" : styles.fuseIdle}`}
      role="meter"
      aria-label={strings.fuseAria}
      aria-valuemin={0}
      aria-valuemax={FUSE_SEGMENTS}
      aria-valuenow={lit}
    >
      {Array.from({ length: FUSE_SEGMENTS }, (_, i) => (
        <span key={i} className={Math.abs(i - mid) < lit / 2 ? styles.fuseOn : undefined} />
      ))}
    </div>
  );
}
