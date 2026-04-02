'use strict';
const Database = require('better-sqlite3');
const path = require('path');

// Tworzy plik database.db w głównym folderze projektu
const db = new Database(path.join(__dirname, '../../database.db'));

// WAL mode - lepsza wydajność przy wielu zapytaniach
db.pragma('journal_mode = WAL');

console.log('✅ SQLite połączony');

module.exports = db;
