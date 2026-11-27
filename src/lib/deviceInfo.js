import { formatAgo } from '@/lib/format';

/** Flow (LPM) at which the water gauge is completely full. */
export const FLOW_FULL_SCALE_LPM = 40;
/** Decorative floor so a calm, online device still shows some water. */
export const MIN_ONLINE_LEVEL = 12;

/** Status → WaterFill tone */
export const WATER_TONE = { ok: 'water', warn: 'warn', leak: 'leak', offline: 'offline' };

/** Label + subtitle for a device, shared by the dashboard card and the device table. */
export function describeDevice(d) {
  if (d.loading) {
    return { chip: 'info', label: 'Connecting', subtitle: 'Waiting for first reading…' };
  }
  switch (d.status) {
    case 'leak':
      return {
        chip: 'leak',
        label: 'Leak detected',
        subtitle: d.alertReason ? `${d.alertReason} detected` : 'Continuous flow detected',
      };
    case 'warn':
      return {
        chip: 'warn',
        label: 'Unusual flow',
        subtitle: d.alertReason ? `${d.alertReason} detected` : 'Flow pattern needs a look',
      };
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

/** "Live" / "42s ago" / "Never" — for the Last seen column. */
export function lastSeenLabel(d) {
  if (d.loading) return '…';
  if (d.isOnline) return 'Live';
  return d.secondsAgo !== null ? formatAgo(d.secondsAgo) : 'Never';
}

/** 0–100 gauge level for a device. */
export function gaugeLevel(d) {
  if (d.status === 'offline') return 0;
  return Math.max(MIN_ONLINE_LEVEL, Math.min(100, (d.flow / FLOW_FULL_SCALE_LPM) * 100));
}