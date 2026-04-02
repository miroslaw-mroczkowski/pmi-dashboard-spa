'use strict';
const db = require('./index');

db.exec(`
  CREATE TABLE IF NOT EXISTS business_units (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS line_units (
    id            TEXT PRIMARY KEY,
    bu_id         TEXT NOT NULL REFERENCES business_units(id),
    display_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS lines (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    lu_id         TEXT NOT NULL REFERENCES line_units(id),
    line_number   TEXT NOT NULL,
    display_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS links (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    type          TEXT NOT NULL,
    link_key      TEXT UNIQUE NOT NULL,
    label         TEXT NOT NULL,
    url           TEXT DEFAULT '#',
    url_pattern   TEXT,
    group_name    TEXT,
    lu_id         TEXT REFERENCES line_units(id),
    is_primary    INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    active        INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    lu_id      TEXT REFERENCES line_units(id),
    bu_id      TEXT REFERENCES business_units(id),
    role       TEXT NOT NULL,
    brigade    TEXT,
    first_name TEXT,
    last_name  TEXT,
    phone      TEXT
  );

  CREATE TABLE IF NOT EXISTS shift_schedule (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    lu_id     TEXT NOT NULL REFERENCES line_units(id),
    brigade   TEXT NOT NULL,
    work_date TEXT NOT NULL,
    shift     INTEGER NOT NULL,
    UNIQUE(lu_id, brigade, work_date)
  );

  CREATE TABLE IF NOT EXISTS app_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    role          TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    brigade       TEXT NOT NULL,
    lu_id         TEXT REFERENCES line_units(id),
    bu_id         TEXT REFERENCES business_units(id),
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    active        INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS calendar_notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    lu_id        TEXT REFERENCES line_units(id),
    note_date    TEXT NOT NULL,
    title        TEXT,
    content      TEXT NOT NULL,
    visibility   TEXT NOT NULL DEFAULT 'lu_brigade',
    dedicated_to INTEGER REFERENCES users(id),
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    requested_at TEXT DEFAULT (datetime('now')),
    status       TEXT DEFAULT 'pending'
  );
`);

// Migracja — dodaj lu_id do links jeśli nie istnieje
try {
  db.exec(`ALTER TABLE links ADD COLUMN lu_id TEXT REFERENCES line_units(id)`);
  console.log('✅ Migracja: dodano lu_id do tabeli links');
} catch {
  // Kolumna już istnieje — ignoruj
}

console.log('✅ Tabele utworzone');
module.exports = db;
