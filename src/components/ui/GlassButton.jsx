import { FaCircleNotch } from 'react-icons/fa6';

/**
 * Unified button component.
 *
 * Variants
 *   primary   — teal brand gradient (default)
 *   ghost     — white glass surface with teal text
 *   google    — white surface with border (login / register)
 *   outline   — transparent with white border (on dark / gradient CTAs)
 *   aqua      — soft aqua accent
 *   danger    — muted coral for destructive actions
 *
 * Sizes
 *   sm        — compact, used in table row actions
 *   md        — default, standard buttons
 *   lg        — tall, hero CTAs
 *   icon      — square icon-only button (pass aria-label!)
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
  sm:   'text-xs !px-3 !py-2',
  md:   'text-sm',
  lg:   'text-base !px-6 !py-3.5',
  icon: 'text-sm !p-0 h-11 w-11 shrink-0',
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
      {loading ? <FaCircleNotch size={14} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}