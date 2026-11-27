import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  FaTableCellsLarge, FaDroplet, FaPlus, FaCalendarWeek,
  FaWifi, FaGaugeHigh, FaArrowRight, FaTriangleExclamation, FaCircleInfo,
} from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';
import { useDeviceFleet } from '@/hooks/useDeviceFleet';
import { useDefaultDevice } from '@/hooks/useDefaultDevice';
import { useUsageHistory } from '@/hooks/useUsageHistory';
import { useRecentAlerts } from '@/hooks/useRecentAlerts';
import { useAlertAcknowledge } from '@/hooks/useAlertAcknowledge';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { StatTile } from '@/components/ui/StatTile';
import { StatusChip } from '@/components/ui/StatusChip';
import { Toast } from '@/components/ui/Toast';
import { DeviceCombobox } from '@/components/devices/DeviceCombobox';
import { LeakAlertBanner } from '@/components/dashboard/LeakAlertBanner';
import { LiveFlowCard } from '@/components/dashboard/LiveFlowCard';
import { UsageTrendCard } from '@/components/dashboard/UsageTrendCard';
import { RecentAlertsCard } from '@/components/dashboard/RecentAlertsCard';
import { describeDevice, lastSeenLabel } from '@/lib/deviceInfo';
import { plural } from '@/lib/format';

/**
 * Dashboard — shows ONE device (the default device unless the user picks another):
 *   1. Status bar (only when the device has a problem)
 *   2. Live flow card (reading + water animation) next to 4 metric tiles
 *   3. 7-day usage trend + recent alerts for this device
 */
export default function Dashboard() {
  const { user } = useAuth();
  const { openAddDevice } = useOutletContext();

  const fleet = useDeviceFleet(user.uid);
  const { defaultId, loading: defaultLoading } = useDefaultDevice(user.uid);
  const ack = useAlertAcknowledge(user.uid);

  const [pickedId, setPickedId] = useState(null);

  /* ---- Which device are we showing? picked → default → first by name ---- */
  const byId = useMemo(
    () => Object.fromEntries(fleet.list.map((d) => [d.id, d])),
    [fleet.list],
  );
  const firstByName = useMemo(
    () => [...fleet.list].sort((a, b) => a.name.localeCompare(b.name))[0] || null,
    [fleet.list],
  );

  let selected = null;
  let usingFallback = false;
  if (pickedId && byId[pickedId]) selected = byId[pickedId];
  else if (defaultId && byId[defaultId]) selected = byId[defaultId];
  else if (firstByName) { selected = firstByName; usingFallback = true; }

  const selectedId   = selected?.id ?? null;
  const selectedName = selected?.name ?? '';

  /* ---- Data scoped to the selected device ---- */
  const usageList = useMemo(() => (selected ? [selected] : []), [selected]);
  const usage = useUsageHistory(user.uid, usageList);

  const alertDevices = useMemo(
    () => (selectedId ? { [selectedId]: { id: selectedId, name: selectedName } } : {}),
    [selectedId, selectedName],
  );
  const alerts = useRecentAlerts(user.uid, alertDevices, 5);

  const { summary } = fleet;

  /* Other devices that need attention (shown as one thin line, not cards) */
  const othersNeedingAttention = fleet.list.filter(
    (d) => d.id !== selectedId && (d.status === 'leak' || d.status === 'warn'),
  );

  const subtitle = fleet.loading
    ? 'Loading your devices…'
    : summary.total === 0
      ? 'Link a device to start monitoring'
      : `${plural(summary.total, 'device')} · ${summary.online} online`;

  const picker =
    summary.total > 1 ? (
      <div className="w-64 max-w-full">
        <DeviceCombobox
          label="Choose the device to display"
          devices={fleet.devices}
          value={selectedId}
          onChange={setPickedId}
        />
      </div>
    ) : null;

  return (
    <>
      <TopBar title="Dashboard" icon={FaTableCellsLarge} subtitle={subtitle} actions={picker} />

      {fleet.loading || (summary.total > 0 && !selected) ? (
        <DashboardSkeleton />
      ) : summary.total === 0 ? (
        <EmptyState onAdd={openAddDevice} />
      ) : (
        <div className="space-y-3">
          {usingFallback && !defaultLoading && (
            <p className="flex items-center gap-2 rounded-md border border-aqua-200 bg-aqua-50 px-3 py-2 text-xs text-aqua-900">
              <FaCircleInfo size={12} className="shrink-0 text-aqua-600" />
              <span>
                No default device is set, so <strong>{selectedName}</strong> is shown.{' '}
                <Link to="/devices" className="font-semibold underline underline-offset-2">
                  Set a default
                </Link>
              </span>
            </p>
          )}

          {othersNeedingAttention.length > 0 && (
            <Link
              to="/devices"
              className="flex items-center gap-2 rounded-md border border-sand-200 bg-sand-50 px-3 py-2 text-xs font-medium text-sand-800 transition-colors hover:bg-sand-100"
            >
              <FaTriangleExclamation size={12} className="shrink-0 text-sand-500" />
              <span className="flex-1">
                {plural(othersNeedingAttention.length, 'other device')}{' '}
                {othersNeedingAttention.length === 1 ? 'needs' : 'need'} attention
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                View <FaArrowRight size={9} />
              </span>
            </Link>
          )}

          <LeakAlertBanner device={selected} />

          {/* ---- Live flow (with water animation) + metric tiles ---- */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <LiveFlowCard device={selected} className="col-span-2 lg:row-span-2" />

            <StatTile
              Icon={FaDroplet}
              label="Today's usage"
              value={selected.usage}
              decimals={1}
              unit="L"
              sub="Since midnight"
            />
            <StatTile
              Icon={FaCalendarWeek}
              label="This week"
              value={usage.weekTotal}
              unit="L"
              sub={usage.ready ? `Avg ${Math.round(usage.avgPerDay).toLocaleString()} L / day` : 'Loading…'}
            />
            <StatTile
              Icon={FaWifi}
              label="Device status"
              sub={
                selected.loading
                  ? 'Waiting for first reading…'
                  : selected.isOnline
                    ? 'Reporting live'
                    : `Last seen ${lastSeenLabel(selected)}`
              }
            >
              <StatusChip
                status={describeDevice(selected).chip}
                label={describeDevice(selected).label}
              />
            </StatTile>
            <StatTile
              Icon={FaGaugeHigh}
              label="Peak flow"
              value={selected.peak}
              decimals={1}
              unit="LPM"
              sub="Highest recorded"
            />
          </div>

          {/* ---- Trend + alerts for this device ---- */}
          <div className="grid gap-3 lg:grid-cols-5">
            <UsageTrendCard usage={usage} deviceName={selectedName} className="lg:col-span-3" />
            <RecentAlertsCard
              alerts={alerts.alerts}
              ready={alerts.ready}
              onAcknowledge={ack.acknowledge}
              isPending={ack.isPending}
              className="lg:col-span-2"
            />
          </div>
        </div>
      )}

      <Toast toast={ack.toast} onClose={ack.clearToast} />
    </>
  );
}

/* ============================================================
   LOADING + EMPTY STATES
   ============================================================ */

function DashboardSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="skeleton col-span-2 h-60 lg:row-span-2" />
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="skeleton h-60 lg:col-span-3" />
        <div className="skeleton h-60 lg:col-span-2" />
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <GlassCard padded="lg" className="py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-hydro text-white">
        <FaDroplet size={20} />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink-900">No devices yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">
        Link your first HydroTrack device to start monitoring water flow and receive leak alerts.
      </p>
      <div className="mt-5 flex justify-center">
        <GlassButton leftIcon={<FaPlus size={11} />} onClick={onAdd}>
          Add your first device
        </GlassButton>
      </div>
    </GlassCard>
  );
}