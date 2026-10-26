import { FaCircleNotch } from 'react-icons/fa6';

/**
 * Unified button component.
 *
 * Variants
 *   primary   — solid navy (default)
 *   ghost     — white glass surface with navy text
 *   google    — white surface with border (used on login/register)
 *   outline   — transparent with white border (used on dark CTAs)
 *   aqua      — sky-blue soft accent
 *   danger    — red for destructive actions
 *
 * Sizes
 *   sm        — compact (h-9), used in table row actions
 *   md        — default (h-11), standard buttons
 *   lg        — tall (h-12), hero CTAs
 */
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
  const variantCls = {
    primary: 'btn-hydro',
    ghost:   'btn-glass',
    google:  'btn-google',
    outline: 'btn-hydro-outline',
    aqua:    'btn-aqua-ghost',
    danger:  'btn-danger',
  }[variant] ?? 'btn-hydro';

  const sizeCls = {
    sm: 'text-xs !px-3 !py-2',
    md: 'text-sm',
    lg: 'text-base !px-6 !py-3.5',
  }[size] ?? 'text-sm';

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        variantCls,
        sizeCls,
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