'use strict';
require('dotenv').config();

// Auto-seed przy starcie
try {
  require('./db/seed.js');
  console.log('✅ Seed wykonany');
} catch (err) {
  console.error('❌ Seed error:', err.message);
  console.error(err.stack);
}

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Wyłącz cache dla API
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/structure', require('./routes/structure'));
app.use('/api/links', require('./routes/links'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PMI Dashboard działa!' });
});

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serwer uruchomiony na http://localhost:${PORT}`);
});
