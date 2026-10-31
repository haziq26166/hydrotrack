// ============================================================================
// HydroTrack — Unified Notification Server
// ----------------------------------------------------------------------------
// This single process handles TWO notification channels:
//
//   1. HTTP  POST /api/password-reset
//      Generates a Firebase password reset link (Admin SDK), then sends a
//      branded email through SMTP. Includes IP + email rate limiting, body
//      size limits, CORS, and fail-fast configuration checks.
//
//   2. Realtime Database listener
//      Watches `users/{uid}/devices/{deviceId}/alerts/{alertId}` through
//      child_added / child_changed listeners on `users`. Whenever an
//      alert record has `notified: false`, it sends a branded alert email
//      (respecting `users/{uid}/settings/email_notifications`) and flips
//      `notified: true` so the same alert is never emailed twice.
//
// Both channels share the same Nodemailer transport and fail-fast config.
//
// Email templates live in dedicated modules:
//   • alert-template.mjs          → alert notifications
//   • password-reset-template.mjs → password reset
// ============================================================================

import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import nodemailer from 'nodemailer';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { buildAlertEmailHtml, buildAlertEmailText } from './alert-template.mjs';
import { buildPasswordResetHtml, buildPasswordResetText } from './password-reset-template.mjs';

/* ============================================================
   1. CONFIG — read from .env
   ============================================================ */
const config = {
  port:        Number(process.env.RESET_PORT || 8787),
  appUrl:      (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  corsOrigin:  process.env.ALLOWED_ORIGIN || process.env.APP_URL || 'http://localhost:5173',
  saPath:      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,

  // RTDB URL — required by the alert listener. Falls back to the legacy
  // env var name used by the old dispatcher/index.mjs.
  dbUrl:       process.env.FIREBASE_DATABASE_URL
              || process.env.FIREBASE_DB_URL
              || '',

  // How old (in seconds) an unnotified alert can be before we skip it.
  // Prevents a flood of stale emails after extended downtime.
  alertLookbackSeconds: Number(process.env.ALERT_LOOKBACK_SECONDS || 60 * 60 * 24),

  // SMTP — prefer EMAIL_USER / EMAIL_PASS per spec, fall back to legacy names
  smtpHost:    process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort:    Number(process.env.SMTP_PORT || 587),
  smtpSecure:  (process.env.SMTP_SECURE || 'tls').toLowerCase() === 'ssl',
  emailUser:   process.env.EMAIL_USER || process.env.SMTP_USER,
  emailPass:   process.env.EMAIL_PASS || process.env.SMTP_PASS,

  fromEmail:   process.env.FROM_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER,
  fromName:    process.env.FROM_NAME || 'HydroTrack',
};

/* ---- Fail-fast: never start with a missing/placeholder secret ---- */
const REQUIRED = ['saPath', 'emailUser', 'emailPass', 'fromEmail', 'dbUrl'];
for (const key of REQUIRED) {
  const v = config[key];
  if (!v || String(v).startsWith('your-') || String(v).startsWith('paste-')) {
    console.error(`[config] missing or placeholder value for '${key}' (check .env)`);
    process.exit(1);
  }
}

/* ============================================================
   2. FIREBASE ADMIN  (Auth + Realtime Database)
   ============================================================ */
const serviceAccount = JSON.parse(fs.readFileSync(config.saPath, 'utf8'));
initializeApp({
  credential:  cert(serviceAccount),
  databaseURL: config.dbUrl,
});
const adminAuth = getAuth();
const db        = getDatabase();

/* ============================================================
   3. SMTP TRANSPORT  (shared by both channels)
   ============================================================ */
const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  auth: { user: config.emailUser, pass: config.emailPass },
  connectionTimeout: 15000,
  greetingTimeout:   10000,
  socketTimeout:     20000,
});

/* ============================================================
   4. RATE LIMITER — password reset
   ============================================================ */
const WINDOW_MS = 15 * 60 * 1000;
const hits = new Map();

function tooMany(key, max) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of hits) {
    const recent = arr.filter((t) => now - t < WINDOW_MS);
    if (recent.length) hits.set(k, recent); else hits.delete(k);
  }
}, WINDOW_MS).unref();

/* ============================================================
   5. PASSWORD RESET — core logic
   ============================================================ */
async function sendResetEmail(email) {
  try {
    /* -------- 1. Generate the raw Firebase link --------
       We do NOT pass actionCodeSettings here. We just want the oobCode. */
    const link = await adminAuth.generatePasswordResetLink(email);

    /* -------- 2. Extract the oobCode -------- */
    const oobCode = new URL(link).searchParams.get('oobCode');
    if (!oobCode) throw new Error('oobCode missing from generated link');

    /* -------- 3. Build the direct link to YOUR React app -------- */
    const resetUrl = `${config.appUrl}/reset-password?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;

    /* -------- 4. Send the email via Gmail SMTP -------- */
    await transporter.sendMail({
      from:    `"${config.fromName}" <${config.fromEmail}>`,
      to:      email,
      subject: 'Reset your HydroTrack password',
      text:    buildPasswordResetText(resetUrl),
      html:    buildPasswordResetHtml(resetUrl),
    });

    console.log(`[reset] email sent to ${email} with direct URL`);
    return { ok: true };
  } catch (err) {
    /* Never leak account existence — but DO log for ops. */
    if (err?.code === 'auth/user-not-found') {
      console.log('[reset] no account for requested email (silently ignored)');
      return { ok: true, ignored: true };
    }
    if (err?.code === 'auth/invalid-email') {
      console.warn('[reset] rejected: invalid-email');
      return { ok: false, error: 'invalid_email' };
    }
    console.error('[reset] failed:', err?.code || err?.message || err);
    return { ok: false, error: 'send_failed' };
  }
}

/* ============================================================
   6. RTDB ALERT LISTENER
   ============================================================ */
/*
   We attach `child_added` and `child_changed` listeners on `users`:

    • `child_added`   fires once for every existing user at startup (this is
      the initial scan) and again for each newly registered user.
    • `child_changed` fires whenever anything inside ONE user's subtree changes
      (new alert, notified-flag write, history write, settings change) and
      delivers only that user's data, instead of re-reading every user.

   Two safeguards prevent duplicate emails:

    • `inFlightAlerts` — a synchronous Set keyed by `uid/deviceId/alertId`.
      Once we start sending an alert, no other callback invocation can
      dispatch the same alert again, even if the snapshot re-fires before
      our `.set(notified, true)` round-trip completes.

    • `alert.notified` in RTDB — once we've successfully sent, we flip this
      to `true`, so the next snapshot naturally skips the alert.
*/
const inFlightAlerts = new Set();
const alertDedupeKey = (uid, deviceId, alertKey) => `${uid}/${deviceId}/${alertKey}`;

async function sendAlertEmail({ uid, deviceId, alertKey, alert, recipientEmail, displayName }) {
  const type     = String(alert.type || 'Leak Alert').replace(/[\r\n]+/g, ' ').trim();
  const date     = String(alert.date || '—');
  const time     = String(alert.time || '—');
  const flowRate = Number(alert.flow_rate || 0).toFixed(1);

  try {
    await transporter.sendMail({
      from:    `"${config.fromName}" <${config.fromEmail}>`,
      to:      `"${displayName}" <${recipientEmail}>`,
      subject: `HydroTrack Alert: ${type} on ${deviceId}`,
      text:    buildAlertEmailText({ name: displayName, deviceId, type, date, time, flowRate }),
      html:    buildAlertEmailHtml({ name: displayName, deviceId, type, date, time, flowRate }),
    });

    /* Mark as notified only AFTER a successful send — if the send fails,
       `notified` stays `false` and the next snapshot will retry. */
    await db.ref(`users/${uid}/devices/${deviceId}/alerts/${alertKey}/notified`).set(true);

    console.log(`[alert] sent ${uid}/${deviceId}/${alertKey} -> ${recipientEmail}`);
  } catch (err) {
    console.error(`[alert-error] ${uid}/${deviceId}/${alertKey}:`, err?.message || err);
  }
}

/* Scan ONE user's subtree for alerts that still need emailing. */
function processUserAlerts(uid, user) {
  if (!user || typeof user !== 'object') return;

  /* Dynamically read the recipient address */
  const recipientEmail = user.email;
  if (!recipientEmail) return;

  /* Respect the user's email-notification preference. Missing setting
     defaults to "on" so existing users keep receiving alerts. */
  if ((user?.settings?.email_notifications ?? true) === false) return;

  const now         = Date.now();
  const lookbackMs  = config.alertLookbackSeconds * 1000;
  const displayName = user.displayName || 'HydroTrack User';
  const devices     = user.devices || {};

  for (const [deviceId, deviceData] of Object.entries(devices)) {
    const alerts = deviceData?.alerts;
    if (!alerts || typeof alerts !== 'object') continue;

    for (const [alertKey, alert] of Object.entries(alerts)) {
      if (!alert || alert.notified) continue;

      /* Skip alerts older than the lookback window to avoid flooding
         users after extended downtime. */
      const rawTs = Number(alert.timestamp || 0);
      const alertTs = rawTs > 0 ? rawTs - 28800000 : 0; // Reverse the 8-hour shift
      if (alertTs > 0 && (now - alertTs) > lookbackMs) continue;

      const key = alertDedupeKey(uid, deviceId, alertKey);
      if (inFlightAlerts.has(key)) continue;

      inFlightAlerts.add(key);
      sendAlertEmail({
        uid,
        deviceId,
        alertKey,
        alert,
        recipientEmail,
        displayName,
      }).finally(() => inFlightAlerts.delete(key));
    }
  }
}

function attachAlertListener() {
  const usersRef = db.ref('users');

  const onUser  = (snapshot) => processUserAlerts(snapshot.key, snapshot.val());
  const onError = (err) => console.error('[rtdb] listener error:', err?.message || err);

  usersRef.on('child_added',   onUser, onError);
  usersRef.on('child_changed', onUser, onError);

  console.log('[rtdb] alert listener attached to /users (child_added + child_changed)');
}

/* ============================================================
   7. HTTP SERVER — password reset endpoint
   ============================================================ */
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 2048) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Structured responses so the frontend can branch on them. */
const RESP = {
  OK:           { status: 200, body: { ok: true,  message: 'If an account exists, a reset email has been sent.' } },
  INVALID:      { status: 400, body: { ok: false, error: 'invalid_email',  message: 'Please enter a valid email address.' } },
  RATE_LIMITED: { status: 429, body: { ok: false, error: 'rate_limited',   message: 'Too many requests. Please try again in 15 minutes.' } },
  BAD_BODY:     { status: 400, body: { ok: false, error: 'bad_request',    message: 'Malformed request body.' } },
};

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method !== 'POST' || req.url !== '/api/password-reset') {
    return json(res, 404, { ok: false, error: 'not_found' });
  }

  let email;
  try {
    const ip = req.socket.remoteAddress || 'unknown';
    const raw = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(raw || '{}'); }
    catch { return json(res, RESP.BAD_BODY.status, RESP.BAD_BODY.body); }

    email = String(parsed.email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return json(res, RESP.INVALID.status, RESP.INVALID.body);
    }
    if (tooMany(`ip:${ip}`, 10) || tooMany(`email:${email}`, 3)) {
      return json(res, RESP.RATE_LIMITED.status, RESP.RATE_LIMITED.body);
    }

    /* Respond immediately — hide timing so account existence can't be probed. */
    json(res, RESP.OK.status, RESP.OK.body);

    /* Fire-and-forget: send in the background; failures are logged. */
    sendResetEmail(email).catch((e) => console.error('[reset] unhandled:', e));
  } catch (err) {
    if (!res.headersSent) json(res, 400, { ok: false, error: 'bad_request' });
    console.error('[reset] handler error:', err?.message || err);
  }
});

/* ============================================================
   8. BOOT
   ============================================================ */

/* Verify SMTP once up front — catches bad credentials before we attach the
   RTDB listener or accept HTTP traffic. */
try {
  await transporter.verify();
  console.log(`[smtp] connected to ${config.smtpHost}:${config.smtpPort}`);
} catch (err) {
  console.error(`[smtp] verification failed: ${err.message}`);
  process.exit(1);
}

/* Start watching for new alerts (fires once with the current snapshot,
   then again on every change). */
attachAlertListener();

/* Start the HTTP server for password resets. */
server.listen(config.port, '0.0.0.0', () => {
  console.log(`[notification-server] listening on http://localhost:${config.port}`);
  console.log(`[notification-server] alert lookback window: ${config.alertLookbackSeconds}s`);
});

/* Graceful shutdown — detach the RTDB listener and close the HTTP server. */
async function shutdown(signal) {
  console.log(`[shutdown] received ${signal}, closing…`);
  try { await db.ref('users').off(); } catch { /* ignore */ }
  server.close(() => {
    console.log('[shutdown] http server closed');
    process.exit(0);
  });
  /* Fallback if the server is stuck */
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));