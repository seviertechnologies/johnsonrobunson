const express = require('express');
const PushToken = require('../models/PushToken');
const fcm = require('../fcm');

const router = express.Router();

function adminOk(req) {
  return !!process.env.PUSH_ADMIN_KEY && req.get('x-admin-key') === process.env.PUSH_ADMIN_KEY;
}

// The app calls this on every launch (fire-and-forget).
router.post('/register', async (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (!token) return res.status(400).json({ ok: false, error: 'token required' });
    await PushToken.updateOne(
      { token },
      { $set: { platform: platform || 'Android', lastSeen: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false }); }
});

router.get('/count', async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const n = await PushToken.countDocuments();
  res.json({ ok: true, devices: n, fcmConfigured: fcm.configured() });
});

router.post('/send', async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const { title, body, topic, tokens } = req.body || {};
  if (!title || !body) return res.status(400).json({ ok: false, error: 'title and body required' });
  if (!fcm.configured()) return res.status(503).json({ ok: false, error: 'FCM not configured on this server' });
  try {
    if (Array.isArray(tokens) && tokens.length) {
      const r = await fcm.sendPush({ title, body, tokens });
      return res.json({ ok: true, sent: r.sent, of: r.of });
    }
    const r = await fcm.sendPush({ title, body, topic: topic || 'all-listeners' });
    res.json({ ok: true, sent: r.sent });
  } catch (e) { res.status(500).json({ ok: false, error: 'send failed' }); }
});

module.exports = router;
