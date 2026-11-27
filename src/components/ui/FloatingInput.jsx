import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

/**
 * Compact floating-label input (44 px tall).
 * API unchanged: id, label, type, icon, disabled, error + any <input> props.
 */
export function FloatingInput({
  id,
  label,
  type = 'text',
  icon: Icon,
  disabled = false,
  error = false,
  className = '',
  ...rest
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword ? (show ? 'text' : 'password') : type;

  const borderCls = error
    ? 'border-coral-300 focus:border-coral-500 focus:ring-2 focus:ring-coral-200/70'
    : 'border-ink-200 focus:border-hydro focus:ring-2 focus:ring-hydro/20';

  const iconColor = disabled
    ? 'text-ink-300'
    : error
      ? 'text-coral-400 peer-focus:text-coral-600'
      : 'text-ink-400 peer-focus:text-hydro';

  const labelColor = disabled
    ? 'text-ink-400'
    : error
      ? 'text-coral-600'
      : 'text-ink-500';

  const labelFocusColor = error ? 'peer-focus:text-coral-600' : 'peer-focus:text-hydro';

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={inputType}
        disabled={disabled}
        placeholder=" "
        aria-invalid={error || undefined}
        className={[
          'peer h-11 w-full rounded-md border bg-white',
          'px-3 pt-4 pb-1 text-[13px] text-ink-900',
          'outline-none transition-colors duration-150',
          'disabled:bg-ink-50 disabled:text-ink-500 disabled:cursor-not-allowed',
          'disabled:focus:ring-0 disabled:focus:border-ink-200',
          borderCls,
          Icon ? 'pl-9' : '',
          isPassword ? 'pr-10' : '',
        ].join(' ')}
        {...rest}
      />

      {Icon && (
        <Icon
          size={13}
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconColor}`}
        />
      )}

      <label
        htmlFor={id}
        className={[
          'pointer-events-none absolute top-1/2 -translate-y-1/2',
          'text-[13px] origin-left transition-all duration-150',
          labelColor,
          Icon ? 'left-9' : 'left-3',
          'peer-focus:top-1.5 peer-focus:translate-y-0',
          'peer-focus:text-[10px] peer-focus:font-semibold',
          !disabled && labelFocusColor,
          'peer-[:not(:placeholder-shown)]:top-1.5',
          'peer-[:not(:placeholder-shown)]:translate-y-0',
          'peer-[:not(:placeholder-shown)]:text-[10px]',
          'peer-[:not(:placeholder-shown)]:font-semibold',
        ].join(' ')}
      >
        {label}
      </label>

      {isPassword && !disabled && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-400 transition-colors hover:text-hydro"
        >
          {show ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
        </button>
      )}
    </div>
  );
}