'use strict';
const router = require('express').Router();
const db = require('../db/schema');

// GET /api/links
router.get('/', (req, res) => {
  try {
    const all = db.prepare('SELECT * FROM links WHERE active=1 ORDER BY type, display_order').all();

    // Narzędzia — pogrupowane po group_name
    const toolsRaw = all.filter((l) => l.type === 'tool');
    const toolGroups = {};
    const toolsNoGroup = [];

    toolsRaw.forEach((l) => {
      const tool = {
        id: l.link_key,
        label: l.label,
        url: l.url,
        primary: !!l.is_primary,
        group: l.group_name || null,
      };
      if (l.group_name) {
        if (!toolGroups[l.group_name]) toolGroups[l.group_name] = [];
        toolGroups[l.group_name].push(tool);
      } else {
        toolsNoGroup.push(tool);
      }
    });

    // Zwróć jako płaską listę z group_name (ui.js sam grupuje)
    const tools = toolsRaw.map((l) => ({
      id: l.link_key,
      label: l.label,
      url: l.url,
      primary: !!l.is_primary,
      group: l.group_name || null,
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

    // Raporty
    const reports = all
      .filter((l) => l.type === 'report')
      .map((l) => ({
        id: l.link_key,
        label: l.label,
        url: l.url,
        primary: !!l.is_primary,
        group: l.group_name || null,
      }));

    res.json({ tools, spaLinks, quickLinkGroups: groups, reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
