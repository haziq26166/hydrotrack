import { GlassCard } from '@/components/ui/GlassCard';
import { StatusChip } from '@/components/ui/StatusChip';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { WaterFill } from '@/components/ui/WaterFill';
import { formatAgo } from '@/lib/format';

const FLOW_FULL_SCALE_LPM = 40;
const MIN_ONLINE_LEVEL = 12;       /* decorative floor so a calm device still shows water */

const CARD_VARIANT = { ok: 'default', warn: 'warn', leak: 'leak', offline: 'offline' };
const WATER_TONE   = { ok: 'water',   warn: 'warn', leak: 'leak', offline: 'offline' };

/** Label + subtitle for a device, shared by the card and the list row. */
export function describeDevice(d) {
  if (d.loading) {
    return { chip: 'info', label: 'Connecting', subtitle: 'Waiting for first reading…' };
  }
  switch (d.status) {
    case 'leak':
      return { chip: 'leak', label: 'Leak detected', subtitle: 'Continuous flow detected' };
    case 'warn':
      return { chip: 'warn', label: 'Unusual flow', subtitle: 'Flow pattern needs a look' };
    case 'offline':
      return {
        chip: 'offline',
        label: 'Offline',
        subtitle: d.secondsAgo !== null ? `Last seen ${formatAgo(d.secondsAgo)}` : 'Never connected',
      };
    default:
      return d.flow > 0
        ? { chip: 'ok', label: 'Flowing', subtitle: 'Live · water is running' }
        : { chip: 'ok', label: 'Idle', subtitle: 'Live · no flow' };
  }
}

/**
 * One device as a glass card with an animated water gauge.
 *
 *   device    entry from useDeviceFleet().list
 *   isDefault shows a "Default" tag (Devices page)
 *   actions   optional node rendered at the right of the footer
 */
export function DeviceCard({ device, isDefault = false, actions, className = '' }) {
  const info = describeDevice(device);
  const offline = device.status === 'offline';

  const level = offline
    ? 0
    : Math.max(MIN_ONLINE_LEVEL, Math.min(100, (device.flow / FLOW_FULL_SCALE_LPM) * 100));

  return (
    <GlassCard
      variant={CARD_VARIANT[device.status]}
      padded={false}
      className={[
        'flex h-full flex-col overflow-hidden',
        device.status === 'leak' ? 'animate-pulse-alert' : '',
        className,
      ].join(' ')}
    >
      {/* ---------- Header ---------- */}
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold tracking-tight text-ink-900">{device.name}</h3>
          <code className="mt-0.5 block font-mono text-[11px] text-ink-500">{device.id}</code>
        </div>
        <StatusChip status={info.chip} label={info.label} className="shrink-0" />
      </div>

      {/* ---------- Flow + gauge ---------- */}
      <div className="flex items-end justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="kpi-label">Current flow</p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <AnimatedNumber
              value={device.flow}
              decimals={1}
              duration={600}
              className={`text-4xl font-extrabold leading-none tracking-tight ${offline ? 'text-ink-300' : 'text-ink-900'}`}
            />
            <span className="kpi-unit">LPM</span>
          </p>
          <p className="mt-2.5 text-xs text-ink-500">{info.subtitle}</p>
        </div>

        <div aria-hidden="true" className="shrink-0">
          <WaterFill
            level={level}
            tone={WATER_TONE[device.status]}
            className="h-24 w-16 rounded-2xl border border-white/80 bg-white/50 shadow-glass-sm"
          />
        </div>
      </div>

      {/* ---------- Footer ---------- */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/60 bg-white/30 px-5 py-3">
        <p className="text-xs text-ink-500">
          Today{' '}
          <AnimatedNumber value={device.usage} decimals={1} className="font-bold text-ink-800" />{' '}
          <span className="font-semibold text-ink-400">L</span>
        </p>

        <div className="flex items-center gap-1.5">
          {isDefault && <span className="chip chip-info">Default</span>}
          {actions ?? (
            <p className="text-xs text-ink-500">
              Peak <span className="font-bold text-ink-800">{device.peak.toFixed(1)}</span>{' '}
              <span className="font-semibold text-ink-400">LPM</span>
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}