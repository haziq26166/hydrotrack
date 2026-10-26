// File: src/components/dashboard/UsageTrendCard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChartColumn, FaArrowRight } from 'react-icons/fa6';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

/**
 * 7-day usage bars (pure CSS — no chart library on the dashboard).
 *   usage  from useUsageHistory(): { days, weekTotal, avgPerDay, ready }
 */
export function UsageTrendCard({ usage, className = '' }) {
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
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-hydro-50 text-hydro">
            <FaChartColumn size={15} />
          </span>
          <div>
            <h3 className="section-title">Usage trend</h3>
            <p className="text-xs text-ink-500">Last 7 days · all devices</p>
          </div>
        </div>

        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-hydro transition-colors hover:bg-white/60 hover:text-hydro-700"
        >
          History <FaArrowRight size={10} />
        </Link>
      </div>

      <div className="mb-4 flex items-baseline gap-5">
        <p>
          <AnimatedNumber value={weekTotal} className="text-2xl font-extrabold tracking-tight text-ink-900" />{' '}
          <span className="kpi-unit">L total</span>
        </p>
        <p className="text-xs text-ink-500">
          Avg <span className="font-bold text-ink-800">{Math.round(avgPerDay).toLocaleString()}</span> L / day
        </p>
      </div>

      {!ready ? (
        <div className="skeleton h-40 w-full" />
      ) : empty ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-ink-200 bg-white/30 text-center">
          <p className="text-xs text-ink-500">No usage recorded in the last 7 days.</p>
        </div>
      ) : (
        <div className="flex h-40 items-end gap-2 sm:gap-3" role="img" aria-label={`Water usage over the last 7 days, ${Math.round(weekTotal)} litres in total`}>
          {days.map((d) => (
            <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${d.label}: ${Math.round(d.total).toLocaleString()} L`}>
              <span className="text-[10px] font-bold tabular-nums text-ink-500">
                {d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : Math.round(d.total)}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={[
                    'w-full rounded-t-xl transition-[height] duration-700 ease-out-expo',
                    d.isToday ? 'bg-hydro-gradient' : 'bg-gradient-to-t from-aqua-200 to-aqua-300/80',
                  ].join(' ')}
                  style={{ height: grown ? `${Math.max(4, (d.total / max) * 100)}%` : '0%' }}
                />
              </div>
              <span className={`text-[11px] font-semibold ${d.isToday ? 'text-hydro-700' : 'text-ink-400'}`}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}