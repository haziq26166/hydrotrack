import { GlassCard } from '@/components/ui/GlassCard';
import { StatusChip } from '@/components/ui/StatusChip';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { WaterFill } from '@/components/ui/WaterFill';
import {
  describeDevice, gaugeLevel, lastSeenLabel, WATER_TONE, FLOW_FULL_SCALE_LPM,
} from '@/lib/deviceInfo';

/**
 * The single "Live flow" card of the dashboard — the only place the
 * flow reading is shown, together with the animated water gauge.
 *
 *   device  one entry from useDeviceFleet().list
 */
export function LiveFlowCard({ device, className = '' }) {
  const info = describeDevice(device);
  const offline = device.status === 'offline';

  return (
    <GlassCard
      padded={false}
      className={[
        'flex flex-col overflow-hidden',
        device.status === 'leak' ? '!border-coral-300' : '',
        className,
      ].join(' ')}
    >
      {/* ---------- Header ---------- */}
      <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-4 py-3">
        <div className="min-w-0">
          <p className="kpi-label">Live flow</p>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-ink-900">{device.name}</h2>
          <code className="font-mono text-[11px] text-ink-500">{device.id}</code>
        </div>
        <StatusChip status={info.chip} label={info.label} className="shrink-0" />
      </div>

      {/* ---------- Reading + water gauge ---------- */}
      <div className="flex flex-1 items-stretch justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="flex items-baseline gap-1.5">
            <AnimatedNumber
              value={device.flow}
              decimals={1}
              duration={600}
              className={`text-5xl font-bold leading-none tracking-tight ${offline ? 'text-ink-300' : 'text-ink-900'}`}
            />
            <span className="text-sm font-medium text-ink-400">LPM</span>
          </p>
          <p className="mt-3 text-xs text-ink-500">{info.subtitle}</p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <WaterFill
            level={gaugeLevel(device)}
            tone={WATER_TONE[device.status]}
            className="min-h-[8.5rem] w-24 flex-1 rounded-md border border-ink-200 bg-ink-50"
          />
          <p className="text-[10px] text-ink-400">0 – {FLOW_FULL_SCALE_LPM} LPM</p>
        </div>
      </div>

      {/* ---------- Footer ---------- */}
      <div className="grid grid-cols-2 divide-x divide-ink-100 border-t border-ink-100 bg-ink-50/60 text-xs">
        <p className="px-4 py-2.5 text-ink-500">
          Peak{' '}
          <span className="font-semibold text-ink-800">{device.peak.toFixed(1)}</span>{' '}
          <span className="text-ink-400">LPM</span>
        </p>
        <p className="px-4 py-2.5 text-ink-500">
          Updated <span className="font-semibold text-ink-800">{lastSeenLabel(device)}</span>
        </p>
      </div>
    </GlassCard>
  );
}