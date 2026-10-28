import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaShieldHalved, FaTriangleExclamation, FaDroplet, FaPlugCircleXmark, FaXmark, FaArrowRight,
} from 'react-icons/fa6';
import { plural } from '@/lib/format';

/* Names of up to 3 devices, then "+N more" */
function nameList(devices) {
  const names = devices.slice(0, 3).map((d) => d.name);
  const extra = devices.length - names.length;
  return extra > 0 ? `${names.join(', ')} +${extra} more` : names.join(', ');
}

/**
 * Fleet-wide status banner — the first thing on the dashboard.
 *
 *   summary   from useDeviceFleet(): { total, online, offline, leakDevices,
 *             warnDevices, connecting }
 *
 * Priority: leak → anomaly → all offline → all clear.
 * Leak / anomaly banners can be dismissed (the banner simply hides — it never
 * claims "all clear" while a problem is still active). It comes back
 * automatically if a different set of devices starts reporting a problem.
 */
export function LeakAlertBanner({ summary }) {
  const { total, online, leakDevices, warnDevices, connecting } = summary;
  const [dismissedKey, setDismissedKey] = useState(null);

  if (total === 0 || (connecting && online === 0 && leakDevices.length === 0)) return null;

  /* ---------------- LEAK ---------------- */
  if (leakDevices.length > 0) {
    const key = `leak:${leakDevices.map((d) => d.id).sort().join(',')}`;
    if (dismissedKey === key) return null;

    const first = leakDevices[0];
    return (
      <Banner
        tone="leak"
        Icon={FaDroplet}
        title={
          leakDevices.length === 1
            ? `Leak detected on ${first.name}`
            : `Leaks detected on ${plural(leakDevices.length, 'device')}`
        }
        message={
          leakDevices.length === 1
            ? `Continuous flow of ${first.flow.toFixed(1)} LPM. Check the pipes and consider shutting off the water supply.`
            : `${nameList(leakDevices)}. Check the pipes and consider shutting off the water supply.`
        }
        onDismiss={() => setDismissedKey(key)}
        pulse
      />
    );
  }

  /* ---------------- ANOMALY ---------------- */
  if (warnDevices.length > 0) {
    const key = `warn:${warnDevices.map((d) => d.id).sort().join(',')}`;
    if (dismissedKey === key) return null;

    return (
      <Banner
        tone="warn"
        Icon={FaTriangleExclamation}
        title={
          warnDevices.length === 1
            ? `Unusual flow on ${warnDevices[0].name}`
            : `Unusual flow on ${plural(warnDevices.length, 'device')}`
        }
        message={`${nameList(warnDevices)}. Review the alert details to see what triggered it.`}
        onDismiss={() => setDismissedKey(key)}
      />
    );
  }

  /* ---------------- EVERYTHING OFFLINE ---------------- */
  if (online === 0) {
    return (
      <Banner
        tone="offline"
        Icon={FaPlugCircleXmark}
        title={total === 1 ? 'Your device is offline' : 'All devices are offline'}
        message="No live data is arriving. Check power and Wi-Fi on your HydroTrack hardware. Leaks can't be detected while offline."
        showAlertsLink={false}
      />
    );
  }

  return <AllClear summary={summary} />;
}

/* ------------------------------------------------------------ */

function AllClear({ summary }) {
  const { online, offline, total } = summary;
  return (
    <Banner
      tone="ok"
      Icon={FaShieldHalved}
      title="System protected"
      message={
        offline > 0
          ? `No leaks detected. ${online} of ${total} devices are reporting; ${plural(offline, 'device')} offline.`
          : total === 1
            ? 'No leaks detected. Your device is reporting normally.'
            : `No leaks detected. All ${total} devices are reporting normally.`
      }
      showAlertsLink={false}
    />
  );
}

const TONES = {
  leak: {
    shell: 'glass-leak',
    icon: 'bg-coral-500 text-white',
    title: 'text-coral-800',
    text: 'text-coral-700',
    link: 'text-coral-700 hover:bg-coral-100/80',
    role: 'alert',
  },
  warn: {
    shell: 'glass-warn',
    icon: 'bg-sand-500 text-white',
    title: 'text-sand-800',
    text: 'text-sand-700',
    link: 'text-sand-700 hover:bg-sand-100/80',
    role: 'status',
  },
  offline: {
    shell: 'glass-offline',
    icon: 'bg-fog-400 text-white',
    title: 'text-fog-800',
    text: 'text-fog-600',
    link: 'text-fog-700 hover:bg-fog-100',
    role: 'status',
  },
  ok: {
    shell: 'glass-ok',
    icon: 'bg-sea-500 text-white',
    title: 'text-sea-800',
    text: 'text-sea-700',
    link: 'text-sea-700 hover:bg-sea-100/80',
    role: 'status',
  },
};

function Banner({ tone, Icon, title, message, onDismiss, pulse = false, showAlertsLink = true }) {
  const t = TONES[tone];

  return (
    <div
      role={t.role}
      className={[
        'flex items-start gap-4 rounded-3xl p-4 sm:items-center sm:p-5 animate-fade-in',
        t.shell,
        pulse ? 'animate-pulse-alert' : '',
      ].join(' ')}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${t.icon}`}>
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <h2 className={`text-base font-bold tracking-tight ${t.title}`}>{title}</h2>
        <p className={`mt-0.5 text-sm leading-relaxed ${t.text}`}>{message}</p>

        {showAlertsLink && (
          <Link
            to="/alerts"
            className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-xs font-bold transition-colors ${t.link}`}
          >
            View alerts <FaArrowRight size={10} />
          </Link>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert banner"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30 ${t.text}`}
        >
          <FaXmark size={14} />
        </button>
      )}
    </div>
  );
}