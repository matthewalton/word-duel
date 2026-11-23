import { FUSE_SEGMENTS } from "@/game/useDuel";
import { strings } from "@/i18n/strings";
import styles from "./game.module.css";

export function FuseBar({ lit, active }: { lit: number; active: boolean }) {
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
        <span key={i} className={i < lit ? styles.fuseOn : styles.fuseOff} />
      ))}
    </div>
  );
}
