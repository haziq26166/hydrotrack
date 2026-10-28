/* One seamless wave period is 600 units; the SVG holds two (1200 wide)
   and is shifted by -50% to loop without a visible seam. */
const WAVE_PATH =
  'M0 20 C 100 0, 200 0, 300 20 S 500 40, 600 20 S 800 0, 900 20 S 1100 40, 1200 20 V40 H0 Z';

/* Full class strings so Tailwind's JIT can see them. */
const TONES = {
  water: {
    body:  'from-aqua-300/70 to-hydro-400/80',
    front: 'text-aqua-300/70',
    back:  'text-aqua-200/60',
  },
  ok: {
    body:  'from-sea-300/70 to-sea-500/80',
    front: 'text-sea-300/70',
    back:  'text-sea-200/60',
  },
  warn: {
    body:  'from-sand-300/70 to-sand-500/80',
    front: 'text-sand-300/70',
    back:  'text-sand-200/60',
  },
  leak: {
    body:  'from-coral-300/70 to-coral-500/80',
    front: 'text-coral-300/70',
    back:  'text-coral-200/60',
  },
  offline: {
    body:  'from-fog-200/70 to-fog-300/80',
    front: 'text-fog-200/70',
    back:  'text-fog-100/60',
  },
};

/**
 * Animated water-level fill. Fills its parent's box (give it a size and
 * rounded corners via className) — the level rises with a smooth
 * transition and the surface gently waves.
 *
 *   level     0–100 (percent full)
 *   tone      water | ok | warn | leak | offline
 *   animated  set false to freeze the waves
 */
export function WaterFill({ level = 0, tone = 'water', animated = true, className = '' }) {
  const raw = Number(level);
  const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
  const t = TONES[tone] ?? TONES.water;

  return (
    <div
      role="img"
      aria-label={`Water level ${Math.round(pct)} percent`}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-1000 ease-out-expo"
        style={{ height: `${pct}%` }}
      >
        {pct > 0 && (
          <>
            {/* Back wave — slower, drifting the other way */}
            <svg
              aria-hidden="true"
              viewBox="0 0 1200 40"
              preserveAspectRatio="none"
              className={`absolute -top-5 left-0 h-5 w-[200%] fill-current ${t.back} ${animated ? 'animate-wave-slow' : ''}`}
            >
              <path d={WAVE_PATH} />
            </svg>

            {/* Front wave — sits flush on top of the body */}
            <svg
              aria-hidden="true"
              viewBox="0 0 1200 40"
              preserveAspectRatio="none"
              className={`absolute -top-3.5 left-0 h-3.5 w-[200%] fill-current ${t.front} ${animated ? 'animate-wave' : ''}`}
            >
              <path d={WAVE_PATH} />
            </svg>
          </>
        )}

        <div className={`h-full w-full bg-gradient-to-b ${t.body}`} />
      </div>
    </div>
  );
}