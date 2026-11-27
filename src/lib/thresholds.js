/**
 * Household-based alert limits — the ONLY place the numbers live.
 *
 * The user never sees or edits these values. They only tell the system how
 * many people live in the home, and the limits are derived from that:
 *
 *   High flow (LPM)              10 + 3 × people          (max 45)
 *   Continuous flow (minutes)    30 + 10 × people         (max 120)
 *   Water hammer spike (LPM)     5 + 0.5 × people         (max 15)
 *   Off-hours min. duration (m)  1 + floor(people / 4)    (max 5)
 *
 * Bigger households legitimately use more water at once and for longer, so the
 * limits rise with the number of people.
 *
 * Calibration is a hardware property (not a household one), so it is fixed.
 */
export const HOUSEHOLD_MIN = 1;
export const HOUSEHOLD_MAX = 20;
export const DEFAULT_HOUSEHOLD_SIZE = 4;

export const CALIBRATION_FACTOR = 1.1;

const round1 = (n) => Math.round(n * 10) / 10;

/** Whole number inside 1–20 (falls back to the default for junk input). */
export function clampHousehold(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_HOUSEHOLD_SIZE;
  return Math.min(HOUSEHOLD_MAX, Math.max(HOUSEHOLD_MIN, n));
}

/**
 * Everything the system decides for a device, from the household size.
 * Spread the result into `devices/{id}/settings`.
 */
export function computeThresholds(people) {
  const n = clampHousehold(people);

  return {
    household_size: n,
    calibration_factor: CALIBRATION_FACTOR,
    max_flow_threshold: round1(Math.min(45, 10 + 3 * n)),
    max_continuous_minutes: Math.min(120, 30 + 10 * n),
    hammer_threshold_lpm: round1(Math.min(15, 5 + 0.5 * n)),
    off_hours_min_duration_minutes: Math.min(5, 1 + Math.floor(n / 4)),
    hammer_alerts_enabled: true, // always on — not a user setting any more
  };
}