import { useOutletContext } from 'react-router-dom';
import { FaTableCellsLarge, FaDroplet, FaPlus } from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';
import { useDeviceFleet } from '@/hooks/useDeviceFleet';
import { useUsageHistory } from '@/hooks/useUsageHistory';
import { useRecentAlerts } from '@/hooks/useRecentAlerts';
import { useAlertAcknowledge } from '@/hooks/useAlertAcknowledge';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Toast } from '@/components/ui/Toast';
import { LeakAlertBanner } from '@/components/dashboard/LeakAlertBanner';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { DeviceFleetSection } from '@/components/dashboard/DeviceFleetSection';
import { UsageTrendCard } from '@/components/dashboard/UsageTrendCard';
import { RecentAlertsCard } from '@/components/dashboard/RecentAlertsCard';
import { plural } from '@/lib/format';

/**
 * Dashboard — information hierarchy, top to bottom:
 *   1. Leak / status banner
 *   2. KPI strip (live flow · today · week · devices online)
 *   3. Devices (cards, or a compact list from 6 devices up)
 *   4. Usage trend + recent alerts (acknowledgeable)
 */
export default function Dashboard() {
  const { user } = useAuth();
  const { openAddDevice } = useOutletContext();

  const fleet  = useDeviceFleet(user.uid);
  const usage  = useUsageHistory(user.uid, fleet.list);
  const alerts = useRecentAlerts(user.uid, fleet.devices, 5);
  const ack    = useAlertAcknowledge(user.uid);

  const { summary } = fleet;

  const subtitle = fleet.loading
    ? 'Loading your devices…'
    : summary.total === 0
      ? 'Link a device to start monitoring'
      : `${plural(summary.total, 'device')} · ${summary.online} online`;

  return (
    <>
      <TopBar title="Dashboard" icon={FaTableCellsLarge} subtitle={subtitle} />

      {fleet.loading ? (
        <DashboardSkeleton />
      ) : summary.total === 0 ? (
        <EmptyState onAdd={openAddDevice} />
      ) : (
        <div className="space-y-6">
          <LeakAlertBanner summary={summary} />

          <KpiStrip summary={summary} usage={usage} />

          <DeviceFleetSection list={fleet.list} />

          <div className="grid gap-5 lg:grid-cols-5">
            <UsageTrendCard usage={usage} className="lg:col-span-3" />
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
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-20 w-full !rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-32 !rounded-3xl" />)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 !rounded-3xl" />)}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <GlassCard variant="strong" padded="lg" className="py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-hydro-gradient text-white shadow-brand">
        <FaDroplet size={26} />
      </span>
      <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink-900">No devices yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
        Link your first HydroTrack device to start monitoring water flow and receive leak alerts.
      </p>
      <div className="mt-6 flex justify-center">
        <GlassButton leftIcon={<FaPlus size={12} />} onClick={onAdd}>
          Add your first device
        </GlassButton>
      </div>
    </GlassCard>
  );
}