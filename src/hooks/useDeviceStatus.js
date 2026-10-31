import { useEffect, useState } from 'react';

/* Threshold: if the device hasn't pushed live_data in this many seconds,
   we consider it offline. Firmware pushes every 1 second, so 60 s means
   60 missed pushes — unambiguously offline. */
const STALE_THRESHOLD_MS = 60_000;

/**
 * Compute device online status from a live_data snapshot.
 *
 * @param {object|null} live - the `live_data` object from useLiveData
 * @returns {{ isOnline: boolean, secondsAgo: number|null }}
 */
export function useDeviceStatus(live) {
  const [now, setNow] = useState(Date.now());

  /* Re-evaluate every 15 seconds so the UI flips to "offline" on its own
     even if no new Firebase event arrives. */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const rawTs = Number(live?.timestamp || 0);
  if (!rawTs) {
    return { isOnline: false, secondsAgo: null };
  }
  const ts = rawTs - 28800000; // Reverse the 8-hour shift
  const secondsAgo = Math.max(0, Math.floor((now - ts) / 1000));
  const isOnline   = (now - ts) < STALE_THRESHOLD_MS;

  return { isOnline, secondsAgo };
}