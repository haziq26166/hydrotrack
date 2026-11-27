import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChartColumn, FaArrowRight } from 'react-icons/fa6';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

/**
 * 7-day usage bars (pure CSS — no chart library on the dashboard).
 *   usage       from useUsageHistory(): { days, weekTotal, avgPerDay, ready }
 *   deviceName  shown in the subtitle
 */
export function UsageTrendCard({ usage, deviceName, className = '' }) {
  const { days, weekTotal, avgPerDay, ready } = usage;
  const max = Math.max(...days.map((d) => d.total), 1);
  const empty = weekTotal <= 0;

  /* Bars grow from 0 on first paint */
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <GlassCard padded="md" className={className}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded bg-hydro-50 text-hydro">
            <FaChartColumn size={12} />
          </span>
          <div className="min-w-0">
            <h3 className="section-title">Usage trend</h3>
            <p className="truncate text-xs text-ink-500">
              Last 7 days{deviceName ? ` · ${deviceName}` : ''}
            </p>
          </div>
        </div>

        <Link
          to="/history"
          className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-hydro transition-colors hover:bg-hydro-50 hover:text-hydro-700"
        >
          History <FaArrowRight size={9} />
        </Link>
      </div>

      <div className="mb-3 flex items-baseline gap-4">
        <p>
          <AnimatedNumber value={weekTotal} className="text-xl font-bold tracking-tight text-ink-900" />{' '}
          <span className="kpi-unit">L total</span>
        </p>
        <p className="text-xs text-ink-500">
          Avg <span className="font-semibold text-ink-800">{Math.round(avgPerDay).toLocaleString()}</span> L / day
        </p>
      </div>

      {!ready ? (
        <div className="skeleton h-36 w-full" />
      ) : empty ? (
        <div className="grid h-36 place-items-center rounded-md border border-dashed border-ink-200 bg-ink-50 text-center">
          <p className="text-xs text-ink-500">No usage recorded in the last 7 days.</p>
        </div>
      ) : (
        <div
          className="flex h-36 items-end gap-2"
          role="img"
          aria-label={`Water usage over the last 7 days, ${Math.round(weekTotal)} litres in total`}
        >
          {days.map((d) => (
            <div
              key={d.key}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${d.label}: ${Math.round(d.total).toLocaleString()} L`}
            >
              <span className="text-[10px] font-semibold tabular-nums text-ink-500">
                {d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : Math.round(d.total)}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={[
                    'w-full rounded-t-sm transition-[height] duration-700 ease-out',
                    d.isToday ? 'bg-hydro' : 'bg-hydro-200',
                  ].join(' ')}
                  style={{ height: grown ? `${Math.max(4, (d.total / max) * 100)}%` : '0%' }}
                />
              </div>
              <span className={`text-[11px] font-medium ${d.isToday ? 'text-hydro-700' : 'text-ink-400'}`}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}