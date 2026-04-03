'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Na produkcji użyj /data (Railway/Render persistent disk)
// Lokalnie użyj głównego folderu projektu
const dbDir = process.env.NODE_ENV === 'production' ? '/data' : path.join(__dirname, '../../');

// Utwórz folder jeśli nie istnieje
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

console.log(`✅ SQLite połączony: ${dbPath}`);

module.exports = db;
