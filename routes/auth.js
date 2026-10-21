const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendResetEmail } = require('../mail');

const router = express.Router();
const sign = user => jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = user => ({ id: user._id, name: user.name, email: user.email });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (await User.findOne({ email: String(email).toLowerCase() })) return res.status(409).json({ error: 'An account with this email already exists.' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user), user: pub(user) });
  } catch (e) { res.status(500).json({ error: 'Registration failed.' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    res.json({ token: sign(user), user: pub(user) });
  } catch (e) { res.status(500).json({ error: 'Login failed.' }); }
});

router.get('/me', async (req, res) => {
  try {
    const token = (req.get('authorization') || '').replace('Bearer ', '');
    const data = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(data.id);
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    res.json({ user: pub(user) });
  } catch (e) { res.status(401).json({ error: 'Session expired. Please log in again.' }); }
});

// Always answers the same way — never reveals whether the email exists.
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (user) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      user.resetCodeHash = await bcrypt.hash(code, 10);   // a new code kills every older code
      user.resetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      try { await sendResetEmail(user.email, code); } catch (e) { console.error('Reset email failed:', e.message); }
    }
    res.json({ ok: true, message: 'If that email has an account, a reset code is on its way.' });
  } catch (e) { res.status(500).json({ error: 'Could not process the request.' }); }
});

router.post('/reset', async (req, res) => {
  try {
    const { email, code, password } = req.body || {};
    if (!email || !code || !password) return res.status(400).json({ error: 'Email, code and a new password are required.' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !user.resetCodeHash || !user.resetExpires || user.resetExpires < new Date())
      return res.status(400).json({ error: 'That code is not valid. Request a fresh one.' });
    if (!(await bcrypt.compare(String(code), user.resetCodeHash)))
      return res.status(400).json({ error: 'That code is not valid. Request a fresh one.' });
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetCodeHash = null; user.resetExpires = null;
    await user.save();
    res.json({ token: sign(user), user: pub(user) });   // auto-login on success
  } catch (e) { res.status(500).json({ error: 'Reset failed.' }); }
});

module.exports = router;
