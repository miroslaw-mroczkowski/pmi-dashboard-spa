'use strict';
const router = require('express').Router();
const db = require('../db/schema');

router.get('/', (req, res) => {
  try {
    const all = db.prepare('SELECT * FROM links WHERE active=1 ORDER BY type, display_order').all();
    const groups = db.prepare('SELECT * FROM link_groups ORDER BY page, display_order').all();

    // Narzędzia — pogrupowane po group_id
    const tools = all
      .filter((l) => l.type === 'tool')
      .map((l) => ({
        id: l.link_key,
        label: l.label,
        url: l.url,
        primary: !!l.is_primary,
        group: l.group_name || null,
        group_id: l.group_id || null,
      }))
      .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));

    // Raporty
    const reports = all
      .filter((l) => l.type === 'report')
      .map((l) => ({
        id: l.link_key,
        label: l.label,
        url: l.url,
        primary: !!l.is_primary,
        group: l.group_name || null,
        group_id: l.group_id || null,
      }))
      .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));

    // SPA
    const spaLinks = all
      .filter((l) => l.type === 'spa')
      .map((l) => ({
        id: l.link_key,
        label: l.label,
        urlPattern: l.url_pattern,
      }));

    // Quick links — pogrupowane po group_name
    const quickRaw = all.filter((l) => l.type === 'quick_link');
    const sidebarGroups = groups.filter((g) => g.page === 'sidebar');
    const quickGroups = [];
    const seen = {};

    // Najpierw grupy z link_groups (zachowaj kolejność)
    sidebarGroups.forEach((g) => {
      const links = quickRaw.filter((l) => l.group_id === g.id || l.group_name === g.name);
      if (links.length) {
        quickGroups.push({
          label: g.label,
          links: links.map((l) => ({ id: l.link_key, label: l.label, url: l.url })),
        });
        seen[g.id] = true;
        seen[g.name] = true;
      }
    });

    // Linki bez grupy — dodaj do pierwszej grupy sidebar lub pomiń
    const noGroup = quickRaw.filter((l) => !seen[l.group_id] && !seen[l.group_name]);
    if (noGroup.length && sidebarGroups.length) {
      const defaultGroup = sidebarGroups[0];
      let existing = quickGroups.find((g) => g.label === defaultGroup.label);
      if (!existing) {
        existing = { label: defaultGroup.label, links: [] };
        quickGroups.unshift(existing);
      }
      noGroup.forEach((l) => existing.links.push({ id: l.link_key, label: l.label, url: l.url }));
    }

    // Grupy dla dashboardu i raportów (do renderowania boxów)
    const dashboardGroups = groups
      .filter((g) => g.page === 'dashboard')
      .map((g) => ({
        ...g,
        links: tools.filter((t) => t.group_name === g.name || t.group_id === g.id),
      }));

    const reportGroups = groups
      .filter((g) => g.page === 'reports')
      .map((g) => ({
        ...g,
        links: reports.filter((r) => r.group_name === g.name || r.group_id === g.id),
      }));

    res.json({ tools, reports, spaLinks, quickLinkGroups: quickGroups, dashboardGroups, reportGroups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
