import { GlassCard } from './GlassCard';
import { AnimatedNumber } from './AnimatedNumber';

/**
 * Compact metric tile used on the Dashboard and History pages.
 *
 *   Icon       react-icons component
 *   label      small uppercase caption
 *   value      number (animated) — ignored when `children` is given
 *   unit       text after the number
 *   decimals   decimals shown for `value`
 *   sub        small caption under the value
 *   children   custom content in place of the number (e.g. a status chip)
 */
export function StatTile({
  Icon,
  label,
  value,
  unit,
  decimals = 0,
  sub,
  children,
  className = '',
}) {
  return (
    <GlassCard padded="md" className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-hydro-50 text-hydro">
            <Icon size={11} />
          </span>
        )}
        <p className="kpi-label truncate">{label}</p>
      </div>

      <div className="mt-3 flex min-h-[2rem] items-baseline gap-1.5">
        {children ?? (
          <>
            <AnimatedNumber
              value={value}
              decimals={decimals}
              duration={600}
              className="text-2xl font-bold tracking-tight text-ink-900"
            />
            {unit && <span className="kpi-unit">{unit}</span>}
          </>
        )}
      </div>

      {sub && <p className="mt-1 min-h-[1rem] text-xs text-ink-500">{sub}</p>}
    </GlassCard>
  );
}