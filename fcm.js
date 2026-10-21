// fcm.js — Firebase Cloud Messaging (HTTP v1) sender.
// Configured ONLY through the env var FCM_SERVICE_ACCOUNT (the whole
// service-account JSON pasted as one value — a SECRET: never commit it,
// never put it in the app). If it's missing, configured() returns
// false and sends politely refuse; broadcasts from the Firebase
// Console still work without any of this.
const crypto = require('crypto');

let cache = { token: null, exp: 0 };

function serviceAccount() {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function configured() { return !!serviceAccount(); }

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cache.token && cache.exp > now + 60) return cache.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + claim);
  const signature = sign.sign(sa.private_key).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = header + '.' + claim + '.' + signature;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt)
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('FCM token exchange failed');
  cache = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cache.token;
}

async function sendOne(sa, token, message) {
  const res = await fetch('https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ message })
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// sendPush({ title, body, topic }) broadcasts to a topic.
// sendPush({ title, body, tokens: [...] }) sends to specific devices.
async function sendPush({ title, body, topic, tokens }) {
  const sa = serviceAccount();
  if (!sa) throw new Error('FCM not configured (FCM_SERVICE_ACCOUNT missing)');
  const token = await accessToken(sa);
  const base = { notification: { title, body }, android: { priority: 'HIGH' } };
  if (topic) {
    const r = await sendOne(sa, token, Object.assign({ topic }, base));
    return { sent: r.status === 200 ? 1 : 0, results: [r] };
  }
  const list = (tokens || []).slice(0, 500);
  let sent = 0; const results = [];
  for (const t of list) {
    const r = await sendOne(sa, token, Object.assign({ token: t }, base));
    if (r.status === 200) sent++;
    results.push(r.status);
  }
  return { sent, of: list.length, results };
}

module.exports = { sendPush, configured };
