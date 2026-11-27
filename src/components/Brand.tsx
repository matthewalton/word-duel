import { GAME_NAME } from "@/config/game";
import n from "./nav.module.css";

const HEART = "M1 0h2v1h-2zM4 0h2v1h-2zM0 1h7v2h-7zM1 3h5v1h-5zM2 4h3v1h-3zM3 5h1v1h-1z";

function BrandHeart({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 7 6" className={n.brandHeart} shapeRendering="crispEdges" aria-hidden="true">
      <path fill={color} d={HEART} />
      <rect x={1} y={1} width={1} height={1} fill="#fff" />
    </svg>
  );
}

/**
 * The game's name between the player's and the rival's hearts (the language
 * step), or after the player's heart alone (the hub's top bar, where it is
 * the page heading).
 */
export function Brand({ big = false }: { big?: boolean }) {
  return (
    <div className={`${n.brand} ${big ? n.brandBig : ""}`}>
      <BrandHeart color="var(--player)" />
      {big ? (
        <span className={n.brandName}>{GAME_NAME.toUpperCase()}</span>
      ) : (
        <h1 className={n.brandName}>{GAME_NAME.toUpperCase()}</h1>
      )}
      {big && <BrandHeart color="var(--rival)" />}
    </div>
  );
}
