/* ============================================================
   Email templates for HydroTrack alerts.

   Both functions accept the same argument object:
     { name, deviceId, type, date, time, flowRate }
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

export function buildAlertEmailHtml({ name, deviceId, type, date, time, flowRate }) {
  const n  = esc(name);
  const id = esc(deviceId);
  const t  = esc(type);
  const d  = esc(date);
  const tm = esc(time);
  const fr = esc(flowRate);

  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#F8FAFC;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;
              padding:32px;box-shadow:0 4px 15px rgba(0,0,0,0.05);">
    <h2 style="color:#0F172A;margin:0 0 12px 0;font-size:20px;">HydroTrack Alert</h2>
    <p style="color:#475569;margin:0 0 16px 0;">Hi ${n},</p>
    <p style="color:#475569;margin:0 0 20px 0;line-height:1.5;">
      A <strong style="color:#EF4444;">${t}</strong> was detected on device
      <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:13px;">${id}</code>.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:8px 0;color:#64748B;font-size:14px;">Date</td>
        <td style="padding:8px 0;color:#0F172A;font-weight:600;font-size:14px;">${d}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748B;font-size:14px;">Time</td>
        <td style="padding:8px 0;color:#0F172A;font-weight:600;font-size:14px;">${tm}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748B;font-size:14px;">Flow Rate</td>
        <td style="padding:8px 0;color:#0F172A;font-weight:600;font-size:14px;">${fr} LPM</td>
      </tr>
    </table>

    <p style="color:#475569;font-size:13px;margin:20px 0 0 0;line-height:1.5;">
      Open your HydroTrack dashboard to view the full alert history.
    </p>

    <hr style="border:none;border-top:1px solid #E2E8F0;margin:28px 0 16px 0;"/>

    <p style="color:#94A3B8;font-size:12px;margin:0;line-height:1.5;">
      You are receiving this because email notifications are enabled in your
      HydroTrack settings. You can turn them off on the Settings page.
    </p>
  </div>
</body>
</html>`;
}

export function buildAlertEmailText({ name, deviceId, type, date, time, flowRate }) {
  return `HydroTrack Alert

Hi ${name},

A ${type} was detected on device ${deviceId}.

Date:      ${date}
Time:      ${time}
Flow Rate: ${flowRate} LPM

Open your HydroTrack dashboard to view the full alert history.
`;
}