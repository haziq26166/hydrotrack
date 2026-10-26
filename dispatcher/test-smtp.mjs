#!/usr/bin/env node
/* ============================================================
   HydroTrack — SMTP test script

   Sends a single test email to verify SMTP configuration.
   Run with:  npm run test-smtp
   ============================================================ */

import 'dotenv/config';
import nodemailer from 'nodemailer';
import { buildAlertEmailHtml, buildAlertEmailText } from './templates.mjs';

const to = process.argv[2] || process.env.FROM_EMAIL;

if (!to) {
  console.error('Usage: node test-smtp.mjs <recipient@example.com>');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: (process.env.SMTP_SECURE || 'tls').toLowerCase() === 'ssl',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log(`[test] sending to ${to} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);

try {
  const info = await transporter.sendMail({
    from:    `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: 'HydroTrack Test Email',
    text:    buildAlertEmailText({
      name: 'Test User',
      deviceId: 'WFS-TEST',
      type: 'Test Alert',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 8),
      flowRate: '0.0',
    }),
    html:    buildAlertEmailHtml({
      name: 'Test User',
      deviceId: 'WFS-TEST',
      type: 'Test Alert',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 8),
      flowRate: '0.0',
    }),
  });

  console.log(`[test] sent. Message ID: ${info.messageId}`);
} catch (err) {
  console.error(`[test] failed: ${err.message}`);
  process.exit(1);
}