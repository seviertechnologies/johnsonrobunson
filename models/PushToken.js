const mongoose = require('mongoose');

// One row per phone that has the app + granted notifications.
const pushTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  platform: { type: String, default: 'Android' },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.models.PushToken || mongoose.model('PushToken', pushTokenSchema);
