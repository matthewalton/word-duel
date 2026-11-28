/** The versus record's pixel trophy: its cup in the accent colour. */
export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 7" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M0 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM3 4h1v1h-1zM2 5h3v1h-3zM1 6h5v1h-5z" />
      <path fill="var(--accent)" d="M1 1h5v2h-5zM2 3h3v1h-3z" />
    </svg>
  );
}
