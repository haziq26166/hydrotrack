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
const REQUIRED = ['saPath', 'emailUser', 'emailPass', 'fromEmail'];
for (const key of REQUIRED) {
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
  auth: { user: config.emailUser, pass: config.emailPass },
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
   CORE LOGIC — generate link via Admin SDK + send via Nodemailer
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
      text:    buildResetText(resetUrl),
      html:    buildResetHtml(resetUrl),
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

/* ------------------------------- boot -------------------------------- */
try {
  await transporter.verify();
  console.log(`[smtp] connected to ${config.smtpHost}:${config.smtpPort}`);
} catch (err) {
  console.error(`[smtp] verification failed: ${err.message}`);
  process.exit(1);
}

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[reset-server] listening on http://localhost:${config.port}`);
});