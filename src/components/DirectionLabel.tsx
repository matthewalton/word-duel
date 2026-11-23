import type { LanguageInfo } from "@/packs/types";

/** Pixel arrow pointing in reading direction (flipped for right-to-left). */
function Arrow() {
  return (
    <svg
      viewBox="0 0 5 5"
      width="0.6em"
      height="0.6em"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path
        fill="currentColor"
        d="M0 2h4v1h-4zM2 0h1v1h-1zM3 1h1v1h-1zM4 2h1v1h-1zM3 3h1v1h-1zM2 4h1v1h-1z"
      />
    </svg>
  );
}

/** "English → 한국어": each language's own name, tagged with its language. */
export function DirectionLabel({ from, to }: { from: LanguageInfo; to: LanguageInfo }) {
  return (
    <>
      <span lang={from.code} dir={from.dir}>
        {from.nativeName}
      </span>
      <Arrow />
      <span lang={to.code} dir={to.dir}>
        {to.nativeName}
      </span>
    </>
  );
}
