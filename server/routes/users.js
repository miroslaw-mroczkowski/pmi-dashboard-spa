'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db/schema');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// POST /api/users/change-password — user changes own password
router.post('/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Wymagane: oldPassword i newPassword' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Nowe hasło musi mieć minimum 6 znaków' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  const valid = bcrypt.compareSync(oldPassword, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Stare hasło jest nieprawidłowe' });

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);

  res.json({ success: true });
});

// POST /api/users/reset-password/:id — admin resets user password
router.post('/reset-password/:id', requireAdmin, (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Hasło musi mieć minimum 6 znaków' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.params.id);

  res.json({ success: true });
});

// POST /api/users/request-reset — user requests password reset
router.post('/request-reset', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Wymagany: username' });

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  db.prepare(
    `
    INSERT INTO password_reset_requests (user_id) VALUES (?)
  `,
  ).run(user.id);

  res.json({ success: true });
});

module.exports = router;
