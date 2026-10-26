// File: src/components/dashboard/KpiStrip.jsx
import {
  FaGaugeHigh, FaDroplet, FaCalendarWeek, FaWifi,
} from 'react-icons/fa6';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { StatusDot } from '@/components/ui/StatusChip';

function Tile({ Icon, label, children, footer, className = '' }) {
  return (
    <GlassCard padded="md" className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hydro-50 text-hydro">
          <Icon size={14} />
        </span>
        <p className="kpi-label truncate">{label}</p>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">{children}</div>

      {footer && <div className="mt-2 min-h-[1.25rem] text-xs text-ink-500">{footer}</div>}
    </GlassCard>
  );
}

const VALUE = 'kpi-value !text-2xl sm:!text-3xl';

/** 7 tiny bars — decorative preview of the week */
function Spark({ days }) {
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div className="ml-auto flex h-8 items-end gap-0.5" aria-hidden="true">
      {days.map((d) => (
        <span
          key={d.key}
          className={`w-1.5 rounded-sm ${d.isToday ? 'bg-hydro' : 'bg-hydro-200'}`}
          style={{ height: `${Math.max(12, (d.total / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Top-of-dashboard KPI strip: live flow · today · this week · devices online.
 *
 *   summary  from useDeviceFleet()
 *   usage    from useUsageHistory()
 */
export function KpiStrip({ summary, usage }) {
  const { totalFlow, totalUsage, online, total, leakDevices, warnDevices, offline } = summary;

  const issues = [];
  if (leakDevices.length) issues.push({ status: 'leak', text: `${leakDevices.length} leak` });
  if (warnDevices.length) issues.push({ status: 'warn', text: `${warnDevices.length} unusual` });
  if (offline) issues.push({ status: 'offline', text: `${offline} offline` });

  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Tile
        Icon={FaGaugeHigh}
        label="Live flow"
        footer={online > 0 ? `${online} ${online === 1 ? 'device' : 'devices'} streaming` : 'No device streaming'}
      >
        <AnimatedNumber value={totalFlow} decimals={1} duration={600} className={VALUE} />
        <span className="kpi-unit">LPM</span>
      </Tile>

      <Tile Icon={FaDroplet} label="Today's usage" footer="Since midnight">
        <AnimatedNumber value={totalUsage} decimals={1} className={VALUE} />
        <span className="kpi-unit">L</span>
      </Tile>

      <Tile
        Icon={FaCalendarWeek}
        label="This week"
        footer={usage.ready ? `Avg ${Math.round(usage.avgPerDay).toLocaleString()} L / day` : 'Loading…'}
      >
        <AnimatedNumber value={usage.weekTotal} decimals={0} className={VALUE} />
        <span className="kpi-unit">L</span>
        <Spark days={usage.days} />
      </Tile>

      <Tile
        Icon={FaWifi}
        label="Devices online"
        footer={
          issues.length === 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <StatusDot status="ok" /> All systems normal
            </span>
          ) : (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {issues.map((i) => (
                <span key={i.status} className="inline-flex items-center gap-1.5">
                  <StatusDot status={i.status} /> {i.text}
                </span>
              ))}
            </span>
          )
        }
      >
        <AnimatedNumber value={online} className={VALUE} />
        <span className="kpi-unit">/ {total}</span>
      </Tile>
    </section>
  );
}