import styles from "./game.module.css";

const GRID = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
const CELLS: Array<[number, number]> = GRID.flatMap((row, y) =>
  [...row].flatMap((c, x) => (c === "1" ? [[x, y] as [number, number]] : [])),
);

function HeartSvg({ fill, highlight }: { fill: string; highlight?: boolean }) {
  return (
    <svg viewBox="0 0 7 6" className={styles.heartSvg} shapeRendering="crispEdges" aria-hidden="true">
      {CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />
      ))}
      {highlight && <rect x={1} y={1} width={1} height={1} fill="#FFFFFF" />}
    </svg>
  );
}

/** One 7×6 pixel heart. `breaking` plays the flash-and-jolt break effect. */
export function PixelHeart({ full, color, breaking }: { full: boolean; color: string; breaking?: boolean }) {
  return (
    <span className={`${styles.heart} ${breaking ? styles.heartBreaking : ""}`}>
      <HeartSvg fill={full ? color : "var(--heart-empty)"} highlight={full} />
      {breaking && (
        <span className={styles.heartFlash}>
          <HeartSvg fill="#FFFFFF" />
        </span>
      )}
    </span>
  );
}

export function HeartRow({
  count,
  max,
  color,
  breakingIndex,
  fxKey,
  label,
}: {
  count: number;
  max: number;
  color: string;
  breakingIndex: number | null;
  fxKey: number;
  label: string;
}) {
  return (
    <span className={styles.heartRow} role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => (
        <PixelHeart
          key={i === breakingIndex ? `b-${fxKey}` : `h-${i}`}
          full={i < count}
          color={color}
          breaking={i === breakingIndex}
        />
      ))}
    </span>
  );
}
