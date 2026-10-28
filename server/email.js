'use strict';
/* ── CU Hub Email via Brevo (free: 300 emails/day, no card) ── */

async function sendResetEmail(toEmail, toName, resetLink, enrollment) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // Dev fallback — log masked info only, never the full reset token
    const masked = resetLink.replace(/token=[a-f0-9]+/, 'token=***MASKED***');
    console.log('[email] BREVO_API_KEY not set. Reset link (masked):', masked);
    return;
  }

  const maskedEmail = toEmail.replace(/^(.{3})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(b.length) + c);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#5b5fc7,#7c3aed);padding:32px 40px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-.3px">CU Hub</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:13px">Central University of Rajasthan</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1a1a2e">Password Reset Request</h2>
            <p style="margin:0 0 24px;color:#666;font-size:14px;line-height:1.6">
              Hi <strong>${toName}</strong>, we received a request to reset your CU Hub password
              for enrollment number <strong>${enrollment}</strong>.
            </p>
            <p style="margin:0 0 28px;color:#666;font-size:14px;line-height:1.6">
              Click the button below to set a new password. This link expires in
              <strong>15 minutes</strong>.
            </p>
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:28px">
                  <a href="${resetLink}"
                     style="display:inline-block;background:linear-gradient(135deg,#5b5fc7,#7c3aed);
                            color:#fff;text-decoration:none;font-weight:700;font-size:15px;
                            padding:14px 36px;border-radius:10px;letter-spacing:-.2px">
                    Reset My Password →
                  </a>
                </td>
              </tr>
            </table>
            <!-- Link fallback -->
            <p style="margin:0 0 8px;color:#999;font-size:12px">Button not working? Copy this link:</p>
            <p style="margin:0 0 28px;word-break:break-all">
              <a href="${resetLink}" style="color:#5b5fc7;font-size:12px">${resetLink}</a>
            </p>
            <!-- Divider -->
            <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px">
            <!-- Security note -->
            <p style="margin:0;color:#999;font-size:12px;line-height:1.7">
              🔒 If you did not request a password reset, ignore this email.
              Your password will remain unchanged.<br><br>
              For security, this link will expire in 15 minutes and can only be used once.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9fb;padding:20px 40px;text-align:center;border-top:1px solid #eee">
            <p style="margin:0;color:#bbb;font-size:11px">
              CU Hub · Central University of Rajasthan · curaj.ac.in
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key':     apiKey,
      'Content-Type':'application/json',
      'Accept':      'application/json',
    },
    body: JSON.stringify({
      sender:      { name: 'CU Hub', email: process.env.SENDER_EMAIL || 'noreply@curaj.ac.in' },
      to:          [{ email: toEmail, name: toName }],
      subject:     'Reset your CU Hub password',
      htmlContent: html,
    }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`Brevo error ${r.status}: ${err?.message || 'unknown'}`);
  }
}

module.exports = { sendResetEmail };
