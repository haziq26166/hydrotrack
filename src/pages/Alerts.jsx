import { useEffect, useMemo, useState } from 'react';
import {
  FaBell, FaMagnifyingGlass, FaTriangleExclamation,
  FaClock, FaMoon, FaCircleCheck, FaWater,
} from 'react-icons/fa6';
import { database, ref, onValue } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { DeviceSelect } from '@/components/devices/DeviceSelect';

/* ============================================================
   ALERT CLASSIFICATION — single source of truth
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

  return (
    <>
      <TopBar title="Alerts" icon={FaBell} />

      {/* STAT ROW — five cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Alerts"    value={stats.total}      Icon={FaBell}                tone="hydro" />
        <StatCard label="High Flow"       value={stats.high}       Icon={FaTriangleExclamation} tone="red" />
        <StatCard label="Continuous Leak" value={stats.continuous} Icon={FaClock}               tone="amber" />
        <StatCard label="Off-Hours Flow"  value={stats.offHours}   Icon={FaMoon}                tone="aqua" />
        <StatCard label="Water Hammer"    value={stats.hammer}     Icon={FaWater}               tone="violet" />
      </div>

      {/* TOOLBAR */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FaMagnifyingGlass size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alerts by type, date, or device…"
            className="hydro-input !pl-10"
          />
        </div>

        <div className="w-64">
          <DeviceSelect
            devices={devices}
            value={deviceFilter}
            onChange={setDeviceFilter}
            allLabel="All Registered Devices"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="hydro-input w-auto cursor-pointer !pl-4"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="severity">Severity (High First)</option>
        </select>
      </div>

      {/* TABLE */}
      <GlassCard padded={false} className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState hasAlerts={deviceFiltered.length > 0} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-left">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">When</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Alert</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Flow Rate</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((a) => {
                  const tone = getAlertTone(a.type);
                  const Icon = getAlertIcon(a.type);
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4 align-top">
                        <p className="font-mono text-xs font-semibold text-slate-700">{a.date || '—'}</p>
                        <p className="font-mono text-[11px] text-slate-400">{a.time || '—'}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <Badge tone={tone} Icon={Icon}>{a.type}</Badge>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-bold text-slate-800">
                          {a.flowRate.toFixed(1)}
                          <span className="ml-1 text-xs font-semibold text-slate-500">LPM</span>
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-semibold text-slate-700">{a.deviceName}</p>
                        <code className="font-mono text-[11px] text-slate-500">{a.deviceId}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </>
  );
}

/* ============================================================
   SHARED BADGE — used here and by Dashboard
   ============================================================ */

const TONE_STYLES = {
  red:    'bg-red-100 text-red-700',
  amber:  'bg-amber-100 text-amber-700',
  violet: 'bg-violet-100 text-violet-700',
  aqua:   'bg-aqua-100 text-aqua-700',
  slate:  'bg-slate-100 text-slate-600',
};

export function Badge({ tone = 'slate', Icon, children }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
        TONE_STYLES[tone] ?? TONE_STYLES.slate,
      ].join(' ')}
    >
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */

const STAT_TONES = {
  hydro:  'bg-hydro/10 text-hydro',
  red:    'bg-red-100 text-red-600',
  amber:  'bg-amber-100 text-amber-600',
  aqua:   'bg-aqua-100 text-aqua-700',
  violet: 'bg-violet-100 text-violet-600',
};

function StatCard({ label, value, Icon, tone = 'hydro' }) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">
            {value}
          </p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${STAT_TONES[tone]}`}>
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
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <FaMagnifyingGlass size={22} />
        </span>
        <h3 className="mt-4 text-base font-bold text-slate-800">No matching alerts</h3>
        <p className="mt-1 text-sm text-slate-500">Try a different search term or device filter.</p>
      </div>
    );
  }

  return (
    <div className="py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-mint-50 text-mint-600">
        <FaCircleCheck size={28} />
      </span>
      <h3 className="mt-5 text-lg font-bold text-slate-800">No alerts recorded</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        Your water monitoring system has not detected any anomalies.
        Keep it that way — no news is good news.
      </p>
    </div>
  );
}