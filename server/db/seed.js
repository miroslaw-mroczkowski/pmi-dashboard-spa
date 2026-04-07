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
  ['D1', 'Dział Produkcji A'],
  ['D2', 'Dział Produkcji B'],
  ['D3', 'Dział Pakowania'],
  ['D4', 'Dział Technicznego'],
].forEach(([id, name]) => insertBU.run(id, name));

// ── Celki + linie ─────────────────────────────────────────────
const insertLU = db.prepare('INSERT OR IGNORE INTO line_units (id, bu_id, display_order) VALUES (?, ?, ?)');
const insertLine = db.prepare('INSERT OR IGNORE INTO lines (lu_id, line_number, display_order) VALUES (?, ?, ?)');

const luData = [
  { id: 'L01/L02', bu: 'D1', order: 0, lines: ['01', '02'] },
  { id: 'L03/L04', bu: 'D1', order: 1, lines: ['03', '04'] },
  { id: 'L05/L06/L07', bu: 'D1', order: 2, lines: ['05', '06', '07'] },
  { id: 'L08/L09', bu: 'D1', order: 3, lines: ['08', '09'] },
  { id: 'L11/L12/L13', bu: 'D2', order: 0, lines: ['11', '12', '13'] },
  { id: 'L14/L15', bu: 'D2', order: 1, lines: ['14', '15'] },
  { id: 'L16/L17', bu: 'D2', order: 2, lines: ['16', '17'] },
  { id: 'L18/L19', bu: 'D2', order: 3, lines: ['18', '19'] },
  { id: 'L21/L22/L23', bu: 'D3', order: 0, lines: ['21', '22', '23'] },
  { id: 'L24/L25', bu: 'D3', order: 1, lines: ['24', '25'] },
  { id: 'L26/L27/L28/L29', bu: 'D3', order: 2, lines: ['26', '27', '28', '29'] },
  { id: 'L30/L31', bu: 'D3', order: 3, lines: ['30', '31'] },
  { id: 'L41/L42', bu: 'D4', order: 0, lines: ['41', '42'] },
];

luData.forEach((lu) => {
  insertLU.run(lu.id, lu.bu, lu.order);
  lu.lines.forEach((line, i) => insertLine.run(lu.id, line, i));
});

// ── Grupy linków ──────────────────────────────────────────────
const insertGroup = db.prepare(`
  INSERT OR IGNORE INTO link_groups (name, label, icon, page, display_order)
  VALUES (?, ?, ?, ?, ?)
`);
[
  ['Produkcja', 'Produkcja', 'factory', 'dashboard', 0],
  ['Codzienne', 'Codzienne', 'check-square', 'dashboard', 1],
  ['Jakość', 'Jakość & BHP', 'shield-check', 'dashboard', 2],
  ['Raporty', 'Raporty', 'bar-chart-2', 'reports', 0],
  ['Szybkie', 'Szybkie linki', 'link', 'sidebar', 0],
  ['Nauka', 'Nauka', 'book-open', 'sidebar', 1],
].forEach(([name, label, icon, page, order]) => insertGroup.run(name, label, icon, page, order));

// ── Linki — narzędzia ─────────────────────────────────────────
const insertLink = db.prepare(`
  INSERT OR IGNORE INTO links
    (type, link_key, label, url, url_pattern, group_name, is_primary, display_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

[
  ['panel_kierownika', 'Panel Kierownika', '#', null, 1, 0, 'Produkcja'],
  ['lista_zlecen', 'Lista Zleceń', '#', null, 1, 1, 'Produkcja'],
  ['tablica_alertow', 'Tablica Alertów', '#', null, 1, 2, 'Produkcja'],
  ['plan_produkcji', 'Plan Produkcji', '#', null, 1, 3, 'Produkcja'],
  ['system_produkcji', 'System Produkcji', '#', null, 0, 4, 'Produkcja'],
  ['system_logistyki', 'System Logistyki', '#', null, 0, 5, 'Produkcja'],
  ['ankieta_bhp', 'Ankieta BHP', '#', null, 0, 6, 'Codzienne'],
  ['ankieta_jakosci', 'Ankieta Jakości', '#', null, 0, 7, 'Codzienne'],
  ['monitor_wydajnosci', 'Monitor Wydajności', '#', null, 0, 8, 'Codzienne'],
  ['raport_dzienny', 'Raport Dzienny', '#', null, 0, 9, 'Codzienne'],
  ['raport_zmianowy', 'Raport Zmianowy', '#', null, 0, 10, 'Codzienne'],
  ['kokpit_jakosci', 'Kokpit Jakości', '#', null, 0, 11, 'Jakość'],
  ['zgloszenie_uster', 'Zgłoszenie Usterki', '#', null, 0, 12, 'Jakość'],
  ['rejestr_niezg', 'Rejestr Niezgodności', '#', null, 0, 13, 'Jakość'],
  ['szkolenia_bhp', 'Szkolenia BHP', '#', null, 0, 14, null],
  ['zgloszenie_zagr', 'Zgłoszenie Zagrożenia', '#', null, 0, 15, null],
  ['dokumentacja', 'Dokumentacja', '#', null, 0, 16, null],
  ['baza_wiedzy', 'Baza Wiedzy', '#', null, 0, 17, null],
].forEach(([key, label, url, pattern, primary, order, group]) =>
  insertLink.run('tool', key, label, url, pattern, group, primary, order),
);

// SPA
[
  ['spa_life', 'SPA Life', '#', 'https://spa-system/life/{lu}', 0],
  ['spa_shifts', 'SPA Shifts', '#', 'https://spa-system/shifts/{lu}', 1],
].forEach(([key, label, url, pattern, order]) => insertLink.run('spa', key, label, url, pattern, null, 0, order));

// Quick links
[
  ['portal_pracownika', 'Portal Pracownika', '#', 'Szybkie', 0],
  ['moj_grafik', 'Mój Grafik', '#', 'Szybkie', 1],
  ['intranet', 'Intranet', '#', 'Szybkie', 2],
  ['czas_pracy', 'Czas Pracy', '#', 'Szybkie', 3],
  ['urlopy', 'Urlopy', '#', 'Szybkie', 4],
  ['benefity', 'Benefity', '#', 'Szybkie', 5],
  ['platforma_szkolen', 'Platforma Szkoleń', '#', 'Nauka', 0],
  ['kursy_online', 'Kursy Online', '#', 'Nauka', 1],
  ['biblioteka', 'Biblioteka', '#', 'Nauka', 2],
  ['certyfikaty', 'Certyfikaty', '#', 'Nauka', 3],
].forEach(([key, label, url, group, order]) => insertLink.run('quick_link', key, label, url, null, group, 0, order));

// ── Użytkownicy testowi ───────────────────────────────────────
const adminPwd = bcrypt.hashSync('test123', 10);
const userPwd = bcrypt.hashSync('user123', 10);

db.prepare(
  `
  INSERT OR IGNORE INTO users
    (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
).run('admin', 'Adam', 'Nowak', 'B', 'L03/L04', 'D1', adminPwd, 'admin');

db.prepare(
  `
  INSERT OR IGNORE INTO users
    (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
).run('operator', 'Jan', 'Kowalski', 'A', 'L01/L02', 'D1', userPwd, 'user');

// ── Synchronizuj group_id ─────────────────────────────────────
const allGroups = db.prepare('SELECT id, name FROM link_groups').all();
allGroups.forEach((g) => {
  db.prepare('UPDATE links SET group_id = ? WHERE group_name = ? AND group_id IS NULL').run(g.id, g.name);
});

// Przypisz quick_linki bez group_id do grupy Szybkie
const szybkieGroup = db.prepare("SELECT id FROM link_groups WHERE name = 'Szybkie'").get();
if (szybkieGroup) {
  db.prepare(
    `UPDATE links SET group_id = ?, group_name = 'Szybkie'
    WHERE type = 'quick_link' AND group_id IS NULL`,
  ).run(szybkieGroup.id);
}

console.log('✅ Seedowanie zakończone!');
console.log('   Admin:    admin / test123');
console.log('   Operator: operator / user123');
