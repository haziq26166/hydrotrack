import { StatusChip, StatusDot } from '@/components/ui/StatusChip';
import { describeDevice, lastSeenLabel } from '@/lib/deviceInfo';

/**
 * Dense, row-per-device monitoring table (cards are no longer used).
 * Desktop/tablet: a real table. Phones: a compact two-line list.
 *
 *   devices        the (already filtered + paged) entries from useDeviceFleet().list
 *   defaultId      id of the default device (gets a "Default" tag)
 *   renderActions  (device) => node — per-row actions
 */
export function DeviceTable({ devices, defaultId = null, renderActions }) {
  const hasActions = typeof renderActions === 'function';

  return (
    <>
      {/* ---------------- Tablet / desktop ---------------- */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th scope="col" className="th w-36">Status</th>
              <th scope="col" className="th">Device</th>
              <th scope="col" className="th">ID</th>
              <th scope="col" className="th w-28 text-right">Flow (LPM)</th>
              <th scope="col" className="th w-28 text-right">Today (L)</th>
              <th scope="col" className="th w-28">Last seen</th>
              {hasActions && (
                <th scope="col" className="th text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-ink-100">
            {devices.map((d) => {
              const info = describeDevice(d);
              const offline = d.status === 'offline';

              return (
                <tr
                  key={d.id}
                  className={[
                    'h-11 transition-colors hover:bg-ink-50',
                    d.status === 'leak' ? 'bg-coral-50/60' : '',
                    d.status === 'warn' ? 'bg-sand-50/60' : '',
                  ].join(' ')}
                >
                  <td className="px-3">
                    <StatusChip status={info.chip} label={info.label} />
                  </td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <span className="max-w-[16rem] truncate font-semibold text-ink-900">{d.name}</span>
                      {d.id === defaultId && <span className="chip chip-info">Default</span>}
                    </div>
                  </td>
                  <td className="px-3">
                    <code className="font-mono text-xs text-ink-500">{d.id}</code>
                  </td>
                  <td className={`px-3 text-right font-semibold tabular-nums ${offline ? 'text-ink-300' : 'text-ink-800'}`}>
                    {d.flow.toFixed(1)}
                  </td>
                  <td className="px-3 text-right font-semibold tabular-nums text-ink-800">
                    {d.usage.toFixed(1)}
                  </td>
                  <td className="px-3 text-xs font-medium text-ink-500">{lastSeenLabel(d)}</td>
                  {hasActions && (
                    <td className="px-3">
                      <div className="flex items-center justify-end gap-1">{renderActions(d)}</div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------------- Phones ---------------- */}
      <ul className="divide-y divide-ink-100 md:hidden">
        {devices.map((d) => {
          const info = describeDevice(d);
          const offline = d.status === 'offline';

          return (
            <li
              key={d.id}
              className={[
                'px-3 py-2.5',
                d.status === 'leak' ? 'bg-coral-50/60' : '',
                d.status === 'warn' ? 'bg-sand-50/60' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-1.5">
                    <StatusDot status={info.chip === 'info' ? 'info' : d.status} pulse={d.status === 'leak'} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink-900">
                      {d.name}
                      {d.id === defaultId && <span className="chip chip-info ml-2">Default</span>}
                    </p>
                    <code className="font-mono text-[11px] text-ink-500">{d.id}</code>
                  </div>
                </div>
                <StatusChip status={info.chip} label={info.label} className="shrink-0" />
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-2 pl-4 text-xs">
                <p className="text-ink-500">
                  <span className={`font-semibold tabular-nums ${offline ? 'text-ink-300' : 'text-ink-800'}`}>
                    {d.flow.toFixed(1)}
                  </span>{' '}
                  LPM ·{' '}
                  <span className="font-semibold tabular-nums text-ink-800">{d.usage.toFixed(1)}</span> L ·{' '}
                  {lastSeenLabel(d)}
                </p>
                {hasActions && <div className="flex items-center gap-1">{renderActions(d)}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}