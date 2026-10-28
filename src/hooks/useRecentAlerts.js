import { useEffect, useMemo, useState } from 'react';
import { database, ref, onValue } from '@/services/firebase';

/**
 * Latest alerts across ALL of a user's devices, newest first.
 *
 * Reads users/{uid}/devices/{id}/alerts.
 *
 * @param {string|undefined} uid
 * @param {Record<string,{id,name}>} devices  from useDevices / useDeviceFleet
 * @param {number} limit
 * @returns {{ alerts: Array, ready: boolean }}
 */
export function useRecentAlerts(uid, devices, limit = 5) {
  const [alertsMap, setAlertsMap] = useState({});

  const idsKey = JSON.stringify(Object.keys(devices).sort());

  useEffect(() => {
    if (!uid) return undefined;
    const ids = JSON.parse(idsKey);

    setAlertsMap((prev) => {
      const keys = Object.keys(prev);
      if (keys.every((k) => ids.includes(k))) return prev;
      return Object.fromEntries(keys.filter((k) => ids.includes(k)).map((k) => [k, prev[k]]));
    });

    const unsubs = ids.map((id) =>
      onValue(
        ref(database, `users/${uid}/devices/${id}/alerts`),
        (snap) => setAlertsMap((prev) => ({ ...prev, [id]: snap.val() || {} })),
        (err) => {
          console.error('[useRecentAlerts] subscription failed:', err);
          setAlertsMap((prev) => (id in prev ? prev : { ...prev, [id]: {} }));
        },
      ),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [uid, idsKey]);

  return useMemo(() => {
    const merged = [];

    Object.entries(alertsMap).forEach(([deviceId, raw]) => {
      Object.entries(raw).forEach(([key, val]) => {
        merged.push({
          key: `${deviceId}:${key}`,
          deviceId,
          deviceName: devices[deviceId]?.name || deviceId,
          type: val.type || 'Leak Alert',
          flowRate: Number(val.flow_rate || 0),
          date: val.date || '',
          time: val.time || '',
          timestamp: Number(val.timestamp || 0),
        });
      });
    });

    merged.sort((a, b) => b.timestamp - a.timestamp);

    return {
      alerts: merged.slice(0, limit),
      ready: Object.keys(devices).every((id) => id in alertsMap),
    };
  }, [alertsMap, devices, limit]);
}