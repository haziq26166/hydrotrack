import { computeThresholds } from '@/lib/thresholds';

/**
 * Default per-device settings — single source of truth.
 *
 * Only the settings the USER can change live here. Every alert limit
 * (high flow, continuous flow, water hammer, off-hours duration) is calculated
 * by the system from the household size — see `src/lib/thresholds.js`.
 *
 * Used by:
 *   • AddDeviceModal → writes the full settings node ONCE when a device is linked.
 *   • Settings page  → fallback values while a field is missing.
 */
export const DEFAULT_DEVICE_SETTINGS = {
  alerts_enabled: true,

  off_hours_alerts_enabled: true,
  off_hours_start: '00:00',
  off_hours_end: '06:00',
};

/** The complete `devices/{id}/settings` node for a freshly linked device. */
export function buildInitialDeviceSettings(people) {
  return {
    ...DEFAULT_DEVICE_SETTINGS,
    ...computeThresholds(people),
    updated_at: Date.now(),
  };
}