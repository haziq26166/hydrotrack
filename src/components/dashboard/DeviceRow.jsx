import { StatusChip, StatusDot } from '@/components/ui/StatusChip';
import { formatAgo } from '@/lib/format';
import { describeDevice } from './DeviceCard';

/* Column widths are shared with the header row in DeviceCollection so the
   desktop table lines up. */
export const COL = {
  status: 'w-36 shrink-0',
  flow:   'w-24 shrink-0',
  today:  'w-24 shrink-0',
  seen:   'hidden w-28 shrink-0 lg:block',
  actions:'w-44 shrink-0',
};

function lastSeen(d) {
  if (d.loading) return '…';
  if (d.isOnline) return 'Live';
  return d.secondsAgo !== null ? formatAgo(d.secondsAgo) : 'Never';
}

/**
 * Compact list row (used from 6 devices up, and always on phones then).
 * Renders a stacked layout below md and a table row from md up.
 */
export function DeviceRow({ device, isDefault = false, actions }) {
  const info = describeDevice(device);
  const offline = device.status === 'offline';

  return (
    <li className="px-4 py-3.5 transition-colors hover:bg-white/50 sm:px-5">
      {/* ---------- Mobile ---------- */}
      <div className="md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{device.name}</p>
            <code className="font-mono text-[11px] text-ink-500">{device.id}</code>
          </div>
          <StatusChip status={info.chip} label={info.label} className="shrink-0" />
        </div>

        <dl className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-ink-400">Flow</dt>
            <dd className={`font-bold tabular-nums ${offline ? 'text-ink-300' : 'text-ink-800'}`}>
              {device.flow.toFixed(1)} <span className="font-semibold text-ink-400">LPM</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-400">Today</dt>
            <dd className="font-bold tabular-nums text-ink-800">
              {device.usage.toFixed(1)} <span className="font-semibold text-ink-400">L</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-400">Updated</dt>
            <dd className="font-semibold text-ink-600">{lastSeen(device)}</dd>
          </div>
        </dl>

        {(actions || isDefault) && (
          <div className="mt-3 flex items-center justify-end gap-1.5">
            {isDefault && <span className="chip chip-info">Default</span>}
            {actions}
          </div>
        )}
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden items-center gap-4 md:flex">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StatusDot status={info.chip === 'info' ? 'info' : device.status} pulse={device.status === 'leak'} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{device.name}</p>
            <code className="font-mono text-[11px] text-ink-500">{device.id}</code>
          </div>
        </div>

        <div className={COL.status}>
          <StatusChip status={info.chip} label={info.label} />
        </div>

        <p className={`${COL.flow} text-sm font-bold tabular-nums ${offline ? 'text-ink-300' : 'text-ink-800'}`}>
          {device.flow.toFixed(1)} <span className="text-xs font-semibold text-ink-400">LPM</span>
        </p>

        <p className={`${COL.today} text-sm font-bold tabular-nums text-ink-800`}>
          {device.usage.toFixed(1)} <span className="text-xs font-semibold text-ink-400">L</span>
        </p>

        <p className={`${COL.seen} text-xs font-semibold text-ink-500`}>{lastSeen(device)}</p>

        {actions !== undefined && (
          <div className={`${COL.actions} flex items-center justify-end gap-1.5`}>
            {isDefault && <span className="chip chip-info">Default</span>}
            {actions}
          </div>
        )}
      </div>
    </li>
  );
}