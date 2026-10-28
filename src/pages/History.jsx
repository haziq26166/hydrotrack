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
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DeviceSelect } from '@/components/devices/DeviceSelect';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* Chart.js draws on <canvas>, so it can't inherit CSS — set the font here. */
ChartJS.defaults.font.family = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';

/* Palette (mirrors tailwind.config.js) */
const BAR      = 'rgba(10, 127, 139, 0.72)';   /* hydro-500 */
const BAR_HOVER = '#0A7F8B';
const BAR_NOW  = '#22B8CF';                     /* aqua-500 — current day / month */
const TICK     = '#8CA2B8';                     /* ink-400 */
const GRID     = 'rgba(181, 196, 211, 0.35)';   /* ink-300 @ 35% */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function History() {
  const { user } = useAuth();
  const { devices } = useDevices(user.uid);

  const [historyByDevice, setHistoryByDevice] = useState({});
  const [deviceFilter, setDeviceFilter]       = useState('ALL');
  const [viewMode, setViewMode]               = useState('daily');

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
    const ids = deviceFilter === 'ALL' ? Object.keys(devices) : [deviceFilter];

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
  }, [historyByDevice, devices, deviceFilter, viewMode]);

  const hasAnyData = stats.total > 0;
  const unitLabel = viewMode === 'daily' ? 'day' : 'month';

  const chartData = {
    labels,
    datasets: [{
      label: 'Liters',
      data: values,
      backgroundColor: values.map((_, i) => (i === nowIndex ? BAR_NOW : BAR)),
      hoverBackgroundColor: values.map((_, i) => (i === nowIndex ? BAR_NOW : BAR_HOVER)),
      borderWidth: 0,
      borderRadius: 8,
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
        backgroundColor: 'rgba(11, 42, 74, 0.95)',
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        titleFont: { size: 12, weight: '700' },
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
        ticks: { color: TICK, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: GRID },
        ticks: { color: TICK, font: { size: 11 } },
        title: {
          display: true,
          text: 'Liters (L)',
          color: TICK,
          font: { size: 11, weight: '600' },
        },
      },
    },
  };

  return (
    <>
      <TopBar title="Usage History" icon={FaChartColumn} subtitle={`${title} · ${subtitle}`} />

      {/* ============================================================
          TOOLBAR
          ============================================================ */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <DeviceSelect
            devices={devices}
            value={deviceFilter}
            onChange={setDeviceFilter}
          />
        </div>

        <SegmentedControl
          className="ml-auto"
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
      <div className="mb-5 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard
          label="Total consumption"
          value={stats.total}
          unit="L"
          sub="Selected period"
          Icon={FaDroplet}
          tone="hydro"
        />
        <StatCard
          label={`Average per ${unitLabel}`}
          value={stats.avg}
          unit="L"
          sub={`Across ${stats.activeCount} active ${unitLabel}${stats.activeCount !== 1 ? 's' : ''}`}
          Icon={FaChartSimple}
          tone="aqua"
        />
        <StatCard
          label="Peak usage"
          value={stats.peak}
          unit="L"
          sub={`Highest single ${unitLabel}`}
          Icon={FaArrowTrendUp}
          tone="sand"
        />
      </div>

      {/* ============================================================
          CHART
          ============================================================ */}
      <GlassCard padded="md" className="sm:!p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="section-title">{title}</h2>
            <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>
          </div>
          <span className="chip chip-info shrink-0">Liters (L)</span>
        </div>

        {!hasAnyData ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white/30 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-ink-300 shadow-glass-sm">
              <FaChartColumn size={20} />
            </span>
            <p className="mt-3 text-sm font-bold text-ink-800">No data for this period</p>
            <p className="mt-1 text-xs text-ink-500">
              Data will appear once the sensor starts reporting.
            </p>
          </div>
        ) : (
          <div className="h-72 sm:h-80" role="img" aria-label={`Bar chart of water usage in litres, ${viewMode}`}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}
      </GlassCard>
    </>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */

const TONES = {
  hydro: 'bg-hydro-50 text-hydro',
  aqua:  'bg-aqua-100 text-aqua-700',
  sand:  'bg-sand-100 text-sand-700',
};

function StatCard({ label, value, unit, sub, Icon, tone = 'hydro' }) {
  return (
    <GlassCard padded="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kpi-label truncate">{label}</p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <AnimatedNumber value={value} decimals={1} className="text-3xl font-extrabold tracking-tight text-ink-900" />
            <span className="kpi-unit">{unit}</span>
          </p>
          <p className="mt-1.5 text-xs text-ink-500">{sub}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TONES[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
    </GlassCard>
  );
}