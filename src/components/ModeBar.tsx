import type { Direction, Minigame } from "@/game/types";
import { fill, strings } from "@/i18n/strings";
import type { LanguagePack } from "@/packs/types";
import styles from "./game.module.css";

export function ModeBar({
  pack,
  minigames,
  activeId,
  direction,
  onSelect,
  onToggleDirection,
}: {
  pack: LanguagePack;
  minigames: Minigame[];
  activeId: string;
  direction: Direction;
  onSelect: (id: string) => void;
  onToggleDirection: () => void;
}) {
  const active = minigames.find((m) => m.id === activeId);
  const { base, target } = pack.meta;
  const [from, to] = direction === "toTarget" ? [base, target] : [target, base];
  const tag = (l: typeof base) => (
    <span lang={l.code} dir={l.dir}>
      {l.label}
    </span>
  );
  const [pre, mid, post] = strings.direction.split(/\{from\}|\{to\}/);

  return (
    <div className={styles.modeBar} role="group" aria-label={strings.modesLabel}>
      {minigames.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`${styles.modeButton} ${m.id === activeId ? styles.modeActive : ""}`}
          aria-pressed={m.id === activeId}
          onClick={() => onSelect(m.id)}
        >
          {strings.modes[m.id] ?? m.id}
        </button>
      ))}
      {active?.usesDirection && (
        <button
          type="button"
          className={`${styles.modeButton} ${styles.dirToggle}`}
          aria-label={fill(strings.directionAria, { from: from.name, to: to.name })}
          onClick={onToggleDirection}
        >
          {pre}
          {tag(from)}
          {mid}
          {tag(to)}
          {post}
        </button>
      )}
    </div>
  );
}
