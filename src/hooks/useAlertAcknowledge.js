import { useCallback, useState } from 'react';
import { alertKey, setAlertsAcknowledged } from '@/lib/alertAcknowledge';

/**
 * State + handlers for acknowledging alerts.
 *
 * The alert lists themselves come from realtime listeners, which fire
 * immediately on a local write — so this hook only tracks the in-flight
 * state and feedback (toast); it never has to patch list state by hand.
 *
 * @param {string|undefined} uid
 * @returns {{
 *   acknowledge:     (alert) => Promise<boolean>,
 *   unacknowledge:   (alert) => Promise<boolean>,
 *   acknowledgeMany: (alerts) => Promise<boolean>,
 *   isPending:       (alert) => boolean,
 *   bulkPending:     boolean,
 *   toast:           {type: string, message: string} | null,
 *   clearToast:      () => void,
 * }}
 */
export function useAlertAcknowledge(uid) {
  const [pending, setPending]         = useState(() => new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [toast, setToast]             = useState(null);

  const run = useCallback(async (alerts, acknowledged) => {
    const targets = alerts.filter((a) => Boolean(a.acknowledged) !== acknowledged);
    if (targets.length === 0) return false;

    const keys = targets.map(alertKey);
    setPending((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });

    try {
      const count = await setAlertsAcknowledged(uid, targets, acknowledged);

      if (count > 0) {
        setToast({
          type: 'success',
          message: acknowledged
            ? count === 1 ? 'Alert acknowledged' : `${count} alerts acknowledged`
            : 'Alert marked as unacknowledged',
        });
      }
      return true;
    } catch (err) {
      console.error('[useAlertAcknowledge] write failed:', err);
      setToast({
        type: 'error',
        message: acknowledged
          ? 'Could not acknowledge the alert. Please try again.'
          : 'Could not undo the acknowledgement. Please try again.',
      });
      return false;
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      });
    }
  }, [uid]);

  const acknowledge   = useCallback((alert) => run([alert], true),  [run]);
  const unacknowledge = useCallback((alert) => run([alert], false), [run]);

  const acknowledgeMany = useCallback(async (alerts) => {
    setBulkPending(true);
    try {
      return await run(alerts, true);
    } finally {
      setBulkPending(false);
    }
  }, [run]);

  const isPending  = useCallback((alert) => pending.has(alertKey(alert)), [pending]);
  const clearToast = useCallback(() => setToast(null), []);

  return { acknowledge, unacknowledge, acknowledgeMany, isPending, bulkPending, toast, clearToast };
}