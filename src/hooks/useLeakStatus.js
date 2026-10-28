import { useEffect, useMemo, useState } from 'react';
import { database, ref, onValue } from '@/services/firebase';
import { useDevices } from './useDevices';

/**
 * App-wide leak summary across ALL of a user's devices.
 *
 * It listens only to `devices/{id}/live_data/leak_status` (a tiny child that
 * changes rarely) instead of the whole `live_data` node (which changes every
 * second), so it is cheap to keep mounted in the layout.
 *
 * Trade-off: a device that dies while reporting LEAK keeps its last status
 * here until it reports again. The dashboard banner still shows "offline"
 * for that device, because it checks the timestamp.
 *
 * @param {string|undefined} uid
 * @returns {{
 *   level: 'ok' | 'warn' | 'leak',   // worst status across devices
 *   leakCount: number,               // devices reporting LEAK
 *   alertCount: number,              // devices reporting ALERT
 *   deviceCount: number,
 * }}
 */
export function useLeakStatus(uid) {
  const { devices } = useDevices(uid);

  const ids = useMemo(() => Object.keys(devices).sort(), [devices]);
  const idsKey = JSON.stringify(ids);

  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    const list = JSON.parse(idsKey);

    /* Drop statuses of devices that were unlinked */
    setStatuses((prev) => {
      const keys = Object.keys(prev);
      if (keys.every((k) => list.includes(k))) return prev;
      return Object.fromEntries(keys.filter((k) => list.includes(k)).map((k) => [k, prev[k]]));
    });

    const unsubs = list.map((id) =>
      onValue(
        ref(database, `devices/${id}/live_data/leak_status`),
        (snap) => {
          const value = snap.val();
          setStatuses((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
        },
        (err) => console.error('[useLeakStatus] subscription failed:', err),
      ),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [idsKey]);

  return useMemo(() => {
    let leakCount = 0;
    let alertCount = 0;

    for (const id of ids) {
      const s = String(statuses[id] ?? '').toUpperCase();
      if (s === 'LEAK') leakCount += 1;
      else if (s === 'ALERT') alertCount += 1;
    }

    return {
      level: leakCount > 0 ? 'leak' : alertCount > 0 ? 'warn' : 'ok',
      leakCount,
      alertCount,
      deviceCount: ids.length,
    };
  }, [ids, statuses]);
}