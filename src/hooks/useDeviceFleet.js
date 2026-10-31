import { useEffect, useMemo, useState } from 'react';
import { database, ref, onValue } from '@/services/firebase';
import { useDevices } from './useDevices';

/* Same threshold as useDeviceStatus: firmware pushes every second, so
   60 s of silence is unambiguously offline. */
const STALE_THRESHOLD_MS = 60_000;

/* Sort priority — problems first. */
const STATUS_RANK = { leak: 0, warn: 1, offline: 2, ok: 3 };
export const statusRank = (status) => STATUS_RANK[status] ?? 9;

/**
 * Live view of ALL of a user's devices.
 *
 * Each entry in `list`:
 *   { id, name, linkedAt, live, loading,
 *     isOnline, secondsAgo,
 *     rawStatus,                // NORMAL | ALERT | LEAK | …
 *     status,                   // 'ok' | 'warn' | 'leak' | 'offline'
 *     flow, usage, peak }       // flow forced to 0 while offline (stale otherwise)
 *
 * `summary` aggregates the fleet for the banner and KPI strip.
 */
export function useDeviceFleet(uid) {
  const { devices, loading } = useDevices(uid);
  const [liveMap, setLiveMap] = useState({});
  const [now, setNow] = useState(() => Date.now());

  /* One shared clock re-evaluates online/offline every 15 s. */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const idsKey = JSON.stringify(Object.keys(devices).sort());

  useEffect(() => {
    const ids = JSON.parse(idsKey);

    /* Drop live data of devices that were unlinked */
    setLiveMap((prev) => {
      const keys = Object.keys(prev);
      if (keys.every((k) => ids.includes(k))) return prev;
      return Object.fromEntries(keys.filter((k) => ids.includes(k)).map((k) => [k, prev[k]]));
    });

    const unsubs = ids.map((id) =>
      onValue(
        ref(database, `devices/${id}/live_data`),
        (snap) => setLiveMap((prev) => ({ ...prev, [id]: snap.val() || {} })),
        (err) => {
          console.error('[useDeviceFleet] subscription failed:', err);
          setLiveMap((prev) => (id in prev ? prev : { ...prev, [id]: {} }));
        },
      ),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [idsKey]);

  const list = useMemo(() => {
    const t = Math.max(now, Date.now());

    return Object.values(devices).map((d) => {
      const live = liveMap[d.id];
      const ready = live !== undefined;
      const rawTs = Number(live?.timestamp || 0);
      const ts = rawTs > 0 ? rawTs - 28800000 : 0; // Reverse the 8-hour shift
      const isOnline = ready && ts > 0 && t - ts < STALE_THRESHOLD_MS;
      const secondsAgo = ts > 0 ? Math.max(0, Math.floor((t - ts) / 1000)) : null;
      const rawStatus = String(live?.leak_status ?? 'NORMAL').toUpperCase();

      const status = !isOnline
        ? 'offline'
        : rawStatus === 'LEAK'
          ? 'leak'
          : rawStatus === 'ALERT'
            ? 'warn'
            : 'ok';

      return {
        id: d.id,
        name: d.name,
        linkedAt: d.linkedAt,
        live: live || {},
        loading: !ready,
        isOnline,
        secondsAgo,
        rawStatus,
        status,
        flow: isOnline ? Number(live?.current_flow || 0) : 0,
        usage: Number(live?.todays_usage || 0),
        peak: Number(live?.highest_flow_rate || 0),
      };
    });
  }, [devices, liveMap, now]);

  const summary = useMemo(() => {
    const ready = list.filter((d) => !d.loading);

    return {
      total: list.length,
      online: ready.filter((d) => d.isOnline).length,
      offline: ready.filter((d) => !d.isOnline).length,
      leakDevices: list.filter((d) => d.status === 'leak'),
      warnDevices: list.filter((d) => d.status === 'warn'),
      totalFlow: list.reduce((s, d) => s + d.flow, 0),
      totalUsage: list.reduce((s, d) => s + d.usage, 0),
      connecting: list.some((d) => d.loading),
    };
  }, [list]);

  return { devices, list, summary, loading };
}