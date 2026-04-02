'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./schema');

console.log('🌱 Seedowanie...');

// ── Użytkownicy ──────────────────────────────────────────────
const userHash = bcrypt.hashSync(process.env.USER_PASSWORD || 'mistrz2026', 10);
const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin2026', 10);

db.prepare(
  `
  INSERT OR REPLACE INTO app_users (role, password_hash) VALUES (?, ?), (?, ?)
`,
).run('user', userHash, 'admin', adminHash);

// ── Business Units ───────────────────────────────────────────
const insertBU = db.prepare('INSERT OR IGNORE INTO business_units (id, name) VALUES (?, ?)');
[
  ['BU1', 'Business Unit 1'],
  ['BU2', 'Business Unit 2'],
  ['BU3', 'Business Unit 3'],
  ['BU5', 'Business Unit 5'],
].forEach(([id, name]) => insertBU.run(id, name));

// ── Line Units + maszyny ─────────────────────────────────────
const insertLU = db.prepare('INSERT OR IGNORE INTO line_units (id, bu_id, display_order) VALUES (?, ?, ?)');
const insertLine = db.prepare('INSERT OR IGNORE INTO lines (lu_id, line_number, display_order) VALUES (?, ?, ?)');

const luData = [
  { id: '31/41', bu: 'BU1', order: 0, lines: ['31', '41'] },
  { id: '42/44', bu: 'BU1', order: 1, lines: ['42', '44'] },
  { id: '36/46/47', bu: 'BU1', order: 2, lines: ['36', '46', '47'] },
  { id: '32/33', bu: 'BU1', order: 3, lines: ['32', '33'] },
  { id: '34/35/45', bu: 'BU2', order: 0, lines: ['34', '35', '45'] },
  { id: '38/48', bu: 'BU2', order: 1, lines: ['38', '48'] },
  { id: '39/49', bu: 'BU2', order: 2, lines: ['39', '49'] },
  { id: '16/26', bu: 'BU2', order: 3, lines: ['16', '26'] },
  { id: '15/17/18', bu: 'BU3', order: 0, lines: ['15', '17', '18'] },
  { id: '21/22', bu: 'BU3', order: 1, lines: ['21', '22'] },
  { id: '12/25/27/28', bu: 'BU3', order: 2, lines: ['12', '25', '27', '28'] },
  { id: '13/24', bu: 'BU3', order: 3, lines: ['13', '24'] },
  { id: '94/96', bu: 'BU5', order: 0, lines: ['94', '96'] },
];

luData.forEach((lu) => {
  insertLU.run(lu.id, lu.bu, lu.order);
  lu.lines.forEach((line, i) => insertLine.run(lu.id, line, i));
});

// ── Links (tools + spa + quick_links) ────────────────────────
const insertLink = db.prepare(`
  INSERT OR IGNORE INTO links
    (type, link_key, label, url, url_pattern, group_name, is_primary, display_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Narzędzia
[
  ['portal_kierownika', 'Portal Kierownika', '#', 1, 0],
  ['bos', 'BOS', '#', 0, 1],
  ['qbos', 'QBOS', '#', 0, 2],
  ['digiperf', 'DigiPerf', '#', 0, 3],
  ['g42_44_docs', 'G42/44 DOCS', '#', 0, 4],
  ['spa', 'SPA', '#', 0, 5],
  ['lista_zlecen', 'Lista Zleceń', '#', 1, 6],
  ['flagi', 'Flagi', '#', 0, 7],
  ['incydenty', 'Incydenty', '#', 0, 8],
  ['raport_flag', 'Raport Flag', '#', 0, 9],
  ['szkolenia', 'Szkolenia', '#', 0, 10],
  ['zgloszenie_zagr', 'Zgłoszenie Zagrożenia', '#', 0, 11],
  ['andon', 'ANDON', '#', 1, 12],
  ['daily_uptime', 'Daily Uptime', '#', 0, 13],
  ['mes', 'MES', '#', 0, 14],
  ['les', 'LES', '#', 0, 15],
  ['baza_opl', 'Baza OPL', '#', 0, 16],
  ['plan_produkcji', 'Plan Produkcji', '#', 1, 17],
].forEach(([key, label, url, primary, order]) => insertLink.run('tool', key, label, url, null, null, primary, order));

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
  ['multisport', 'MultiSport', '#', null, 5],
  ['udemy', 'Udemy', '#', 'Nauka', 0],
  ['rosetta', 'Rosetta Stone', '#', 'Nauka', 1],
  ['pmi_campus', 'PMI Campus', '#', 'Nauka', 2],
  ['szkolenia_ql', 'Szkolenia', '#', 'Nauka', 3],
].forEach(([key, label, url, group, order]) => insertLink.run('quick_link', key, label, url, null, group, 0, order));

// ── Użytkownik testowy ───────────────────────────────────────
const testHash = bcrypt.hashSync('test123', 10);
db.prepare(
  `
  INSERT OR IGNORE INTO users 
    (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
).run('mrocz', 'Miro', 'Mroczkowski', 'B', '42/44', 'BU1', testHash, 'admin');

const userTestHash = bcrypt.hashSync('user123', 10);
db.prepare(
  `
  INSERT OR IGNORE INTO users 
    (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
).run('testuser', 'Jan', 'Kowalski', 'A', '31/41', 'BU1', userTestHash, 'user');

console.log('✅ Seedowanie zakończone!');
console.log('   Hasło mistrzów:', process.env.USER_PASSWORD || 'mistrz2026');
console.log('   Hasło admina:  ', process.env.ADMIN_PASSWORD || 'admin2026');
