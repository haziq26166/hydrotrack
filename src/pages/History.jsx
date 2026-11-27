import { useEffect, useMemo, useState } from 'react';
import {
  FaChartColumn, FaDroplet, FaChartSimple, FaArrowTrendUp,
} from 'react-icons/fa6';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { database, ref, onValue } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import { useDefaultDevice } from '@/hooks/useDefaultDevice';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatTile } from '@/components/ui/StatTile';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DeviceCombobox } from '@/components/devices/DeviceCombobox';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* Chart.js draws on <canvas>, so it can't inherit CSS — set the font here. */
ChartJS.defaults.font.family = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';

/* Palette (mirrors tailwind.config.js) */
const BAR       = '#92D6DC';   /* hydro-200 */
const BAR_HOVER = '#4DB9C3';   /* hydro-300 */
const BAR_NOW   = '#0A7F8B';   /* hydro-500 — current day / month */
const TICK      = '#8D9BAA';   /* ink-400 */
const GRID      = '#EBEFF3';   /* ink-100 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function History() {
  const { user } = useAuth();
  const { devices } = useDevices(user.uid);
  const { defaultId } = useDefaultDevice(user.uid);

  const [historyByDevice, setHistoryByDevice] = useState({});
  const [deviceFilter, setDeviceFilter]       = useState(null);   /* null = not chosen yet */
  const [viewMode, setViewMode]               = useState('daily');

  /* Opens on the default device; the user can switch to any device or "All devices". */
  const activeFilter =
    deviceFilter && (deviceFilter === 'ALL' || devices[deviceFilter])
      ? deviceFilter
      : defaultId && devices[defaultId]
        ? defaultId
        : 'ALL';

  useEffect(() => {
    const unsubs = [];
    Object.keys(devices).forEach((id) => {
      const unsub = onValue(
        ref(database, `users/${user.uid}/devices/${id}/history`),
        (snap) => {
          setHistoryByDevice((prev) => ({ ...prev, [id]: snap.val() || {} }));
        }
      );
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [devices, user.uid]);

  const { labels, values, stats, title, subtitle, nowIndex } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const ids = activeFilter === 'ALL' ? Object.keys(devices) : [activeFilter];

    const sumForDate = (dateStr) =>
      ids.reduce((s, id) =>
        s + Number(historyByDevice[id]?.[dateStr]?.total_volume || 0), 0);

    let labels = [], values = [], nowIndex = -1;

    if (viewMode === 'daily') {
      const days = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        labels.push(`${d}`);
        values.push(sumForDate(ds));
      }
      nowIndex = now.getDate() - 1;
    } else {
      for (let m = 0; m < 12; m++) {
        const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;
        let total = 0;
        ids.forEach((id) => {
          const hist = historyByDevice[id] || {};
          Object.keys(hist).forEach((k) => {
            if (k.startsWith(prefix)) total += Number(hist[k]?.total_volume || 0);
          });
        });
        labels.push(MONTHS[m]);
        values.push(total);
      }
      nowIndex = month;
    }

    const total = values.reduce((s, v) => s + v, 0);
    const activeCount = values.filter((v) => v > 0).length || 1;
    const avg  = total / activeCount;
    const peak = values.length ? Math.max(...values) : 0;

    const title = viewMode === 'daily'
      ? `${now.toLocaleString('default', { month: 'long' })} ${year}`
      : `Year ${year}`;
    const subtitle = viewMode === 'daily'
      ? 'Daily consumption breakdown'
      : 'Monthly consumption totals';

    return { labels, values, title, subtitle, nowIndex, stats: { total, avg, peak, activeCount } };
  }, [historyByDevice, devices, activeFilter, viewMode]);

  const hasAnyData = stats.total > 0;
  const unitLabel = viewMode === 'daily' ? 'day' : 'month';

  const scopeLabel =
    activeFilter === 'ALL' ? 'All devices' : devices[activeFilter]?.name || activeFilter;

  const chartData = {
    labels,
    datasets: [{
      label: 'Liters',
      data: values,
      backgroundColor: values.map((_, i) => (i === nowIndex ? BAR_NOW : BAR)),
      hoverBackgroundColor: values.map((_, i) => (i === nowIndex ? BAR_NOW : BAR_HOVER)),
      borderWidth: 0,
      borderRadius: 3,
      borderSkipped: false,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 28, 43, 0.95)',
        padding: 8,
        cornerRadius: 4,
        displayColors: false,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 12 },
        callbacks: {
          label: (c) => `${c.parsed.y.toFixed(1)} Liters`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: TICK, font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: GRID },
        ticks: { color: TICK, font: { size: 10 } },
        title: {
          display: true,
          text: 'Liters (L)',
          color: TICK,
          font: { size: 10, weight: '600' },
        },
      },
    },
  };

  return (
    <>
      <TopBar title="Usage History" icon={FaChartColumn} subtitle={`${title} · ${scopeLabel}`} />

      {/* ============================================================
          TOOLBAR — device search on top, time range one level below
          ============================================================ */}
      <div className="mb-3 space-y-2">
        <DeviceCombobox
          label="Search and filter by device"
          devices={devices}
          value={activeFilter}
          onChange={setDeviceFilter}
          allLabel="All devices"
        />

        <SegmentedControl
          label="Time range"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { id: 'daily',   label: 'Daily' },
            { id: 'monthly', label: 'Monthly' },
          ]}
        />
      </div>

      {/* ============================================================
          STAT ROW
          ============================================================ */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatTile
          Icon={FaDroplet}
          label="Total consumption"
          value={stats.total}
          decimals={1}
          unit="L"
          sub="Selected period"
        />
        <StatTile
          Icon={FaChartSimple}
          label={`Average per ${unitLabel}`}
          value={stats.avg}
          decimals={1}
          unit="L"
          sub={`Across ${stats.activeCount} active ${unitLabel}${stats.activeCount !== 1 ? 's' : ''}`}
        />
        <StatTile
          Icon={FaArrowTrendUp}
          label="Peak usage"
          value={stats.peak}
          decimals={1}
          unit="L"
          sub={`Highest single ${unitLabel}`}
        />
      </div>

      {/* ============================================================
          CHART
          ============================================================ */}
      <GlassCard padded="md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="section-title">{title}</h2>
            <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>
          </div>
          <span className="chip chip-info shrink-0">Liters (L)</span>
        </div>

        {!hasAnyData ? (
          <div className="rounded-md border border-dashed border-ink-200 bg-ink-50 py-12 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-ink-300 shadow-glass-sm">
              <FaChartColumn size={16} />
            </span>
            <p className="mt-2 text-[13px] font-semibold text-ink-800">No data for this period</p>
            <p className="mt-0.5 text-xs text-ink-500">
              Data will appear once the sensor starts reporting.
            </p>
          </div>
        ) : (
          <div className="h-64 sm:h-72" role="img" aria-label={`Bar chart of water usage in litres, ${viewMode}`}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}
      </GlassCard>
    </>
  );
}