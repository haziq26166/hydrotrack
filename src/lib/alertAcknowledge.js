import { database, ref, update, serverTimestamp } from '@/services/firebase';

/* Realtime Database multi-path updates are atomic per call; keep each call a
   sensible size so "acknowledge all" on a long history can't build a huge payload. */
const CHUNK_SIZE = 200;

/** Stable identity of an alert across devices. */
export const alertKey = (alert) => `${alert.deviceId}:${alert.id}`;

/** RTDB path of a single alert record. */
export const alertPath = (uid, deviceId, alertId) =>
  `users/${uid}/devices/${deviceId}/alerts/${alertId}`;

/**
 * Mark alerts as acknowledged (or revert them).
 *
 * Writes three fields on each alert record:
 *   acknowledged        boolean
 *   acknowledged_at     server timestamp (null when reverted)
 *   acknowledged_by     uid              (null when reverted)
 *
 * Alerts already in the requested state are skipped, so calling this twice is
 * harmless. Resolves with the number of alerts actually written.
 *
 * @param {string} uid
 * @param {Array<{id:string, deviceId:string, acknowledged?:boolean}>} alerts
 * @param {boolean} acknowledged  true = acknowledge, false = undo
 */
export async function setAlertsAcknowledged(uid, alerts, acknowledged = true) {
  if (!uid) throw new Error('You must be signed in to acknowledge alerts.');

  const targets = alerts.filter(
    (a) => a && a.id && a.deviceId && Boolean(a.acknowledged) !== acknowledged,
  );
  if (targets.length === 0) return 0;

  for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
    const updates = {};

    for (const a of targets.slice(i, i + CHUNK_SIZE)) {
      const base = alertPath(uid, a.deviceId, a.id);
      updates[`${base}/acknowledged`]    = acknowledged;
      updates[`${base}/acknowledged_at`] = acknowledged ? serverTimestamp() : null;
      updates[`${base}/acknowledged_by`] = acknowledged ? uid : null;
    }

    await update(ref(database), updates);
  }

  return targets.length;
}