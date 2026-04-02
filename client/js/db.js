'use strict';

/* ============================================================
   db.js — IndexedDB wrapper (pmi_dashboard / settings)
   ============================================================ */

const DB_NAME = 'pmi_dashboard';
const DB_VER = 1;
const STORE = 'settings';
let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function get(key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function set(key, value) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, value }).onsuccess = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getAll() {
  const keys = ['theme', 'token', 'user'];
  const out = {};
  for (const k of keys) out[k] = await get(k);
  return out;
}
