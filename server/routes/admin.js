'use strict';
const router = require('express').Router();
const db = require('../db/schema');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// ── Users ────────────────────────────────────────────────────

router.get('/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT id, username, first_name, last_name, brigade, lu_id, bu_id, role, active, created_at
     FROM users ORDER BY id`,
    )
    .all();
  res.json(users);
});

router.patch('/users/:id/toggle', (req, res) => {
  const user = db.prepare('SELECT id, active FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
  const newActive = user.active ? 0 : 1;
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(newActive, user.id);
  res.json({ success: true, active: newActive });
});

// ── Links ────────────────────────────────────────────────────

router.get('/links', (req, res) => {
  const links = db
    .prepare(
      `
    SELECT l.*, lg.label as group_label, lg.page as group_page
    FROM links l
    LEFT JOIN link_groups lg ON lg.id = l.group_id
    ORDER BY l.type, l.display_order
  `,
    )
    .all();
  res.json(links);
});

router.post('/links', (req, res) => {
  const { type, link_key, label, url, url_pattern, group_name, group_id, lu_id, is_primary, display_order } = req.body;
  if (!type || !link_key || !label) {
    return res.status(400).json({ error: 'Wymagane: type, link_key, label' });
  }
  const existing = db.prepare('SELECT id FROM links WHERE link_key = ?').get(link_key);
  if (existing) return res.status(400).json({ error: 'link_key już istnieje' });

  const grp = group_id ? db.prepare('SELECT name FROM link_groups WHERE id = ?').get(group_id) : null;

  const result = db
    .prepare(
      `INSERT INTO links (type, link_key, label, url, url_pattern, group_name, group_id, lu_id, is_primary, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      type,
      link_key,
      label,
      url || '#',
      url_pattern || null,
      grp?.name || group_name || null,
      group_id || null,
      lu_id || null,
      is_primary ? 1 : 0,
      display_order || 0,
    );

  res.status(201).json({ id: result.lastInsertRowid });
});

router.patch('/links/:id', (req, res) => {
  const { label, url, url_pattern, group_name, group_id, lu_id, is_primary, display_order, active } = req.body;
  const link = db.prepare('SELECT id FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Nie znaleziono linku' });

  const grp = group_id ? db.prepare('SELECT name FROM link_groups WHERE id = ?').get(group_id) : null;

  db.prepare(
    `UPDATE links SET
       label = COALESCE(?, label),
       url = COALESCE(?, url),
       url_pattern = ?,
       group_name = ?,
       group_id = ?,
       lu_id = ?,
       is_primary = COALESCE(?, is_primary),
       display_order = COALESCE(?, display_order),
       active = COALESCE(?, active)
     WHERE id = ?`,
  ).run(
    label,
    url,
    url_pattern ?? null,
    grp?.name || group_name || null,
    group_id || null,
    lu_id ?? null,
    is_primary != null ? (is_primary ? 1 : 0) : null,
    display_order,
    active != null ? (active ? 1 : 0) : null,
    req.params.id,
  );

  res.json({ success: true });
});

router.delete('/links/:id', (req, res) => {
  const link = db.prepare('SELECT id FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Nie znaleziono linku' });
  db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Reset requests ───────────────────────────────────────────

router.get('/reset-requests', (req, res) => {
  const requests = db
    .prepare(
      `SELECT pr.id, pr.user_id, pr.requested_at, pr.status,
            u.username, u.first_name, u.last_name
     FROM password_reset_requests pr
     JOIN users u ON u.id = pr.user_id
     ORDER BY pr.requested_at DESC`,
    )
    .all();
  res.json(requests);
});

router.patch('/reset-requests/:id', (req, res) => {
  const { status } = req.body;
  if (!['done', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status musi być: done lub rejected' });
  }
  db.prepare('UPDATE password_reset_requests SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// ── Stats ────────────────────────────────────────────────────

router.get('/stats', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE active = 1').get().count;
  const links = db.prepare('SELECT COUNT(*) as count FROM links').get().count;
  const pendingResets = db
    .prepare("SELECT COUNT(*) as count FROM password_reset_requests WHERE status = 'pending'")
    .get().count;
  res.json({ users, activeUsers, links, pendingResets });
});

// GET /api/admin/activity — ostatnia aktywność
router.get('/activity', (req, res) => {
  const recentUsers = db
    .prepare(
      `SELECT id, username, first_name, last_name, role, created_at
     FROM users ORDER BY created_at DESC LIMIT 5`,
    )
    .all();

  const recentLinks = db
    .prepare(
      `SELECT id, label, type, group_name, updated_at
     FROM links ORDER BY updated_at DESC LIMIT 5`,
    )
    .all();

  const recentLogins = db
    .prepare(
      `SELECT l.username, l.logged_at, u.first_name, u.last_name
     FROM login_log l
     LEFT JOIN users u ON u.username = l.username
     ORDER BY l.logged_at DESC LIMIT 5`,
    )
    .all();

  res.json({ recentUsers, recentLinks, recentLogins });
});

// PATCH /api/admin/users/:id — edytuj użytkownika
router.patch('/users/:id', (req, res) => {
  const { first_name, last_name, brigade, lu_id, bu_id, role, password } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });

  if (password) {
    const bcrypt = require('bcryptjs');
    const password_hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.params.id);
  }

  db.prepare(
    `
    UPDATE users SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      brigade = COALESCE(?, brigade),
      lu_id = ?,
      bu_id = ?,
      role = COALESCE(?, role)
    WHERE id = ?
  `,
  ).run(first_name, last_name, brigade, lu_id || null, bu_id || null, role, req.params.id);

  res.json({ success: true });
});

// ── Link Groups ──────────────────────────────────────────────

// GET /api/admin/groups
router.get('/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM link_groups ORDER BY page, display_order').all();
  res.json(groups);
});

// POST /api/admin/groups
router.post('/groups', (req, res) => {
  const { name, label, icon, page, display_order } = req.body;
  if (!name || !label || !page) {
    return res.status(400).json({ error: 'Wymagane: name, label, page' });
  }
  const existing = db.prepare('SELECT id FROM link_groups WHERE name = ?').get(name);
  if (existing) return res.status(400).json({ error: 'Grupa już istnieje' });

  const result = db
    .prepare('INSERT INTO link_groups (name, label, icon, page, display_order) VALUES (?, ?, ?, ?, ?)')
    .run(name, label, icon || 'layout-grid', page, display_order || 0);

  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH /api/admin/groups/:id
router.patch('/groups/:id', (req, res) => {
  const { label, icon, page, display_order } = req.body;
  const group = db.prepare('SELECT id FROM link_groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Nie znaleziono grupy' });

  db.prepare(
    `
    UPDATE link_groups SET
      label = COALESCE(?, label),
      icon = COALESCE(?, icon),
      page = COALESCE(?, page),
      display_order = COALESCE(?, display_order)
    WHERE id = ?
  `,
  ).run(label, icon, page, display_order, req.params.id);

  res.json({ success: true });
});

// DELETE /api/admin/groups/:id
router.delete('/groups/:id', (req, res) => {
  const group = db.prepare('SELECT id FROM link_groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Nie znaleziono grupy' });
  // Odłącz linki od tej grupy
  db.prepare('UPDATE links SET group_id = NULL, group_name = NULL WHERE group_id = ?').run(req.params.id);
  db.prepare('DELETE FROM link_groups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/admin/structure — BU i LU do dropdownów
router.get('/structure', (req, res) => {
  const bus = db.prepare('SELECT * FROM business_units ORDER BY id').all();
  const lus = db.prepare('SELECT * FROM line_units ORDER BY bu_id, display_order').all();
  res.json({ bus, lus });
});

module.exports = router;
