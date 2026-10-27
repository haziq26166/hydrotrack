// File: src/components/ui/SegmentedControl.jsx

/**
 * Glass pill group for choosing one of a few options (e.g. Daily / Monthly).
 *   options   [{ id, label }]
 *   value     selected id
 *   onChange  (id) => void
 */
export function SegmentedControl({ options, value, onChange, label, className = '' }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`glass-soft inline-flex items-center gap-0.5 rounded-2xl p-1 ${className}`}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={[
            'rounded-xl px-4 py-2 text-sm font-bold transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30',
            value === o.id
              ? 'bg-white text-hydro-700 shadow-glass-sm'
              : 'text-ink-500 hover:text-hydro-700',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}