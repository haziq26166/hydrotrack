import { useEffect, useMemo, useState } from 'react';
import {
  FaBell, FaMagnifyingGlass, FaTriangleExclamation,
  FaClock, FaMoon, FaCircleCheck, FaCircleExclamation, FaWater, FaChevronDown,
  FaCheck, FaCheckDouble, FaRotateLeft,
} from 'react-icons/fa6';
import { database, ref, onValue } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import { useAlertAcknowledge } from '@/hooks/useAlertAcknowledge';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Toast } from '@/components/ui/Toast';
import { DeviceCombobox } from '@/components/devices/DeviceCombobox';

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

/* "12 Mar 2026, 14:05" — empty string when there is no timestamp. */
function formatAckTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

export default function Alerts() {
  const { user } = useAuth();
  const { devices } = useDevices(user.uid);
  const ack = useAlertAcknowledge(user.uid);

  const [alertsByDevice, setAlertsByDevice] = useState({});
  const [deviceFilter, setDeviceFilter]     = useState('ALL');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [typeFilter, setTypeFilter]         = useState('all');
  const [sortBy, setSortBy]                 = useState('newest');
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
            acknowledged:   val.acknowledged === true,
            acknowledgedAt: Number(val.acknowledged_at || 0),
          }));
          setAlertsByDevice((prev) => ({ ...prev, [id]: items }));
        }
      );
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [devices, user.uid]);

  /* Back to the first page whenever the result set changes shape */
  useEffect(() => { setLimit(PAGE_SIZE); }, [deviceFilter, statusFilter, typeFilter, sortBy]);

  /* A device that was unlinked can no longer be the active filter */
  const activeDevice = deviceFilter === 'ALL' || devices[deviceFilter] ? deviceFilter : 'ALL';

  const deviceFiltered = useMemo(() => {
    const flat = Object.entries(alertsByDevice)
      .filter(([id]) => devices[id])
      .flatMap(([, items]) => items);
    return activeDevice === 'ALL'
      ? flat
      : flat.filter((a) => a.deviceId === activeDevice);
  }, [alertsByDevice, activeDevice, devices]);

  const visible = useMemo(() => {
    const filtered = deviceFiltered.filter((a) => {
      if (statusFilter === 'unacknowledged' && a.acknowledged)  return false;
      if (statusFilter === 'acknowledged'   && !a.acknowledged) return false;
      if (typeFilter !== 'all' && !a.type.toLowerCase().includes(typeFilter)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'oldest')   return a.timestamp - b.timestamp;
      if (sortBy === 'severity') return b.flowRate - a.flowRate;
      return b.timestamp - a.timestamp;
    });
    return filtered;
  }, [deviceFiltered, statusFilter, typeFilter, sortBy]);

  const stats = useMemo(() => ({
    total:          deviceFiltered.length,
    unacknowledged: deviceFiltered.filter((a) => !a.acknowledged).length,
  }), [deviceFiltered]);

  const shown = visible.slice(0, limit);

  /* Everything in the current filtered view that still needs acknowledging
     (not just the rows on the current page). */
  const pendingInView = useMemo(() => visible.filter((a) => !a.acknowledged), [visible]);

  return (
    <>
      <TopBar
        title="Alerts"
        icon={FaBell}
        subtitle={
          stats.unacknowledged > 0
            ? `${stats.total} ${stats.total === 1 ? 'event' : 'events'} · ${stats.unacknowledged} unacknowledged`
            : `${stats.total} ${stats.total === 1 ? 'event' : 'events'} recorded`
        }
      />

      {/* ============================================================
          TOOLBAR — device search on top, filters one level below
          ============================================================ */}
      <div className="mb-3 space-y-2">
        <DeviceCombobox
          label="Search and filter by device"
          devices={devices}
          value={activeDevice}
          onChange={setDeviceFilter}
          allLabel="All devices"
        />

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Filter alerts by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              ['all', 'All statuses'],
              ['unacknowledged', 'Unacknowledged'],
              ['acknowledged', 'Acknowledged'],
            ]}
          />
          <FilterSelect
            label="Filter alerts by type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              ['all', 'All types'],
              ['high', 'High flow'],
              ['continuous', 'Continuous flow'],
              ['off-hours', 'Off-hours flow'],
              ['hammer', 'Water hammer'],
            ]}
          />
          <FilterSelect
            label="Sort alerts"
            value={sortBy}
            onChange={setSortBy}
            options={[
              ['newest', 'Newest first'],
              ['oldest', 'Oldest first'],
              ['severity', 'Severity (high first)'],
            ]}
          />

          <GlassButton
            variant="primary"
            className="sm:ml-auto"
            leftIcon={<FaCheckDouble size={11} />}
            loading={ack.bulkPending}
            disabled={pendingInView.length === 0}
            onClick={() => ack.acknowledgeMany(pendingInView)}
          >
            {pendingInView.length > 0 ? `Acknowledge all (${pendingInView.length})` : 'Acknowledge all'}
          </GlassButton>
        </div>
      </div>

      {/* ============================================================
          RESULTS
          ============================================================ */}
      <GlassCard padded={false} className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState hasAlerts={deviceFiltered.length > 0} />
        ) : (
          <>
            {/* ---- Phones: stacked rows ---- */}
            <ul className="divide-y divide-ink-100 md:hidden">
              {shown.map((a) => {
                const tone = getAlertTone(a.type);
                const Icon = getAlertIcon(a.type);
                return (
                  <li
                    key={`${a.deviceId}:${a.id}`}
                    className={`px-3 py-3 ${a.acknowledged ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Badge tone={tone} Icon={Icon}>{a.type}</Badge>
                      <p className="shrink-0 text-right font-mono text-[11px] leading-tight text-ink-500">
                        {a.date || '—'}
                        <br />
                        {a.time || '—'}
                      </p>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink-800">{a.deviceName}</p>
                        <code className="font-mono text-[11px] text-ink-500">{a.deviceId}</code>
                      </div>
                      <p className="shrink-0 text-base font-bold tabular-nums text-ink-900">
                        {a.flowRate.toFixed(1)}
                        <span className="ml-1 text-xs font-medium text-ink-400">LPM</span>
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <AckStatus alert={a} />
                      <AckAction
                        alert={a}
                        pending={ack.isPending(a)}
                        onAcknowledge={ack.acknowledge}
                        onUndo={ack.unacknowledge}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* ---- Tablet / desktop: table ---- */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[13px]">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    {['When', 'Alert', 'Flow rate', 'Device', 'Status'].map((h) => (
                      <th key={h} scope="col" className="th">{h}</th>
                    ))}
                    <th scope="col" className="th text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {shown.map((a) => {
                    const tone = getAlertTone(a.type);
                    const Icon = getAlertIcon(a.type);
                    return (
                      <tr
                        key={`${a.deviceId}:${a.id}`}
                        className={`transition-colors hover:bg-ink-50 ${a.acknowledged ? 'opacity-70' : ''}`}
                      >
                        <td className="px-3 py-2 align-middle">
                          <p className="font-mono text-xs font-semibold text-ink-700">{a.date || '—'}</p>
                          <p className="font-mono text-[11px] text-ink-400">{a.time || '—'}</p>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <Badge tone={tone} Icon={Icon}>{a.type}</Badge>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <p className="font-semibold tabular-nums text-ink-800">
                            {a.flowRate.toFixed(1)}
                            <span className="ml-1 text-xs font-medium text-ink-400">LPM</span>
                          </p>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <p className="font-semibold text-ink-700">{a.deviceName}</p>
                          <code className="font-mono text-[11px] text-ink-500">{a.deviceId}</code>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <AckStatus alert={a} />
                        </td>
                        <td className="px-3 py-2 text-right align-middle">
                          <AckAction
                            alert={a}
                            pending={ack.isPending(a)}
                            onAcknowledge={ack.acknowledge}
                            onUndo={ack.unacknowledge}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visible.length > shown.length && (
              <div className="flex flex-col items-center gap-2 border-t border-ink-200 bg-ink-50 px-4 py-3">
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

      <Toast toast={ack.toast} onClose={ack.clearToast} />
    </>
  );
}

/* ============================================================
   FILTER SELECT — compact native select
   ============================================================ */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="hydro-input w-auto cursor-pointer appearance-none !pr-8"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>{text}</option>
        ))}
      </select>
      <FaChevronDown
        size={10}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}

/* ============================================================
   ACKNOWLEDGEMENT UI
   ============================================================ */

/* Status pill (+ when it was acknowledged). */
function AckStatus({ alert }) {
  if (alert.acknowledged) {
    const when = formatAckTime(alert.acknowledgedAt);
    return (
      <div className="min-w-0">
        <span className="chip chip-ok">
          <FaCheck size={9} />
          Acknowledged
        </span>
        {when && <p className="mt-0.5 font-mono text-[11px] text-ink-400">{when}</p>}
      </div>
    );
  }

  return (
    <span className="chip chip-warn">
      <FaCircleExclamation size={9} />
      Unacknowledged
    </span>
  );
}

/* Acknowledge button, or an Undo button once acknowledged. */
function AckAction({ alert, pending, onAcknowledge, onUndo }) {
  if (alert.acknowledged) {
    return (
      <GlassButton
        variant="ghost"
        size="sm"
        loading={pending}
        leftIcon={<FaRotateLeft size={10} />}
        onClick={() => onUndo(alert)}
        aria-label={`Mark ${alert.type} on ${alert.deviceName} as unacknowledged`}
      >
        Undo
      </GlassButton>
    );
  }

  return (
    <GlassButton
      variant="primary"
      size="sm"
      loading={pending}
      leftIcon={<FaCheck size={10} />}
      onClick={() => onAcknowledge(alert)}
      aria-label={`Acknowledge ${alert.type} on ${alert.deviceName}`}
    >
      Acknowledge
    </GlassButton>
  );
}

/* ============================================================
   SHARED BADGE — alert-type pill
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
   EMPTY STATE
   ============================================================ */

function EmptyState({ hasAlerts }) {
  if (hasAlerts) {
    return (
      <div className="py-12 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-50 text-ink-400">
          <FaMagnifyingGlass size={16} />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-ink-900">No matching alerts</h3>
        <p className="mt-1 text-xs text-ink-500">Try a different device, status or type filter.</p>
      </div>
    );
  }

  return (
    <div className="py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sea-50 text-sea-500">
        <FaCircleCheck size={20} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink-900">No alerts recorded</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-500">
        Your water monitoring system has not detected any anomalies.
      </p>
    </div>
  );
}