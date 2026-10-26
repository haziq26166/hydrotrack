import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaTableCellsLarge, FaDroplet, FaBell, FaArrowRight,
  FaGaugeHigh, FaWifi, FaCircleNotch, FaArrowTrendUp, FaPlugCircleXmark,
} from 'react-icons/fa6';
import { database, ref, onValue } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import { useLiveData } from '@/hooks/useLiveData';
import { useDeviceStatus } from '@/hooks/useDeviceStatus';
import { TopBar } from '@/components/layout/TopBar';
import { LeakAlertBanner } from '@/components/dashboard/LeakAlertBanner';
import { FlowMonitorCard } from '@/components/dashboard/FlowMonitorCard';
import { GlassCard } from '@/components/ui/GlassCard';

/* ============================================================
   SHARED ALERT HELPERS — imported from the Alerts page so the
   icon + tone stay in sync across the whole app.
   ============================================================ */
import {
  getAlertTone,
  getAlertIcon,
  Badge,
} from './Alerts';

/* Icon-badge background by tone (used for the leading circle) */
const ICON_BG = {
  red:    'bg-red-500',
  amber:  'bg-amber-500',
  violet: 'bg-violet-500',
  aqua:   'bg-aqua-500',
  slate:  'bg-slate-400',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { devices, loading: devicesLoading } = useDevices(user.uid);

  const deviceId = Object.keys(devices)[0] ?? null;
  const device   = deviceId ? devices[deviceId] : null;

  const { live, loading: liveLoading } = useLiveData(deviceId);
  const { isOnline, secondsAgo }       = useDeviceStatus(live);

  const [recentAlerts, setRecentAlerts] = useState([]);

  /* ---- Subscribe to user-scoped alerts for the current device ---- */
  useEffect(() => {
    if (!deviceId) {
      setRecentAlerts([]);
      return;
    }

    const unsub = onValue(
      ref(database, `users/${user.uid}/devices/${deviceId}/alerts`),
      (snap) => {
        const raw = snap.val() || {};
        const list = Object.values(raw)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 5);
        setRecentAlerts(list);
      },
      (err) => console.error('[dashboard] alerts subscribe failed:', err)
    );

    return unsub;
  }, [deviceId, user.uid]);

  const status    = live?.leak_status ?? 'NORMAL';
  const flowRate  = Number(live?.current_flow ?? 0);
  const usage     = Number(live?.todays_usage ?? 0);
  const peakToday = Number(live?.highest_flow_rate ?? 0);

  return (
    <>
      <TopBar title="Dashboard" icon={FaTableCellsLarge} />

      <div className="space-y-5">
        <LeakAlertBanner status={status} online={isOnline} />

        {devicesLoading ? (
          <GlassCard className="py-16 text-center text-slate-500">
            <FaCircleNotch size={20} className="mx-auto mb-3 animate-spin text-hydro" />
            Loading your dashboard…
          </GlassCard>
        ) : !device ? (
          <EmptyState />
        ) : (
          <>
            {/* ============================================================
                DEVICE HERO
                ============================================================ */}
            <div className="relative overflow-hidden rounded-2xl bg-hydro-gradient p-5 text-white shadow-hydro-lg sm:p-6">
              <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-10">
                <defs>
                  <pattern id="dash-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dash-grid)" />
              </svg>
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-aqua/30 blur-3xl"
              />

              <div className="relative flex flex-wrap items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-white/25 bg-white/15 backdrop-blur-md">
                  <FaDroplet size={22} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                    Monitoring
                  </p>
                  <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight">
                    {device.name}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-white/60">{device.id}</p>
                </div>

                <StatusPill online={isOnline} status={status} />
              </div>
            </div>

            {/* ============================================================
                METRIC ROW
                ============================================================ */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <FlowMonitorCard
                flowRate={flowRate}
                loading={liveLoading}
                status={status}
                online={isOnline}
                secondsAgo={secondsAgo}
              />

              <MetricCard
                label="Today's Usage"
                value={usage.toFixed(1)}
                unit="L"
                subtext="Cumulative volume since midnight"
                Icon={FaDroplet}
                online={isOnline}
              />

              <MetricCard
                label="Peak Flow Today"
                value={peakToday.toFixed(1)}
                unit="LPM"
                subtext="Highest instant reading recorded"
                Icon={FaArrowTrendUp}
                online={isOnline}
              />
            </div>

            {/* ============================================================
                RECENT ALERTS — icons match the Alerts page
                ============================================================ */}
            <GlassCard>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-hydro/10 text-hydro">
                    <FaBell size={16} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Recent Alerts</h3>
                    <p className="text-xs text-slate-500">
                      Latest 5 events for this device
                    </p>
                  </div>
                </div>
                <Link
                  to="/alerts"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-hydro hover:text-hydro-light transition"
                >
                  View all <FaArrowRight size={11} />
                </Link>
              </div>

              {recentAlerts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm">
                    <FaGaugeHigh size={20} />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No recent alerts
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Your system is monitoring normally.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentAlerts.map((alert) => {
                    const type = alert.type || 'Leak Alert';
                    const tone = getAlertTone(type);        /* shared helper */
                    const Icon = getAlertIcon(type);        /* shared helper */
                    const flow = Number(alert.flow_rate || 0).toFixed(1);
                    const when = `${alert.date || ''} ${alert.time || ''}`.trim() || 'Just now';

                    return (
                      <li
                        key={alert.timestamp + type}
                        className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition-colors hover:bg-slate-50"
                      >
                        {/* Icon badge — tone-tinted, same as Alerts page */}
                        <span
                          className={[
                            'grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-sm',
                            ICON_BG[tone] ?? ICON_BG.slate,
                          ].join(' ')}
                        >
                          <Icon size={13} />
                        </span>

                        <div className="min-w-0 flex-1">
                          {/* Badge — same component used on the Alerts page */}
                          <Badge tone={tone} Icon={Icon}>{type}</Badge>
                          <p className="mt-1 text-xs text-slate-500">
                            Spike at <strong className="text-slate-700">{flow} LPM</strong>
                          </p>
                        </div>

                        <span className="shrink-0 font-mono text-[11px] text-slate-500">
                          {when}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </>
  );
}

/* ============================================================
   HELPER COMPONENTS
   ============================================================ */

function StatusPill({ online, status }) {
  if (!online) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md text-white/80">
        <FaPlugCircleXmark size={11} />
        Offline
      </div>
    );
  }

  const isAlert = status === 'LEAK' || status === 'ALERT';
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md">
      <FaWifi size={11} />
      {isAlert ? 'Leak Detected' : 'Online'}
    </div>
  );
}

function MetricCard({ label, value, unit, subtext, Icon, online }) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-hydro-300/25 blur-3xl"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-hydro/80">
            {label}
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={[
                'text-5xl font-extrabold leading-none tracking-tight transition-colors',
                online ? 'text-slate-900' : 'text-slate-400',
              ].join(' ')}
            >
              {value}
            </span>
            <span
              className={[
                'text-lg font-bold',
                online ? 'text-hydro-600' : 'text-slate-400',
              ].join(' ')}
            >
              {unit}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-500">{subtext}</p>
        </div>
        <span
          className={[
            'grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-lg',
            online
              ? 'bg-gradient-to-br from-hydro-400 to-hydro shadow-hydro'
              : 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/30',
          ].join(' ')}
        >
          <Icon size={18} />
        </span>
      </div>
    </GlassCard>
  );
}

function EmptyState() {
  return (
    <GlassCard className="py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-hydro/10 text-hydro">
        <FaDroplet size={26} />
      </span>
      <h2 className="mt-5 text-lg font-bold text-slate-800">No devices yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        Link your first HydroTrack device to start monitoring water flow and receive alerts.
      </p>
      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-hydro/70">
        Click <strong>Add Device</strong> in the sidebar
      </p>
    </GlassCard>
  );
}