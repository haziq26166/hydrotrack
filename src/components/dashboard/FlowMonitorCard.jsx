import { GlassCard } from '@/components/ui/GlassCard';
import { FaChartLine, FaDroplet, FaPlugCircleXmark } from 'react-icons/fa6';

export function FlowMonitorCard({
  flowRate = 0,
  loading = false,
  status = 'NORMAL',
  online = true,
  secondsAgo = null,
}) {
  const isAlert = online && (status === 'LEAK' || status === 'ALERT');
  const isOffline = !online;

  /* When offline, force the displayed reading to zero — the stale value
     from Firebase is misleading. */
  const displayedFlow = isOffline ? 0 : flowRate;
  const pct = Math.min(100, (displayedFlow / 40) * 100);

  /* Subtitle varies by state */
  let subtitle;
  if (loading) {
    subtitle = 'Loading…';
  } else if (isOffline) {
    subtitle = secondsAgo !== null
      ? `Device offline · last seen ${formatAgo(secondsAgo)}`
      : 'Device offline';
  } else if (isAlert) {
    subtitle = 'Leak detected';
  } else {
    subtitle = 'Live real-time feed · Monitoring';
  }

  return (
    <GlassCard className="relative overflow-hidden">
      {/* Soft glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-hydro-300/40 blur-3xl"
      />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-hydro/80">
            Current Flow Rate
          </p>

          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={[
                'text-5xl font-extrabold tracking-tight leading-none transition-colors',
                isOffline ? 'text-slate-400' : 'text-slate-900',
              ].join(' ')}
            >
              {loading ? '—' : displayedFlow.toFixed(1)}
            </span>
            <span
              className={[
                'text-lg font-bold',
                isOffline ? 'text-slate-400' : 'text-hydro-600',
              ].join(' ')}
            >
              LPM
            </span>
          </div>

          <p
            className={[
              'mt-3 text-sm',
              isOffline ? 'text-slate-400' : 'text-slate-500',
            ].join(' ')}
          >
            {subtitle}
          </p>
        </div>

        {/* Icon badge */}
        <span
          className={[
            'grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-lg',
            isOffline
              ? 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/30'
              : isAlert
                ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/40'
                : 'bg-gradient-to-br from-hydro-400 to-hydro shadow-hydro',
          ].join(' ')}
        >
          {isOffline
            ? <FaPlugCircleXmark size={18} />
            : isAlert
              ? <FaDroplet size={18} />
              : <FaChartLine size={18} />}
        </span>
      </div>

      {/* Flow meter bar */}
      <div className="relative mt-8 h-2 w-full overflow-hidden rounded-full bg-hydro-100/70">
        <div
          className={[
            'h-full rounded-full transition-all duration-500',
            isOffline
              ? 'bg-slate-300'
              : 'bg-gradient-to-r from-hydro-300 to-hydro-600',
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-400">
        <span>0</span>
        <span>20</span>
        <span>40+ LPM</span>
      </div>
    </GlassCard>
  );
}

/* Humanize "X seconds ago" into a compact label */
function formatAgo(seconds) {
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}