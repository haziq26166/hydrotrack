/**
 * Frosted-glass panel (translucent fill, backdrop blur, soft edge, squircle-ish corners).
 * The component name is kept so existing imports keep working.
 *
 * variant   default | strong | soft            → surface style
 *           ok | warn | leak | offline | aqua  → tinted status panel
 * padded    true (p-4) | false | 'sm' | 'md' | 'lg'
 * interactive  edge brightens and shadow deepens on hover (for clickable panels)
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
        interactive ? 'transition-[box-shadow,border-color] duration-150 hover:border-white hover:shadow-glass-lg' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}