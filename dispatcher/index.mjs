#!/usr/bin/env node
/* ============================================================================
   HydroTrack — Alert email dispatcher (Node.js)

   Reads unnotified alerts from Firebase RTDB and sends them via SMTP.
   Marks each alert as notified so it is never re-sent.

   Run manually:
     node index.mjs

   Run on a schedule:
     Windows Task Scheduler → dispatcher/run.bat every 5 minutes

   The lookback window prevents replaying ancient alerts after downtime.
   ============================================================================ */

import 'dotenv/config';
import nodemailer from 'nodemailer';
import { buildAlertEmailHtml, buildAlertEmailText } from './templates.mjs';

/* ============================================================
   1. CONFIG — read from .env
   ============================================================ */
const config = {
  smtpHost:        process.env.SMTP_HOST,
  smtpPort:        Number(process.env.SMTP_PORT || 587),
  smtpSecure:      (process.env.SMTP_SECURE || 'tls').toLowerCase() === 'ssl',
  smtpUser:        process.env.SMTP_USER,
  smtpPass:        process.env.SMTP_PASS,

  fromEmail:       process.env.FROM_EMAIL,
  fromName:        process.env.FROM_NAME || 'HydroTrack Alerts',

  dbUrl:           process.env.FIREBASE_DB_URL,
  dbSecret:        process.env.FIREBASE_SECRET,

  lookbackSeconds: Number(process.env.LOOKBACK_SECONDS || 600),
};

/* ---- Config sanity — fail loudly if any required key is missing ---- */
const REQUIRED = ['smtpHost', 'smtpUser', 'smtpPass', 'fromEmail', 'dbUrl', 'dbSecret'];
for (const key of REQUIRED) {
  const value = config[key];
  if (!value || (typeof value === 'string' && (
      value.startsWith('your-') ||
      value.startsWith('paste-')
  ))) {
    console.error(`[config] missing or placeholder value for '${key}' (check .env)`);
    process.exit(1);
  }
}

/* ============================================================
   2. Firebase REST helpers
   ============================================================ */

async function fbRequest(method, path, payload = null) {
  const cleanBase = config.dbUrl.replace(/\/+$/, '');
  const cleanPath = String(path).replace(/^\/+/, '');
  const url = new URL(`${cleanBase}/${cleanPath}.json`);
  url.searchParams.set('auth', config.dbSecret);

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (payload !== null) opts.body = JSON.stringify(payload);

  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    console.error(`[fb] ${method} ${path} → network error: ${err.message}`);
    return null;
  }

  if (!res.ok) {
    console.error(`[fb] ${method} ${path} → HTTP ${res.status}`);
    return null;
  }

  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

const fbGet = (path) => fbRequest('GET', path);
const fbPut = (path, value) => fbRequest('PUT', path, value);

/* ============================================================
   3. Main dispatch loop
   ============================================================ */

async function main() {
  console.log('HydroTrack — alert dispatcher (Node.js)');
  console.log('---------------------------------------');

  const users = await fbGet('users');
  if (users === null) {
    console.error('[fatal] could not read /users — check FIREBASE_SECRET and DB URL');
    process.exit(1);
  }

  /* Reusable SMTP transporter — nodemailer pools connections internally */
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    connectionTimeout: 15000,
    greetingTimeout:   10000,
    socketTimeout:     20000,
  });

  /* Verify SMTP credentials up front — catches config errors before any send */
  try {
    await transporter.verify();
    console.log(`[smtp] connected to ${config.smtpHost}:${config.smtpPort}`);
  } catch (err) {
    console.error(`[smtp] verification failed: ${err.message}`);
    process.exit(1);
  }

  /* ---- Time window ---- */
  /* Firebase .sv timestamps are in MILLISECONDS, so compare with Date.now()
     and scale the lookback window accordingly. (The old PHP version mixed
     seconds and milliseconds and effectively disabled the window entirely.) */
  const now        = Date.now();
  const lookbackMs = config.lookbackSeconds * 1000;

  let sent = 0;

  for (const [uid, user] of Object.entries(users || {})) {
    /* Email preference check */
    if ((user?.settings?.email_notifications ?? true) === false) continue;

    const recipientEmail = user?.email;
    if (!recipientEmail) continue;

    const displayName = user?.displayName || 'HydroTrack User';
    const devices     = user?.devices || {};

    for (const [deviceId, deviceData] of Object.entries(devices)) {
      const alerts = deviceData?.alerts || {};
      if (Object.keys(alerts).length === 0) continue;

      for (const [alertKey, alert] of Object.entries(alerts)) {
        if (!alert || alert.notified) continue;

        const alertTs = Number(alert.timestamp || 0);
        if (alertTs > 0 && (now - alertTs) > lookbackMs) continue;

        const type     = String(alert.type || 'Leak Alert')
                          .replace(/[\r\n]+/g, ' ').trim();
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

          const ok = await fbPut(
            `users/${uid}/devices/${deviceId}/alerts/${alertKey}/notified`,
            true
          );

          if (ok === null) {
            console.error(`[warn] sent but failed to mark notified: ${uid}/${deviceId}/${alertKey}`);
          }

          sent++;
          console.log(`[sent] ${uid}/${deviceId}/${alertKey} → ${recipientEmail}`);
        } catch (err) {
          console.error(`[mail-error] ${deviceId}/${alertKey}: ${err.message}`);
        }
      }
    }
  }

  console.log(`[done] ${sent} alert email(s) sent.`);
}

/* ============================================================
   4. Entry point
   ============================================================ */

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});