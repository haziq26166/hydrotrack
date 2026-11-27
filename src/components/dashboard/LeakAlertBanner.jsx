import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaTriangleExclamation, FaDroplet, FaPlugCircleXmark, FaXmark, FaArrowRight,
} from 'react-icons/fa6';

const TONES = {
  leak: {
    shell: 'border-coral-200 bg-coral-50',
    icon: 'bg-coral-500 text-white',
    title: 'text-coral-800',
    text: 'text-coral-700',
    link: 'text-coral-700 hover:bg-coral-100',
    role: 'alert',
  },
  warn: {
    shell: 'border-sand-200 bg-sand-50',
    icon: 'bg-sand-500 text-white',
    title: 'text-sand-800',
    text: 'text-sand-700',
    link: 'text-sand-700 hover:bg-sand-100',
    role: 'status',
  },
  offline: {
    shell: 'border-fog-200 bg-fog-50',
    icon: 'bg-fog-400 text-white',
    title: 'text-fog-800',
    text: 'text-fog-600',
    link: 'text-fog-700 hover:bg-fog-100',
    role: 'status',
  },
};

/**
 * Compact one-line status bar for the device shown on the dashboard.
 * Renders nothing while the device is healthy (no "all clear" noise).
 *
 *   device  entry from useDeviceFleet().list
 *
 * Leak / unusual-flow bars can be dismissed; they come back automatically
 * if the status changes.
 */
export function LeakAlertBanner({ device }) {
  const [dismissedKey, setDismissedKey] = useState(null);

  if (!device || device.loading) return null;

  if (device.status === 'leak') {
    const key = `leak:${device.id}`;
    if (dismissedKey === key) return null;
    return (
      <Bar
        tone="leak"
        Icon={FaDroplet}
        title={`Leak detected on ${device.name}`}
        message={`Continuous flow of ${device.flow.toFixed(1)} LPM. Check the pipes and consider shutting off the water supply.`}
        onDismiss={() => setDismissedKey(key)}
        pulse
      />
    );
  }

  if (device.status === 'warn') {
    const key = `warn:${device.id}`;
    if (dismissedKey === key) return null;
    return (
      <Bar
        tone="warn"
        Icon={FaTriangleExclamation}
        title={`Unusual flow on ${device.name}`}
        message={device.alertReason ? `${device.alertReason} detected.` : 'Review the alert details to see what triggered it.'}
        onDismiss={() => setDismissedKey(key)}
      />
    );
  }

  if (device.status === 'offline') {
    return (
      <Bar
        tone="offline"
        Icon={FaPlugCircleXmark}
        title={`${device.name} is offline`}
        message="No live data is arriving. Check power and Wi-Fi on the device. Leaks can't be detected while offline."
        showAlertsLink={false}
      />
    );
  }

  return null;
}

function Bar({ tone, Icon, title, message, onDismiss, pulse = false, showAlertsLink = true }) {
  const t = TONES[tone];

  return (
    <div
      role={t.role}
      className={[
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 animate-fade-in',
        t.shell,
        pulse ? 'animate-pulse-alert' : '',
      ].join(' ')}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${t.icon}`}>
        <Icon size={14} />
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-semibold ${t.title}`}>{title}</p>
        <p className={`text-xs leading-relaxed ${t.text}`}>{message}</p>
      </div>

      {showAlertsLink && (
        <Link
          to="/alerts"
          className={`hidden shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold transition-colors sm:inline-flex ${t.link}`}
        >
          View alerts <FaArrowRight size={9} />
        </Link>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert banner"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40 ${t.text}`}
        >
          <FaXmark size={12} />
        </button>
      )}
    </div>
  );
}