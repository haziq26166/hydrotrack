import { useId } from 'react';

/**
 * Accessible on/off switch.
 *   checked, onChange(next:boolean), disabled
 *   Pass `aria-labelledby` or `aria-label` so screen readers know what it controls.
 */
export function Switch({ checked, onChange, disabled = false, ...aria }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'bg-hydro' : 'bg-ink-200',
      ].join(' ')}
      {...aria}
    >
      <span
        className={[
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md',
          'transition-transform duration-200 ease-out-expo',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

/** Title + description on the left, switch on the right. */
export function SwitchRow({ title, description, checked, onChange, disabled = false }) {
  const titleId = useId();
  const descId = useId();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={titleId} className={`text-sm font-semibold ${disabled ? 'text-ink-500' : 'text-ink-800'}`}>
          {title}
        </p>
        {description && (
          <p id={descId} className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      />
    </div>
  );
}