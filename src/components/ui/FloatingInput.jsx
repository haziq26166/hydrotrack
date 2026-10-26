// File: src/components/ui/FloatingInput.jsx
import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

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

  /* Base border + focus styling, switched when `error` is true */
  const borderCls = error
    ? 'border-coral-300 focus:border-coral-500 focus:ring-4 focus:ring-coral-200/60'
    : 'border-ink-200 focus:border-hydro focus:ring-4 focus:ring-aqua/20';

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
          'peer w-full rounded-2xl border bg-white/80 backdrop-blur-md',
          'px-4 pt-5 pb-2 text-[15px] text-ink-900',
          'outline-none transition-all duration-200',
          'disabled:bg-ink-50/70 disabled:text-ink-500 disabled:cursor-not-allowed',
          'disabled:focus:ring-0 disabled:focus:border-ink-200',
          borderCls,
          Icon ? 'pl-11' : '',
          isPassword ? 'pr-11' : '',
        ].join(' ')}
        {...rest}
      />

      {Icon && (
        <Icon
          size={15}
          className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${iconColor}`}
        />
      )}

      <label
        htmlFor={id}
        className={[
          'pointer-events-none absolute top-1/2 -translate-y-1/2',
          'text-sm origin-left transition-all duration-200',
          labelColor,
          Icon ? 'left-11' : 'left-4',
          'peer-focus:top-2 peer-focus:translate-y-0',
          'peer-focus:text-[11px] peer-focus:font-semibold',
          !disabled && labelFocusColor,
          'peer-[:not(:placeholder-shown)]:top-2',
          'peer-[:not(:placeholder-shown)]:translate-y-0',
          'peer-[:not(:placeholder-shown)]:text-[11px]',
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
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-ink-400 transition-colors hover:text-hydro"
        >
          {show ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
        </button>
      )}
    </div>
  );
}