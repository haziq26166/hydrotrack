import { useEffect, useMemo, useState } from 'react';
import { database, ref, onValue } from '@/services/firebase';

const pad = (n) => String(n).padStart(2, '0');

/* Local-date key, identical to the one the History page builds. */
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Daily water usage for the last 7 days (today included), summed across devices.
 *
 * Reads users/{uid}/devices/{id}/history/{YYYY-MM-DD}/total_volume.
 * For today it uses max(history, live todays_usage) per device, so the live
 * figure is never double-counted if history is also written during the day.
 *
 * @param {string|undefined} uid
 * @param {Array} fleetList  `list` from useDeviceFleet (needs id + usage)
 * @returns {{ days: Array<{key,label,total,isToday}>, weekTotal: number, avgPerDay: number, ready: boolean }}
 */
export function useUsageHistory(uid, fleetList) {
  const [historyMap, setHistoryMap] = useState({});

  const idsKey = JSON.stringify(fleetList.map((d) => d.id).sort());

  useEffect(() => {
    if (!uid) return undefined;
    const ids = JSON.parse(idsKey);

    setHistoryMap((prev) => {
      const keys = Object.keys(prev);
      if (keys.every((k) => ids.includes(k))) return prev;
      return Object.fromEntries(keys.filter((k) => ids.includes(k)).map((k) => [k, prev[k]]));
    });

    const unsubs = ids.map((id) =>
      onValue(
        ref(database, `users/${uid}/devices/${id}/history`),
        (snap) => setHistoryMap((prev) => ({ ...prev, [id]: snap.val() || {} })),
        (err) => {
          console.error('[useUsageHistory] subscription failed:', err);
          setHistoryMap((prev) => (id in prev ? prev : { ...prev, [id]: {} }));
        },
      ),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [uid, idsKey]);

  return useMemo(() => {
    const today = new Date();
    const todayKey = dateKey(today);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const key = dateKey(d);
      const isToday = key === todayKey;

      const total = fleetList.reduce((sum, dev) => {
        const fromHistory = Number(historyMap[dev.id]?.[key]?.total_volume || 0);
        return sum + (isToday ? Math.max(fromHistory, dev.usage) : fromHistory);
      }, 0);

      return {
        key,
        label: isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
        total,
        isToday,
      };
    });

    const weekTotal = days.reduce((s, d) => s + d.total, 0);

    return {
      days,
      weekTotal,
      avgPerDay: weekTotal / 7,
      ready: fleetList.every((d) => d.id in historyMap),
    };
  }, [fleetList, historyMap]);
}