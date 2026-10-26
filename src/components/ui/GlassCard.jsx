export function GlassCard({
  as: Tag = 'div',
  variant = 'default',
  padded = true,
  className = '',
  children,
  ...rest
}) {
  const variants = {
    default: 'glass',
    strong:  'glass-strong',
    soft:    'glass-soft',
  };

  return (
    <Tag
      className={[
        'rounded-2xl',
        variants[variant] ?? variants.default,
        padded ? 'p-6' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}