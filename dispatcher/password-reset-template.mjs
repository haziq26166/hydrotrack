/* ============================================================
   Email templates for HydroTrack PASSWORD RESET.
   ============================================================ */

/* Escape untrusted values before inserting into HTML. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function buildPasswordResetHtml(resetUrl) {
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

export function buildPasswordResetText(resetUrl) {
  return `Reset your HydroTrack password

We received a request to reset the password for your account.
Open this link to choose a new password:

${resetUrl}

This link can be used once and expires soon.
If you didn't request this, you can safely ignore this email.
`;
}