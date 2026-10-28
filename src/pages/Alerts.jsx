import { useEffect, useMemo, useState } from 'react';
import {
  FaBell, FaMagnifyingGlass, FaTriangleExclamation,
  FaClock, FaMoon, FaCircleCheck, FaWater, FaChevronDown,
} from 'react-icons/fa6';
import { database, ref, onValue } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { DeviceSelect } from '@/components/devices/DeviceSelect';

/* Rows rendered before "Show more" — keeps long histories fast. */
const PAGE_SIZE = 50;

/* ============================================================
   ALERT CLASSIFICATION — single source of truth
   (also imported by the dashboard's Recent Alerts card)
   ============================================================ */
export function getAlertTone(type = '') {
  const t = type.toLowerCase();
  if (t.includes('hammer'))     return 'violet';
  if (t.includes('high'))       return 'red';
  if (t.includes('continuous')) return 'amber';
  if (t.includes('off-hours'))  return 'aqua';
  return 'slate';
}

export function getAlertIcon(type = '') {
  const t = type.toLowerCase();
  if (t.includes('hammer'))     return FaWater;
  if (t.includes('high'))       return FaTriangleExclamation;
  if (t.includes('continuous')) return FaClock;
  if (t.includes('off-hours'))  return FaMoon;
  return FaBell;
}

export default function Alerts() {
  const { user } = useAuth();
  const { devices } = useDevices(user.uid);

  const [alertsByDevice, setAlertsByDevice] = useState({});
  const [deviceFilter, setDeviceFilter]     = useState('ALL');
  const [sortBy, setSortBy]                 = useState('newest');
  const [query, setQuery]                   = useState('');
  const [limit, setLimit]                   = useState(PAGE_SIZE);

  useEffect(() => {
    const unsubs = [];
    Object.keys(devices).forEach((id) => {
      const name = devices[id].name;
      const unsub = onValue(
        ref(database, `users/${user.uid}/devices/${id}/alerts`),
        (snap) => {
          const raw = snap.val() || {};
          const items = Object.entries(raw).map(([key, val]) => ({
            id: key,
            deviceId: id,
            deviceName: name,
            type:      val.type || 'Leak Alert',
            date:      val.date || '',
            time:      val.time || '',
            flowRate:  Number(val.flow_rate || 0),
            timestamp: Number(val.timestamp || 0),
          }));
          setAlertsByDevice((prev) => ({ ...prev, [id]: items }));
        }
      );
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [devices, user.uid]);

  /* Back to the first page whenever the result set changes shape */
  useEffect(() => { setLimit(PAGE_SIZE); }, [deviceFilter, sortBy, query]);

  const deviceFiltered = useMemo(() => {
    const flat = Object.values(alertsByDevice).flat();
    return deviceFilter === 'ALL'
      ? flat
      : flat.filter((a) => a.deviceId === deviceFilter);
  }, [alertsByDevice, deviceFilter]);

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = deviceFiltered.filter((a) =>
      a.type.toLowerCase().includes(q) ||
      a.date.toLowerCase().includes(q) ||
      a.deviceName.toLowerCase().includes(q) ||
      a.deviceId.toLowerCase().includes(q)
    );

    filtered.sort((a, b) => {
      if (sortBy === 'oldest')   return a.timestamp - b.timestamp;
      if (sortBy === 'severity') return b.flowRate - a.flowRate;
      return b.timestamp - a.timestamp;
    });
    return filtered;
  }, [deviceFiltered, sortBy, query]);

  const stats = useMemo(() => ({
    total:      deviceFiltered.length,
    high:       deviceFiltered.filter((a) => a.type.toLowerCase().includes('high')).length,
    continuous: deviceFiltered.filter((a) => a.type.toLowerCase().includes('continuous')).length,
    offHours:   deviceFiltered.filter((a) => a.type.toLowerCase().includes('off-hours')).length,
    hammer:     deviceFiltered.filter((a) => a.type.toLowerCase().includes('hammer')).length,
  }), [deviceFiltered]);

  const shown = visible.slice(0, limit);

  return (
    <>
      <TopBar
        title="Alerts"
        icon={FaBell}
        subtitle={`${stats.total} ${stats.total === 1 ? 'event' : 'events'} recorded`}
      />

      {/* STAT ROW — five tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard className="col-span-2 lg:col-span-1" label="Total alerts"    value={stats.total}      Icon={FaBell}                tone="hydro" />
        <StatCard label="High flow"       value={stats.high}       Icon={FaTriangleExclamation} tone="red" />
        <StatCard label="Continuous leak" value={stats.continuous} Icon={FaClock}               tone="amber" />
        <StatCard label="Off-hours flow"  value={stats.offHours}   Icon={FaMoon}                tone="aqua" />
        <StatCard label="Water hammer"    value={stats.hammer}     Icon={FaWater}               tone="violet" />
      </div>

      {/* TOOLBAR */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <FaMagnifyingGlass size={14} className="hydro-input-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alerts by type, date, or device…"
            aria-label="Search alerts"
            className="hydro-input !pl-10"
          />
        </div>

        <div className="w-full sm:w-64">
          <DeviceSelect
            devices={devices}
            value={deviceFilter}
            onChange={setDeviceFilter}
            allLabel="All registered devices"
          />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort alerts"
            className="hydro-input w-auto cursor-pointer appearance-none !pr-10"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="severity">Severity (high first)</option>
          </select>
          <FaChevronDown size={11} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
        </div>
      </div>

      {/* RESULTS */}
      <GlassCard padded={false} className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState hasAlerts={deviceFiltered.length > 0} />
        ) : (
          <>
            {/* ---- Phones: stacked cards ---- */}
            <ul className="divide-y divide-white/60 md:hidden">
              {shown.map((a) => {
                const tone = getAlertTone(a.type);
                const Icon = getAlertIcon(a.type);
                return (
                  <li key={`${a.deviceId}:${a.id}`} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Badge tone={tone} Icon={Icon}>{a.type}</Badge>
                      <p className="shrink-0 text-right font-mono text-[11px] leading-tight text-ink-500">
                        {a.date || '—'}
                        <br />
                        {a.time || '—'}
                      </p>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-800">{a.deviceName}</p>
                        <code className="font-mono text-[11px] text-ink-500">{a.deviceId}</code>
                      </div>
                      <p className="shrink-0 text-lg font-extrabold tabular-nums text-ink-900">
                        {a.flowRate.toFixed(1)}
                        <span className="ml-1 text-xs font-semibold text-ink-400">LPM</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* ---- Tablet / desktop: table ---- */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-white/60 bg-white/30 text-left">
                  <tr>
                    {['When', 'Alert', 'Flow rate', 'Device'].map((h) => (
                      <th key={h} scope="col" className="kpi-label px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                  {shown.map((a) => {
                    const tone = getAlertTone(a.type);
                    const Icon = getAlertIcon(a.type);
                    return (
                      <tr key={`${a.deviceId}:${a.id}`} className="transition-colors hover:bg-white/50">
                        <td className="px-5 py-4 align-top">
                          <p className="font-mono text-xs font-semibold text-ink-700">{a.date || '—'}</p>
                          <p className="font-mono text-[11px] text-ink-400">{a.time || '—'}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <Badge tone={tone} Icon={Icon}>{a.type}</Badge>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="text-sm font-bold tabular-nums text-ink-800">
                            {a.flowRate.toFixed(1)}
                            <span className="ml-1 text-xs font-semibold text-ink-400">LPM</span>
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="text-sm font-semibold text-ink-700">{a.deviceName}</p>
                          <code className="font-mono text-[11px] text-ink-500">{a.deviceId}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visible.length > shown.length && (
              <div className="flex flex-col items-center gap-2 border-t border-white/60 bg-white/30 px-4 py-4">
                <p className="text-xs text-ink-500">
                  Showing {shown.length} of {visible.length}
                </p>
                <GlassButton variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Show more
                </GlassButton>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </>
  );
}

/* ============================================================
   SHARED BADGE — alert-type pill (muted palette)
   ============================================================ */

const BADGE_STYLES = {
  red:    'chip-leak',
  amber:  'chip-warn',
  violet: 'chip-info',
  aqua:   'chip-info',
  slate:  'chip-offline',
};

export function Badge({ tone = 'slate', Icon, children }) {
  return (
    <span className={`chip ${BADGE_STYLES[tone] ?? BADGE_STYLES.slate}`}>
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */

const STAT_TONES = {
  hydro:  'bg-hydro-50 text-hydro',
  red:    'bg-coral-100 text-coral-600',
  amber:  'bg-sand-100 text-sand-700',
  aqua:   'bg-aqua-100 text-aqua-700',
  violet: 'bg-hydro-100 text-hydro-700',
};

function StatCard({ label, value, Icon, tone = 'hydro', className = '' }) {
  return (
    <GlassCard padded="md" className={className}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="kpi-label truncate">{label}</p>
          <p className="mt-2">
            <AnimatedNumber value={value} duration={700} className="text-3xl font-extrabold tracking-tight text-ink-900" />
          </p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${STAT_TONES[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
    </GlassCard>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({ hasAlerts }) {
  if (hasAlerts) {
    return (
      <div className="py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-50 text-ink-400">
          <FaMagnifyingGlass size={20} />
        </span>
        <h3 className="mt-4 text-base font-bold text-ink-900">No matching alerts</h3>
        <p className="mt-1 text-sm text-ink-500">Try a different search term or device filter.</p>
      </div>
    );
  }

  return (
    <div className="py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-sea-50 text-sea-500">
        <FaCircleCheck size={26} />
      </span>
      <h3 className="mt-5 text-lg font-bold text-ink-900">No alerts recorded</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
        Your water monitoring system has not detected any anomalies.
        Keep it that way — no news is good news.
      </p>
    </div>
  );
}