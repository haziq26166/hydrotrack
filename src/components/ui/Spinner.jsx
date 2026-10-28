const SIZES = {
  sm: { box: 'h-6 w-6',   border: 'border-2' },
  md: { box: 'h-12 w-12', border: 'border-4' },
  lg: { box: 'h-16 w-16', border: 'border-4' },
};

/**
 * Loading ring.
 *   size        sm | md | lg
 *   fullscreen  covers the viewport with a frosted aqua backdrop
 *   label       screen-reader text (visually hidden)
 */
export function Spinner({ fullscreen = false, size = 'md', label = 'Loading' }) {
  const { box, border } = SIZES[size] ?? SIZES.md;

  const ring = (
    <div role="status" aria-live="polite" className={`relative ${box}`}>
      <div className={`absolute inset-0 rounded-full border-aqua-200/60 ${border}`} />
      <div
        className={`absolute inset-0 animate-spin rounded-full border-transparent border-t-hydro ${border}`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (!fullscreen) return ring;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-canvas/80 backdrop-blur-md animate-fade-in">
      {ring}
    </div>
  );
}