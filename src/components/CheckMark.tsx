import n from "./nav.module.css";

/** The pixel tick in a checked REMEMBER box. */
export function CheckMark() {
  return (
    <svg viewBox="0 0 6 5" className={n.checkMark} shapeRendering="crispEdges" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 0h1v1h-1zM4 1h1v1h-1zM0 2h1v1h-1zM3 2h1v1h-1zM1 3h1v1h-1zM2 3h1v1h-1zM2 4h1v1h-1z"
      />
    </svg>
  );
}
