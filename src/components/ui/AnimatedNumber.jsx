import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Count-up number. Counts from 0 on first render, then tweens smoothly
 * from the currently displayed value whenever `value` changes (ideal for
 * live sensor data). Jumps straight to the value when the user prefers
 * reduced motion.
 *
 *   value      number | null | undefined  → falls back to `fallback`
 *   decimals   fixed decimal places
 *   duration   tween length in ms
 *   prefix / suffix   plain text around the number
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 900,
  prefix = '',
  suffix = '',
  fallback = '—',
  className = '',
}) {
  const target = Number(value);
  const valid =
    value !== null && value !== undefined && value !== '' && Number.isFinite(target);

  const [display, setDisplay] = useState(() =>
    valid && prefersReducedMotion() ? target : 0,
  );
  const fromRef = useRef(display);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!valid) return undefined;

    if (prefersReducedMotion() || duration <= 0) {
      fromRef.current = target;
      setDisplay(target);
      return undefined;
    }

    const from = fromRef.current;
    if (from === target) return undefined;

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * easeOutCubic(t);
      fromRef.current = next;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, valid, duration]);

  if (!valid) return <span className={className}>{fallback}</span>;

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}