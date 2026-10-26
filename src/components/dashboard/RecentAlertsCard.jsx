// File: src/components/dashboard/RecentAlertsCard.jsx
import { Link } from 'react-router-dom';
import { FaBell, FaArrowRight, FaShieldHalved } from 'react-icons/fa6';
import { GlassCard } from '@/components/ui/GlassCard';
import { getAlertTone, getAlertIcon } from '@/pages/Alerts';

/* The Alerts page classifies by tone name; map those to the muted palette. */
const TONE = {
  red:    { bg: 'bg-coral-100', fg: 'text-coral-600', chip: 'chip-leak' },
  amber:  { bg: 'bg-sand-100',  fg: 'text-sand-700',  chip: 'chip-warn' },
  violet: { bg: 'bg-hydro-100', fg: 'text-hydro-700', chip: 'chip-info' },
  aqua:   { bg: 'bg-aqua-100',  fg: 'text-aqua-700',  chip: 'chip-info' },
  slate:  { bg: 'bg-fog-100',   fg: 'text-fog-600',   chip: 'chip-offline' },
};

/**
 * Latest alerts across all devices.
 *   alerts  from useRecentAlerts()
 *   ready   false while subscriptions are loading
 */
export function RecentAlertsCard({ alerts, ready, className = '' }) {
  return (
    <GlassCard padded="md" className={className}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-hydro-50 text-hydro">
            <FaBell size={15} />
          </span>
          <div>
            <h3 className="section-title">Recent alerts</h3>
            <p className="text-xs text-ink-500">Latest {alerts.length || 5} events</p>
          </div>
        </div>

        <Link
          to="/alerts"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-hydro transition-colors hover:bg-white/60 hover:text-hydro-700"
        >
          View all <FaArrowRight size={10} />
        </Link>
      </div>

      {!ready ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 w-full" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white/30 px-4 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-sea-500 shadow-glass-sm">
            <FaShieldHalved size={18} />
          </span>
          <p className="mt-3 text-sm font-bold text-ink-800">No recent alerts</p>
          <p className="mt-1 text-xs text-ink-500">Your system is monitoring normally.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => {
            const tone = TONE[getAlertTone(a.type)] ?? TONE.slate;
            const Icon = getAlertIcon(a.type);
            const when = `${a.date} ${a.time}`.trim() || 'Just now';

            return (
              <li
                key={a.key}
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/50 px-3.5 py-3 transition-colors hover:bg-white/80"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone.bg} ${tone.fg}`}>
                  <Icon size={14} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`chip ${tone.chip}`}>{a.type}</span>
                    <span className="truncate text-xs font-semibold text-ink-700">{a.deviceName}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    Spike at <strong className="text-ink-800">{a.flowRate.toFixed(1)} LPM</strong>
                  </p>
                </div>

                <span className="shrink-0 text-right font-mono text-[11px] leading-tight text-ink-500">
                  {when}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}