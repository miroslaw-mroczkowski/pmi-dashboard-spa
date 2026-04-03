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

// ── Business Units ───────────────────────────────────────────
const insertBU = db.prepare('INSERT OR IGNORE INTO business_units (id, name) VALUES (?, ?)');
[
  ['BU1', 'Business Unit 1'],
  ['BU2', 'Business Unit 2'],
  ['BU3', 'Business Unit 3'],
  ['BU5', 'Business Unit 5'],
].forEach(([id, name]) => insertBU.run(id, name));

// ── Line Units + linie ───────────────────────────────────────
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

// ── Links ────────────────────────────────────────────────────
const insertLink = db.prepare(`
  INSERT OR IGNORE INTO links
    (type, link_key, label, url, url_pattern, group_name, is_primary, display_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Narzędzia
[
  [
    'portal_kierownika',
    'Portal Kierownika',
    'http://lesmes.pl.pmi/Apriso/Start/logon.html?TabID=0&track=client',
    null,
    1,
    0,
    'Produkcja',
  ],
  ['bos', 'BOS', 'https://app.pmidigiperf.com/bos/surveys/active', null, 0, 1, 'Codzienne'],
  ['qbos', 'QBOS', 'https://app.pmidigiperf.com/qbos/surveys/active', null, 0, 2, 'Codzienne'],
  ['digiperf', 'DigiPerf', '#', null, 0, 3, 'Codzienne'],
  ['g42_44_docs', 'G42/44 DOCS', '#', null, 0, 4, null],
  [
    'lista_zlecen',
    'Lista Zleceń',
    'https://ssrs_prd.plkrk.dbaas.sdi.pmi/prd/report/PLM/PMPL/Production/Secondary/SupervisorPortal',
    null,
    1,
    5,
    'Produkcja',
  ],
  ['flagi', 'Flagi', '#', null, 0, 6, 'Jakość'],
  ['incydenty', 'Incydenty', 'https://zglosincydent.pl.pmi/?CurrentPage=1', null, 0, 7, 'Jakość'],
  ['raport_flag', 'Raport Flag', '#', null, 0, 8, 'Jakość'],
  [
    'szkolenia',
    'Szkolenia',
    'https://philipmor.plateau.com/learning/user/personal/landOnPortalHome.do',
    null,
    0,
    9,
    null,
  ],
  ['zgloszenie_zagr', 'Zgłoszenie Zagrożenia', '#', null, 0, 10, null],
  [
    'andon',
    'ANDON',
    'https://ssrs_prd.plkrk.dbaas.sdi.pmi/prd/report/PLM/PMPL/Production/Secondary/AndonForTL_MTBF',
    null,
    1,
    11,
    'Produkcja',
  ],
  ['daily_uptime', 'Daily Uptime', '#', null, 0, 12, null],
  [
    'mes',
    'MES',
    'https://ssrs_prd.plkrk.dbaas.sdi.pmi/prd/report/PLM/PMPL/Production/ReportDashboard',
    null,
    0,
    13,
    'Produkcja',
  ],
  [
    'les',
    'LES',
    'https://ssrs_prd.plkrk.dbaas.sdi.pmi/prd/report/PLM/PMPL/Logistic/LES_PORTAL',
    null,
    0,
    14,
    'Produkcja',
  ],
  [
    'baza_opl',
    'Baza OPL',
    'https://pmicloud.sharepoint.com/sites/RefBazaOPL/BazaOPLSecondary_BazaOPL/Forms/View%202.aspx',
    null,
    0,
    15,
    null,
  ],
  [
    'plan_produkcji',
    'Plan Produkcji',
    'https://app.powerbi.com/groups/18ebb9ee-9b16-4ac0-abaa-61ad1433a751/rdlreports/8a4b7de5-5005-43d7-9795-6db210f98956?experience=power-bi',
    null,
    1,
    16,
    'Produkcja',
  ],
].forEach(([key, label, url, pattern, primary, order, group]) =>
  insertLink.run('tool', key, label, url, pattern, group, primary, order),
);

// SPA
[
  [
    'spa_life',
    'SPA Life',
    '#',
    'https://ots.spappa.aws.private-pmideep.biz/db.aspx?table=SPA_LiveCockpit&eoa=x&act=query&db_Line=PL02-SE-CP-L0{lu}',
    0,
  ],
  [
    'spa_shifts',
    'SPA Shifts',
    '#',
    'https://ots.spappa.aws.private-pmideep.biz/db.aspx?table=SPA_ShiftPO_Overview&eoa=x&act=query&db_Line=PL02-SE-CP-L0{lu}',
    1,
  ],
].forEach(([key, label, url, pattern, order]) => insertLink.run('spa', key, label, url, pattern, null, 0, order));

// Quick Links
[
  ['mypmi', 'MyPMI', 'https://mypmi.my.site.com/s/', null, 0],
  ['my_pc', 'My P&C', 'https://performancemanager.successfactors.eu/sf/home?company=PMIProd', null, 1],
  ['interact', 'InteracT', 'https://pmiprod.service-now.com/interact', null, 2],
  ['one_poland', 'One Poland', 'https://pmicloud.sharepoint.com/sites/RefPoland', null, 3],
  ['czas_pracy', 'Czas Pracy', '#', null, 4],
  ['urlopy', 'Urlopy', 'https://mypmi.my.site.com/s/team-leave-and-absences', null, 5],
  ['multisport', 'MultiSport', 'https://www.emultisport.pl/dashboard', null, 6],
  ['udemy', 'Udemy', 'https://pmi.udemy.com/', 'Nauka', 0],
  ['rosetta', 'Rosetta Stone', 'https://pmi.fuseuniversal.com/communities/21541/contents/1036207', 'Nauka', 1],
  ['pmi_campus', 'PMI Campus', 'https://pmi.fuseuniversal.com/', 'Nauka', 2],
  ['szkolenia_ql', 'Szkolenia', 'https://philipmor.plateau.com/learning/user/personal/landOnPortalHome.do', 'Nauka', 3],
].forEach(([key, label, url, group, order]) => insertLink.run('quick_link', key, label, url, null, group, 0, order));

// ── Użytkownicy testowi ──────────────────────────────────────
const testAdminHash = bcrypt.hashSync('test123', 10);
db.prepare(
  `
  INSERT OR IGNORE INTO users
    (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
).run('mrocz', 'Miro', 'Mroczkowski', 'B', '42/44', 'BU1', testAdminHash, 'admin');

const testUserHash = bcrypt.hashSync('user123', 10);
db.prepare(
  `
  INSERT OR IGNORE INTO users
    (username, first_name, last_name, brigade, lu_id, bu_id, password_hash, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
).run('testuser', 'Jan', 'Kowalski', 'A', '31/41', 'BU1', testUserHash, 'user');

// ── Migracja grup narzędzi ────────────────────────────────
const groupUpdates = [
  ['Produkcja', ['portal_kierownika', 'lista_zlecen', 'andon', 'plan_produkcji', 'mes', 'les']],
  ['Codzienne', ['bos', 'qbos', 'digiperf']],
  ['Jakość', ['incydenty', 'raport_flag', 'flagi']],
];
groupUpdates.forEach(([group, keys]) => {
  keys.forEach((key) => {
    db.prepare('UPDATE links SET group_name = ? WHERE link_key = ? AND group_name IS NULL').run(group, key);
  });
});
console.log('✅ Grupy narzędzi zaktualizowane');

console.log('✅ Seedowanie zakończone!');
console.log('   Admin:  mrocz / test123');
console.log('   User:   testuser / user123');
