'use strict';
const router = require('express').Router();
const db = require('../db/schema');

// GET /api/links
router.get('/', (req, res) => {
  try {
    const all = db.prepare('SELECT * FROM links WHERE active=1 ORDER BY type, display_order').all();

    // Narzędzia
    const tools = all
      .filter((l) => l.type === 'tool')
      .map((l) => ({
        id: l.link_key,
        label: l.label,
        url: l.url,
        primary: !!l.is_primary,
      }));

    // SPA
    const spaLinks = all
      .filter((l) => l.type === 'spa')
      .map((l) => ({
        id: l.link_key,
        label: l.label,
        urlPattern: l.url_pattern,
      }));

    // Quick links — pogrupowane
    const quickRaw = all.filter((l) => l.type === 'quick_link');
    const groups = [];
    const seen = {};

    for (const row of quickRaw) {
      const key = row.group_name || '__none__';
      if (!seen[key]) {
        seen[key] = true;
        groups.push({ label: row.group_name, links: [] });
      }
      groups
        .find((g) => (g.label || '__none__') === key)
        .links.push({ id: row.link_key, label: row.label, url: row.url });
    }

    res.json({ tools, spaLinks, quickLinkGroups: groups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
