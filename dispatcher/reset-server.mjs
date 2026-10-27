// File: dispatcher/reset-server.mjs
import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import nodemailer from 'nodemailer';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/* ------------------------------ config ------------------------------ */
const config = {
  port:        Number(process.env.RESET_PORT || 8787),
  appUrl:      (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  corsOrigin:  process.env.ALLOWED_ORIGIN || process.env.APP_URL || 'http://localhost:5173',
  saPath:      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,

  smtpHost:    process.env.SMTP_HOST,
  smtpPort:    Number(process.env.SMTP_PORT || 587),
  smtpSecure:  (process.env.SMTP_SECURE || 'tls').toLowerCase() === 'ssl',
  smtpUser:    process.env.SMTP_USER,
  smtpPass:    process.env.SMTP_PASS,
  fromEmail:   process.env.FROM_EMAIL,
  fromName:    process.env.FROM_NAME || 'HydroTrack',
};

for (const key of ['saPath', 'smtpHost', 'smtpUser', 'smtpPass', 'fromEmail']) {
  const v = config[key];
  if (!v || String(v).startsWith('your-') || String(v).startsWith('paste-')) {
    console.error(`[config] missing or placeholder value for '${key}' (check .env)`);
    process.exit(1);
  }
}

/* --------------------------- firebase admin -------------------------- */
const serviceAccount = JSON.parse(fs.readFileSync(config.saPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const adminAuth = getAuth();

/* ------------------------------- smtp -------------------------------- */
const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  auth: { user: config.smtpUser, pass: config.smtpPass },
  connectionTimeout: 15000,
  greetingTimeout:   10000,
  socketTimeout:     20000,
});

/* ----------------------------- templates ----------------------------- */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function buildResetHtml(resetUrl) {
  const url = esc(resetUrl);
  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#F8FAFC;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;box-shadow:0 4px 15px rgba(0,0,0,0.05);">
    <h2 style="color:#0F172A;margin:0 0 12px 0;font-size:20px;">Reset your HydroTrack password</h2>
    <p style="color:#475569;margin:0 0 20px 0;line-height:1.5;">
      We received a request to reset the password for your account. Click the button below to choose a new one.
    </p>
    <p style="margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#0EA5E9;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:12px;">
        Reset password
      </a>
    </p>
    <p style="color:#64748B;font-size:13px;margin:0 0 8px 0;line-height:1.5;">
      Or paste this link into your browser:
    </p>
    <p style="color:#0EA5E9;font-size:12px;word-break:break-all;margin:0 0 20px 0;">${url}</p>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0 16px 0;"/>
    <p style="color:#94A3B8;font-size:12px;margin:0;line-height:1.5;">
      This link can be used once and expires soon. If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}

function buildResetText(resetUrl) {
  return `Reset your HydroTrack password

We received a request to reset the password for your account.
Open this link to choose a new password:

${resetUrl}

This link can be used once and expires soon.
If you didn't request this, you can safely ignore this email.
`;
}

/* ---------------------------- rate limiting -------------------------- */
const WINDOW_MS = 15 * 60 * 1000;
const hits = new Map(); // key -> [timestamps]

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

/* ----------------------------- core logic ---------------------------- */
async function sendResetEmail(email) {
  try {
    // Throws auth/user-not-found for unknown emails — swallowed below.
    const link = await adminAuth.generatePasswordResetLink(email);
    const oobCode = new URL(link).searchParams.get('oobCode');
    if (!oobCode) throw new Error('oobCode missing from generated link');

    // Point the user straight at the local React route.
    const resetUrl =
      `${config.appUrl}/reset-password?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;

    await transporter.sendMail({
      from:    `"${config.fromName}" <${config.fromEmail}>`,
      to:      email,
      subject: 'Reset your HydroTrack password',
      text:    buildResetText(resetUrl),
      html:    buildResetHtml(resetUrl),
    });
    console.log(`[reset] email sent to ${email}`);
  } catch (err) {
    if (err?.code === 'auth/user-not-found') {
      console.log('[reset] no account for requested email (silently ignored)');
    } else {
      console.error('[reset] failed:', err?.code || err?.message || err);
    }
  }
}

/* ------------------------------- server ------------------------------ */
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

const server = http.createServer(async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method !== 'POST' || req.url !== '/api/password-reset') {
    return json(res, 404, { ok: false });
  }

  try {
    const ip = req.socket.remoteAddress || 'unknown';
    const raw = await readBody(req);
    const { email } = JSON.parse(raw || '{}');
    const clean = String(email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(clean) || clean.length > 254) {
      return json(res, 400, { ok: false });
    }
    if (tooMany(`ip:${ip}`, 10) || tooMany(`email:${clean}`, 3)) {
      return json(res, 429, { ok: false });
    }

    // Respond immediately with the same body regardless of outcome,
    // then do the work in the background (no timing/enumeration leak).
    json(res, 200, { ok: true });
    sendResetEmail(clean);
  } catch {
    if (!res.headersSent) json(res, 400, { ok: false });
  }
});

try {
  await transporter.verify();
  console.log(`[smtp] connected to ${config.smtpHost}:${config.smtpPort}`);
} catch (err) {
  console.error(`[smtp] verification failed: ${err.message}`);
  process.exit(1);
}

server.listen(config.port, '127.0.0.1', () => {
  console.log(`[reset-server] listening on http://localhost:${config.port}`);
});