/** The sound button's pixel speaker: sound waves in the accent colour when on, a small × where they were when off. */
export function SpeakerIcon({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 9 7" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M0 2h3v3h-3zM3 1h1v5h-1zM4 0h1v7h-1z" />
      {on ? (
        <path fill="var(--accent)" d="M6 2h1v3h-1zM8 1h1v5h-1z" />
      ) : (
        <path fill="currentColor" d="M6 2h1v1h-1zM8 2h1v1h-1zM7 3h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1z" />
      )}
    </svg>
  );
}
