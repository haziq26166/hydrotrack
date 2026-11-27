import { FaCircleNotch } from 'react-icons/fa6';

/**
 * Unified button component (flat, compact).
 *
 * Variants
 *   primary   — solid teal (default)
 *   ghost     — white with border
 *   google    — white with border (login / register)
 *   outline   — transparent with white border (on dark surfaces)
 *   aqua      — soft aqua accent
 *   danger    — red for destructive actions
 *
 * Sizes
 *   sm        — 28 px, used in table rows
 *   md        — 36 px, default
 *   lg        — 40 px, primary CTAs
 *   icon      — 36 px square, icon-only (pass aria-label!)
 */
const VARIANT_CLS = {
  primary: 'btn-hydro',
  ghost:   'btn-glass',
  google:  'btn-google',
  outline: 'btn-hydro-outline',
  aqua:    'btn-aqua-ghost',
  danger:  'btn-danger',
};

const SIZE_CLS = {
  sm:   '!h-7 !px-2.5 text-xs',
  md:   '',
  lg:   '!h-10 !px-5 text-sm',
  icon: '!h-9 !w-9 !p-0 shrink-0',
};

export function GlassButton({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        VARIANT_CLS[variant] ?? VARIANT_CLS.primary,
        SIZE_CLS[size] ?? SIZE_CLS.md,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <FaCircleNotch size={13} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}