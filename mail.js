// mail.js — sends the password-reset email through Resend.
// Without RESEND_API_KEY it logs the code to the server console (dev mode).
async function sendResetEmail(to, code) {
  const appName = process.env.APP_NAME || 'Your Brand App';
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    console.log('[mail:dev] Reset code for ' + to + ': ' + code);
    return { dev: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      from, to,
      subject: appName + ' — your password reset code',
      html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">' +
        '<h2 style="margin:0 0 8px">' + appName + '</h2>' +
        '<p>Use this code to reset your password. It expires in 15 minutes.</p>' +
        '<p style="font-size:30px;font-weight:800;letter-spacing:6px">' + code + '</p>' +
        '<p style="color:#666">If you did not request this, you can ignore this email.</p></div>'
    })
  });
  if (!res.ok) throw new Error('Resend send failed: ' + res.status);
  return res.json();
}
module.exports = { sendResetEmail };
