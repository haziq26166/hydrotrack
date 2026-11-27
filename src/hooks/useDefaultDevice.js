import { useEffect, useState } from 'react';
import { database, ref, onValue } from '@/services/firebase';

/**
 * Subscribe to users/{uid}/default_device_id.
 * Returns { defaultId: string | null, loading: boolean }
 */
export function useDefaultDevice(uid) {
  const [defaultId, setDefaultId] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!uid) {
      setDefaultId(null);
      setLoading(false);
      return undefined;
    }

    const unsub = onValue(
      ref(database, `users/${uid}/default_device_id`),
      (snap) => {
        setDefaultId(snap.val() || null);
        setLoading(false);
      },
      (err) => {
        console.error('[useDefaultDevice] subscription failed:', err);
        setLoading(false);
      },
    );

    return unsub;
  }, [uid]);

  return { defaultId, loading };
}