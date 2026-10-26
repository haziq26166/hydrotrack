import { useEffect, useState } from 'react';
import { database, ref, onValue } from '@/services/firebase';

/**
 * Subscribe to users/{uid}/user_devices.
 * Returns { devices: Record<id, { id, name, linkedAt }>, loading }
 */
export function useDevices(uid) {
  const [devices, setDevices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setDevices({});
      setLoading(false);
      return;
    }

    const unsub = onValue(
      ref(database, `users/${uid}/user_devices`),
      (snap) => {
        const raw = snap.val() || {};
        const mapped = Object.fromEntries(
          Object.entries(raw).map(([id, meta]) => [
            id,
            { id, name: meta.name || id, linkedAt: meta.linked_at || 0 },
          ])
        );
        setDevices(mapped);
        setLoading(false);
      },
      (err) => {
        console.error('[useDevices] subscription failed:', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [uid]);

  return { devices, loading };
}