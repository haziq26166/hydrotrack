/**
 * Compact segmented toggle for choosing one of a few options
 * (e.g. Daily / Monthly).
 *   options   [{ id, label }]
 *   value     selected id
 *   onChange  (id) => void
 */
export function SegmentedControl({ options, value, onChange, label, className = '' }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 rounded-md border border-white/80 bg-white/45 p-0.5 shadow-glass-sm backdrop-blur-md ${className}`}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={[
            'h-7 rounded px-3 text-xs font-semibold transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40',
            value === o.id
              ? 'bg-white/90 text-hydro-700 shadow-glass-sm'
              : 'text-ink-500 hover:text-ink-800',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}