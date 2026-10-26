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
import { DeviceSelect } from '@/components/devices/DeviceSelect';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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

  const { labels, values, stats, title, subtitle } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const ids = deviceFilter === 'ALL' ? Object.keys(devices) : [deviceFilter];

    const sumForDate = (dateStr) =>
      ids.reduce((s, id) =>
        s + Number(historyByDevice[id]?.[dateStr]?.total_volume || 0), 0);

    let labels = [], values = [];

    if (viewMode === 'daily') {
      const days = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        labels.push(`${d}`);
        values.push(sumForDate(ds));
      }
    } else {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let m = 0; m < 12; m++) {
        const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;
        let total = 0;
        ids.forEach((id) => {
          const hist = historyByDevice[id] || {};
          Object.keys(hist).forEach((k) => {
            if (k.startsWith(prefix)) total += Number(hist[k]?.total_volume || 0);
          });
        });
        labels.push(monthNames[m]);
        values.push(total);
      }
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

    return { labels, values, title, subtitle, stats: { total, avg, peak, activeCount } };
  }, [historyByDevice, devices, deviceFilter, viewMode]);

  const hasAnyData = stats.total > 0;

  const chartData = {
    labels,
    datasets: [{
      label: 'Liters',
      data: values,
      backgroundColor: 'rgba(11, 61, 145, 0.65)',
      borderColor: 'rgba(11, 61, 145, 1)',
      borderWidth: 1,
      borderRadius: 6,
      hoverBackgroundColor: 'rgba(11, 61, 145, 1)',
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 12 },
        callbacks: {
          label: (c) => `  ${c.parsed.y.toFixed(1)} Liters`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94A3B8', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: { color: '#94A3B8', font: { size: 11 } },
        title: {
          display: true,
          text: 'Liters (L)',
          color: '#94A3B8',
          font: { size: 11, weight: '600' },
        },
      },
    },
  };

  return (
    <>
      <TopBar title="Usage History" icon={FaChartColumn} />

      {/* ============================================================
          TOOLBAR
          ============================================================ */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <DeviceSelect
            devices={devices}
            value={deviceFilter}
            onChange={setDeviceFilter}
          />
        </div>

        <div className="ml-auto flex rounded-xl border border-slate-200 bg-white p-1 shadow-glass">
          {['daily', 'monthly'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={[
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                viewMode === mode
                  ? 'bg-hydro text-white shadow-hydro'
                  : 'text-slate-500 hover:text-hydro',
              ].join(' ')}
            >
              {mode === 'daily' ? 'Daily' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          STAT ROW
          ============================================================ */}
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Consumption"
          value={stats.total.toFixed(1)}
          unit="L"
          sub="Selected period"
          Icon={FaDroplet}
          tone="hydro"
        />
        <StatCard
          label="Daily Average"
          value={stats.avg.toFixed(1)}
          unit="L"
          sub={`Across ${stats.activeCount} active day${stats.activeCount !== 1 ? 's' : ''}`}
          Icon={FaChartSimple}
          tone="aqua"
        />
        <StatCard
          label="Peak Usage"
          value={stats.peak.toFixed(1)}
          unit="L"
          sub="Highest single period"
          Icon={FaArrowTrendUp}
          tone="amber"
        />
      </div>

      {/* ============================================================
          CHART
          ============================================================ */}
      <GlassCard>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
          <span className="shrink-0 rounded-full bg-hydro-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-hydro-700">
            Liters (L)
          </span>
        </div>

        {!hasAnyData ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm">
              <FaChartColumn size={22} />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No data for this period
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Data will appear once the sensor starts reporting.
            </p>
          </div>
        ) : (
          <div className="h-80">
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

function StatCard({ label, value, unit, sub, Icon, tone = 'hydro' }) {
  const tones = {
    hydro: 'from-hydro-400 to-hydro shadow-hydro',
    aqua:  'from-aqua-400 to-aqua-600 shadow-aqua-500/30',
    amber: 'from-amber-400 to-amber-500 shadow-amber-500/30',
  };

  return (
    <GlassCard className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-hydro-300/20 blur-3xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-slate-800">
              {value}
            </span>
            <span className="text-sm font-bold text-hydro-600">{unit}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        <span
          className={[
            'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white',
            tones[tone],
          ].join(' ')}
        >
          <Icon size={16} />
        </span>
      </div>
    </GlassCard>
  );
}