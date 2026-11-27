/**
 * Flat panel (white, 1 px border, small radius).
 * The component name is kept so existing imports keep working.
 *
 * variant   default | strong | soft            → surface style
 *           ok | warn | leak | offline | aqua  → tinted status panel
 * padded    true (p-4) | false | 'sm' | 'md' | 'lg'
 * interactive  subtle border change on hover (for clickable panels)
 */
const VARIANTS = {
  default: 'glass',
  strong:  'glass',
  soft:    'glass-soft',
  ok:      'glass-ok',
  warn:    'glass-warn',
  leak:    'glass-leak',
  offline: 'glass-offline',
  aqua:    'glass-aqua',
};

const PADDING = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function GlassCard({
  as: Tag = 'div',
  variant = 'default',
  padded = true,
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  const paddingCls =
    padded === true ? 'p-4' : typeof padded === 'string' ? (PADDING[padded] ?? 'p-4') : '';

  return (
    <Tag
      className={[
        'rounded-lg',
        VARIANTS[variant] ?? VARIANTS.default,
        paddingCls,
        interactive ? 'transition-colors duration-150 hover:border-ink-300' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}