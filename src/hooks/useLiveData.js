import { useEffect, useState } from 'react';
import { database, ref, onValue } from '@/services/firebase';

/**
 * Subscribe to devices/{deviceId}/live_data.
 * Returns the raw live snapshot or null while waiting.
 */
export function useLiveData(deviceId) {
  const [live, setLive]       = useState(null);
  const [loading, setLoading] = useState(Boolean(deviceId));

  useEffect(() => {
    if (!deviceId) {
      setLive(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onValue(
      ref(database, `devices/${deviceId}/live_data`),
      (snap) => {
        setLive(snap.val() || null);
        setLoading(false);
      },
      (err) => {
        console.error('[useLiveData] subscription failed:', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [deviceId]);

  return { live, loading };
}