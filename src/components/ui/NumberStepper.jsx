import { useEffect, useRef } from 'react';
import { FaMinus, FaPlus } from 'react-icons/fa6';

const BTN =
  'grid shrink-0 place-items-center border border-ink-200 bg-white/80 text-ink-700 ' +
  'transition-colors hover:border-hydro/40 hover:bg-hydro-50 hover:text-hydro-700 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-200 ' +
  'disabled:hover:bg-white/80 disabled:hover:text-ink-700';

/**
 * Number stepper:  [ − ]  4  [ + ]
 *
 * Props
 *   value, onChange(next:number)
 *   min, max           clamp range (default 1–20)
 *   unit               optional small caption under the number ("people")
 *   compact            smaller version for settings rows
 *   autoFocus          focus the number when it mounts (keyboard: ↑ ↓ Home End)
 *   aria-label         what the stepper controls
 */
export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  unit,
  compact = false,
  disabled = false,
  autoFocus = false,
  'aria-label': ariaLabel = 'Number',
}) {
  const valueRef = useRef(null);

  useEffect(() => {
    if (autoFocus) valueRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const clamp = (n) => Math.min(max, Math.max(min, n));
  const step = (delta) => onChange(clamp(value + delta));

  function onKeyDown(e) {
    if (disabled) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); onChange(min); }
    else if (e.key === 'End')  { e.preventDefault(); onChange(max); }
  }

  const btnSize = compact ? 'h-9 w-9 rounded-xl' : 'h-12 w-12 rounded-2xl';

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${ariaLabel}`}
        className={`${BTN} ${btnSize}`}
      >
        <FaMinus size={compact ? 11 : 13} />
      </button>

      <div
        ref={valueRef}
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        className={[
          'rounded-xl text-center outline-none focus-visible:ring-4 focus-visible:ring-aqua/30',
          compact ? 'min-w-[3rem] px-1' : 'min-w-[5rem] px-2 py-1',
          disabled ? 'opacity-60' : '',
        ].join(' ')}
      >
        <span
          className={`block font-extrabold tabular-nums text-ink-900 ${
            compact ? 'text-lg' : 'text-4xl leading-none'
          }`}
        >
          {value}
        </span>
        {unit && !compact && (
          <span className="mt-1 block text-xs font-semibold text-ink-500">{unit}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={disabled || value >= max}
        aria-label={`Increase ${ariaLabel}`}
        className={`${BTN} ${btnSize}`}
      >
        <FaPlus size={compact ? 11 : 13} />
      </button>
    </div>
  );
}