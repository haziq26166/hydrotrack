/**
 * Default per-device settings — single source of truth.
 *
 * Used by:
 *   • AddDeviceModal  → written to `devices/{id}/settings` ONCE when a device
 *                       is linked for the first time.
 *   • Settings page   → fallback values while a field is missing.
 *
 * The firmware keeps matching built-in fallbacks, so a device that has no
 * settings node yet still behaves sensibly.
 */
export const DEFAULT_DEVICE_SETTINGS = {
  alerts_enabled: true,

  calibration_factor: 1.1,          // pulses per second per LPM (1.1 → ~45 LPM at your sensor's full test flow)
  max_flow_threshold: 40.0,         // LPM — High Flow alert
  max_continuous_minutes: 60,       // Continuous Flow alert after this long

  off_hours_alerts_enabled: true,
  off_hours_start: '00:00',
  off_hours_end: '06:00',
  off_hours_min_duration_minutes: 1,   // whole minutes

  hammer_alerts_enabled: true,
  hammer_threshold_lpm: 10.0,       // flow must have been at least this high, then fall to ~0 within 3 seconds
  // (the 30 s gap between hammer alerts is fixed in the firmware, not a setting)
};