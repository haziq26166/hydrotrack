// File: src/components/ui/StatusChip.jsx

/* ============================================================
   STATUS MODEL — shared across the whole app
   ok      normal flow            (sea green)
   warn    attention needed       (sand)
   leak    leak detected          (dusty coral)
   offline device not reporting   (cool fog gray)
   info    neutral / informative  (aqua)
   ============================================================ */
const STATUS = {
  ok:      { chip: 'chip-ok',      dot: 'bg-sea-500',   label: 'Normal' },
  warn:    { chip: 'chip-warn',    dot: 'bg-sand-500',  label: 'Warning' },
  leak:    { chip: 'chip-leak',    dot: 'bg-coral-500', label: 'Leak detected' },
  offline: { chip: 'chip-offline', dot: 'bg-fog-400',   label: 'Offline' },
  info:    { chip: 'chip-info',    dot: 'bg-aqua-500',  label: 'Info' },
};

/**
 * Small status dot, optionally pulsing.
 * Used inside StatusChip and for the Dashboard nav-item leak indicator.
 */
export function StatusDot({ status = 'ok', pulse = false, className = '' }) {
  const { dot } = STATUS[status] ?? STATUS.ok;
  return (
    <span className={`relative inline-flex h-2 w-2 shrink-0 ${className}`} aria-hidden="true">
      {pulse && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot}`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
    </span>
  );
}

/**
 * Pill-shaped status badge.
 *   status   ok | warn | leak | offline | info
 *   label    overrides the default text
 *   pulse    animate the dot (defaults to true for `leak`)
 *   dot      show the leading dot (default true)
 */
export function StatusChip({
  status = 'ok',
  label,
  pulse,
  dot = true,
  className = '',
  children,
}) {
  const cfg = STATUS[status] ?? STATUS.ok;
  const shouldPulse = pulse ?? status === 'leak';

  return (
    <span className={`chip ${cfg.chip} ${className}`}>
      {dot && <StatusDot status={status} pulse={shouldPulse} />}
      {children ?? label ?? cfg.label}
    </span>
  );
}