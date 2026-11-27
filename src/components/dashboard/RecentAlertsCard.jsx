import { Link } from 'react-router-dom';
import { FaBell, FaArrowRight, FaShieldHalved, FaCheck } from 'react-icons/fa6';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { getAlertTone, getAlertIcon } from '@/pages/Alerts';

/* The Alerts page classifies by tone name; map those to the status palette. */
const TONE = {
  red:    { bg: 'bg-coral-100', fg: 'text-coral-600', chip: 'chip-leak' },
  amber:  { bg: 'bg-sand-100',  fg: 'text-sand-700',  chip: 'chip-warn' },
  violet: { bg: 'bg-hydro-100', fg: 'text-hydro-700', chip: 'chip-info' },
  aqua:   { bg: 'bg-aqua-100',  fg: 'text-aqua-700',  chip: 'chip-info' },
  slate:  { bg: 'bg-fog-100',   fg: 'text-fog-600',   chip: 'chip-offline' },
};

/**
 * Latest alerts for the device shown on the dashboard.
 *   alerts         from useRecentAlerts()
 *   ready          false while subscriptions are loading
 *   onAcknowledge  (alert) => void   — from useAlertAcknowledge()
 *   isPending      (alert) => boolean — from useAlertAcknowledge()
 */
export function RecentAlertsCard({
  alerts,
  ready,
  onAcknowledge,
  isPending = () => false,
  className = '',
}) {
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  return (
    <GlassCard padded="md" className={className}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded bg-hydro-50 text-hydro">
            <FaBell size={12} />
          </span>
          <div>
            <h3 className="section-title">Recent alerts</h3>
            <p className="text-xs text-ink-500">
              Latest {alerts.length || 5} events
              {unacknowledged > 0 && ` · ${unacknowledged} unacknowledged`}
            </p>
          </div>
        </div>

        <Link
          to="/alerts"
          className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-hydro transition-colors hover:bg-hydro-50 hover:text-hydro-700"
        >
          View all <FaArrowRight size={9} />
        </Link>
      </div>

      {!ready ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-11 w-full" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-center">
          <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white text-sea-500 shadow-glass-sm">
            <FaShieldHalved size={15} />
          </span>
          <p className="mt-2 text-[13px] font-semibold text-ink-800">No recent alerts</p>
          <p className="mt-0.5 text-xs text-ink-500">This device is monitoring normally.</p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100 rounded-md border border-ink-200">
          {alerts.map((a) => {
            const tone = TONE[getAlertTone(a.type)] ?? TONE.slate;
            const Icon = getAlertIcon(a.type);
            const when = `${a.date} ${a.time}`.trim() || 'Just now';

            return (
              <li
                key={a.key}
                className={[
                  'flex items-center gap-3 px-3 py-2 transition-colors hover:bg-ink-50',
                  a.acknowledged ? 'opacity-70' : '',
                ].join(' ')}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded ${tone.bg} ${tone.fg}`}>
                  <Icon size={12} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className={`chip ${tone.chip}`}>{a.type}</span>
                    <span className="text-xs font-semibold text-ink-700">
                      {a.flowRate.toFixed(1)} LPM
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-500">{when}</p>
                </div>

                <div className="shrink-0">
                  {a.acknowledged ? (
                    <span className="chip chip-ok">
                      <FaCheck size={9} />
                      Done
                    </span>
                  ) : (
                    onAcknowledge && (
                      <GlassButton
                        variant="primary"
                        size="sm"
                        loading={isPending(a)}
                        leftIcon={<FaCheck size={9} />}
                        onClick={() => onAcknowledge(a)}
                        aria-label={`Acknowledge ${a.type} on ${a.deviceName}`}
                      >
                        Ack
                      </GlassButton>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}