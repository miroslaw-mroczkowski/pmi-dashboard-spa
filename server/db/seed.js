'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./schema');

console.log('🌱 Seedowanie...');

// ── Użytkownicy app ──────────────────────────────────────────
const userHash = bcrypt.hashSync(process.env.USER_PASSWORD || 'mistrz2026', 10);
const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin2026', 10);
db.prepare(`INSERT OR REPLACE INTO app_users (role, password_hash) VALUES (?, ?), (?, ?)`).run(
  'user',
  userHash,
  'admin',
  adminHash,
);

// ── Działy ───────────────────────────────────────────────────
const insertBU = db.prepare('INSERT OR IGNORE INTO business_units (id, name) VALUES (?, ?)');
[
  ['DA', 'Dział A'],
  ['DB', 'Dział B'],
  ['DC', 'Dział C'],
  ['DD', 'Dział D'],
].forEach(([id, name]) => insertBU.run(id, name));

// ── Celki + linie ─────────────────────────────────────────────
const insertLU = db.prepare('INSERT OR IGNORE INTO line_units (id, bu_id, display_order) VALUES (?, ?, ?)');
const insertLine = db.prepare('INSERT OR IGNORE INTO lines (lu_id, line_number, display_order) VALUES (?, ?, ?)');

const luData = [
  { id: 'A1/A2', bu: 'DA', order: 0, lines: ['11', '12'] },
  { id: 'A3/A4', bu: 'DA', order: 1, lines: ['13', '14'] },
  { id: 'A5/A6/A7', bu: 'DA', order: 2, lines: ['15', '16', '17'] },
  { id: 'A8/A9', bu: 'DA', order: 3, lines: ['18', '19'] },
  { id: 'B1/B2/B3', bu: 'DB', order: 0, lines: ['21', '22', '23'] },
  { id: 'B4/B5', bu: 'DB', order: 1, lines: ['24', '25'] },
  { id: 'B6/B7', bu: 'DB', order: 2, lines: ['26', '27'] },
  { id: 'B8/B9', bu: 'DB', order: 3, lines: ['28', '29'] },
  { id: 'C1/C2/C3', bu: 'DC', order: 0, lines: ['31', '32', '33'] },
  { id: 'C4/C5', bu: 'DC', order: 1, lines: ['34', '35'] },
  { id: 'C6/C7/C8/C9', bu: 'DC', order: 2, lines: ['36', '37', '38', '39'] },
  { id: 'C10/C11', bu: 'DC', order: 3, lines: ['40', '41'] },
  { id: 'D1/D2', bu: 'DD', order: 0, lines: ['51', '52'] },
];

luData.forEach((lu) => {
  insertLU.run(lu.id, lu.bu, lu.order);
  lu.lines.forEach((line, i) => insertLine.run(lu.id, line, i));
});

// ── Grupy linków ─────────────────────────────────────────────
const insertGroup = db.prepare(`
  INSERT OR IGNORE INTO link_groups (name, label, icon, page, display_order)
  VALUES (?, ?, ?, ?, ?)
`);
[
  ['Produkcja', 'Produkcja', 'factory', 'dashboard', 0],
  ['Codzienne', 'Codzienne', 'check-square', 'dashboard', 1],
  ['Jakość', 'Jakość & BHP', 'shield-check', 'dashboard', 2],
  ['Raporty', 'Raporty', 'bar-chart-2', 'reports', 0],
  ['Szybkie', 'Quick Links', 'link', 'sidebar', 0],
  ['Nauka', 'Nauka', 'book-open', 'sidebar', 1],
].forEach(([name, label, icon, page, order]) => insertGroup.run(name, label, icon, page, order));

// ── Linki ─────────────────────────────────────────────────────
const insertLink = db.prepare(`
  INSERT OR IGNORE INTO links
    (type, link_key, label, url, url_pattern, group_name, is_primary, display_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Narzędzia
[
  ['portal_kierownika', 'Portal Kierownika', '#', null, 1, 0, 'Produkcja'],
  ['lista_zlecen', 'Lista Zleceń', '#', null, 1, 1, 'Produkcja'],
  ['andon', 'ANDON', '#', null, 1, 2, 'Produkcja'],
  ['plan_produkcji', 'Plan Produkcji', '#', null, 1, 3, 'Produkcja'],
  ['mes', 'MES', '#', null, 0, 4, 'Produkcja'],
  ['les', 'LES', '#', null, 0, 5, 'Produkcja'],
  ['bos', 'BOS', '#', null, 0, 6, 'Codzienne'],
  ['qbos', 'QBOS', '#', null, 0, 7, 'Codzienne'],
  ['digiperf', 'DigiPerf', '#', null, 0, 8, 'Codzienne'],
  ['daily_uptime', 'Daily Uptime', '#', null, 0, 9, 'Codzienne'],
  ['incydenty', 'Incydenty', '#', null, 0, 10, 'Jakość'],
  ['flagi', 'Flagi', '#', null, 0, 11, 'Jakość'],
  ['raport_flag', 'Raport Flag', '#', null, 0, 12, 'Jakość'],
  ['szkolenia', 'Szkolenia', '#', null, 0, 13, null],
  ['zgloszenie_zagr', 'Zgłoszenie Zagrożenia', '#', null, 0, 14, null],
  ['g42_44_docs', 'G42/44 DOCS', '#', null, 0, 15, null],
  ['baza_opl', 'Baza OPL', '#', null, 0, 16, null],
  ['spa_tool', 'SPA', '#', null, 0, 17, null],
].forEach(([key, label, url, pattern, primary, order, group]) =>
  insertLink.run('tool', key, label, url, pattern, group, primary, order),
);

// SPA
[
  ['spa_life', 'SPA Life', '#', 'https://spa-system/life/{lu}', 0],
  ['spa_shifts', 'SPA Shifts', '#', 'https://spa-system/shifts/{lu}', 1],
].forEach(([key, label, url, pattern, order]) => insertLink.run('spa', key, label, url, pattern, null, 0, order));

// Quick Links
[
  ['mypmi', 'MyPMI', '#', null, 0],
  ['my_pc', 'My P&C', '#', null, 1],
  ['interact', 'InteracT', '#', null, 2],
  ['one_poland', 'One Poland', '#', null, 3],
  ['czas_pracy', 'Czas Pracy', '#', null, 4],
  ['urlopy', 'Urlopy', '#', null, 5],
  ['multisport', 'MultiSport', '#', null, 6],
  ['udemy', 'Udemy', '#', 'Nauka', 0],
  ['rosetta', 'Rosetta Stone', '#', 'Nauka', 1],
  ['pmi_campus', 'PMI Campus', '#', 'Nauka', 2],
  ['szkolenia_ql', 'Szkolenia', '#', 'Nauka', 3],
].forEach(([key, label, url, group, order]) => insertLink.run('quick_link', key, label, url, null, group, 0, order));

// ── Użytkownicy testowi ───────────────────────────────────────
const testAdminHash = bcrypt.hashSync('test123', 10);
db.prepare(
  `
  INSERT OR IGNORE INTO users
    (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
).run('mrocz', 'Miro', 'Mroczkowski', 'B', 'A3/A4', 'DA', testAdminHash, 'admin');

const testUserHash = bcrypt.hashSync('user123', 10);
db.prepare(
  `
  INSERT OR IGNORE INTO users
    (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
).run('testuser', 'Jan', 'Kowalski', 'A', 'A1/A2', 'DA', testUserHash, 'user');

// ── Migracja grup ─────────────────────────────────────────────
const groupUpdates = [
  ['Produkcja', ['portal_kierownika', 'lista_zlecen', 'andon', 'plan_produkcji', 'mes', 'les']],
  ['Codzienne', ['bos', 'qbos', 'digiperf', 'daily_uptime']],
  ['Jakość', ['incydenty', 'flagi', 'raport_flag']],
];
groupUpdates.forEach(([group, keys]) => {
  keys.forEach((key) => {
    db.prepare('UPDATE links SET group_name = ? WHERE link_key = ? AND group_name IS NULL').run(group, key);
  });
});
console.log('✅ Grupy zaktualizowane');

// ── Synchronizuj group_id z group_name ───────────────────────
const allGroups = db.prepare('SELECT id, name FROM link_groups').all();
allGroups.forEach((g) => {
  db.prepare('UPDATE links SET group_id = ? WHERE group_name = ? AND group_id IS NULL').run(g.id, g.name);
});
console.log('✅ group_id zsynchronizowane');

console.log('✅ Seedowanie zakończone!');
console.log('   Admin:   mrocz / test123');
console.log('   Mistrz:  testuser / user123');
