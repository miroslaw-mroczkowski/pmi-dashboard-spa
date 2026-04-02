'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/schema');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Wymagane: username i password' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      brigade: user.brigade,
      lu_id: user.lu_id,
      bu_id: user.bu_id,
      first_name: user.first_name,
      last_name: user.last_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      brigade: user.brigade,
      lu_id: user.lu_id,
      bu_id: user.bu_id,
      first_name: user.first_name,
      last_name: user.last_name,
    },
  });
});

// POST /api/auth/register (tylko admin)
router.post('/register', require('../middleware/auth').requireAdmin, (req, res) => {
  const { username, first_name, last_name, brigade, lu_id, bu_id, password, role } = req.body;

  if (!username || !first_name || !last_name || !brigade || !password) {
    return res.status(400).json({ error: 'Brakuje wymaganych pól' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: 'Username już zajęty' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      `
    INSERT INTO users (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role || 'user');

  res.status(201).json({ id: result.lastInsertRowid, username });
});

module.exports = router;
