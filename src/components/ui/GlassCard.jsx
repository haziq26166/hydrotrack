// File: src/components/ui/GlassCard.jsx

/**
 * Frosted-glass surface.
 *
 * variant   default | strong | soft            → glass density
 *           ok | warn | leak | offline | aqua  → tinted status glass
 * padded    true (p-6) | false | 'sm' | 'md' | 'lg'
 * interactive  adds a gentle hover-lift (use for clickable cards)
 */
const VARIANTS = {
  default: 'glass',
  strong:  'glass-strong',
  soft:    'glass-soft',
  ok:      'glass-ok',
  warn:    'glass-warn',
  leak:    'glass-leak',
  offline: 'glass-offline',
  aqua:    'glass-aqua',
};

const PADDING = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-8',
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
    padded === true ? 'p-6' : typeof padded === 'string' ? (PADDING[padded] ?? 'p-6') : '';

  return (
    <Tag
      className={[
        'rounded-3xl',
        VARIANTS[variant] ?? VARIANTS.default,
        paddingCls,
        interactive
          ? 'transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-glass-lg hover:bg-white/70'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}