/** The wordbook's pixel book: an open book, its pages in the accent colour. */
export function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 6" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <path
        fill="currentColor"
        d="M0 0h3v1h-3zM4 0h3v1h-3zM0 1h1v4h-1zM3 1h1v5h-1zM6 1h1v4h-1zM0 5h3v1h-3zM4 5h3v1h-3z"
      />
      <path fill="var(--accent)" d="M1 1h2v4h-2zM4 1h2v4h-2z" />
    </svg>
  );
}
