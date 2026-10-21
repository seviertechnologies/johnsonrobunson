require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const pushRoutes = require('./routes/push');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: process.env.APP_NAME || 'Brand App', db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' });
});
app.use('/api/auth', authRoutes);
app.use('/api/push', pushRoutes);

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log((process.env.APP_NAME || 'Brand App') + ' running at http://localhost:' + PORT));
  })
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
