import { database, ref, get, update } from '@/services/firebase';

/**
 * Idempotent: creates any missing profile fields for a signed-in user.
 *
 * Used by BOTH Login and Register (email/password and Google), so every account
 * ends up with the same record:
 *   users/{uid}/email
 *   users/{uid}/displayName
 *   users/{uid}/createdAt
 *   users/{uid}/settings/email_notifications
 *
 * Only the four small fields are read (never the whole user subtree, which also
 * holds alerts and history), and every missing field is written in one update.
 */
export async function ensureUserMirror(user) {
  if (!user) return;

  const base = `users/${user.uid}`;
  const keys = ['email', 'displayName', 'createdAt', 'settings'];

  const snaps = await Promise.all(keys.map((k) => get(ref(database, `${base}/${k}`))));
  const has = Object.fromEntries(keys.map((k, i) => [k, snaps[i].exists()]));

  const patch = {};
  if (!has.email       && user.email)       patch.email       = user.email;
  if (!has.displayName && user.displayName) patch.displayName = user.displayName;
  if (!has.createdAt)                       patch.createdAt   = Date.now();
  if (!has.settings)                        patch.settings    = { email_notifications: true };

  if (Object.keys(patch).length > 0) {
    await update(ref(database, base), patch);
  }
}