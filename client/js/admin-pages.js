'use strict';

/* ============================================================
   admin-pages.js — Strony panelu admina (renderowane w content)
   ============================================================ */

import * as DB from './db.js';

const $ = (id) => document.getElementById(id);
let TOKEN = null;

async function getToken() {
  if (TOKEN) return TOKEN;
  TOKEN = await DB.get('token');
  return TOKEN;
}

async function api(path, opts = {}) {
  const token = await getToken();
  const res = await fetch('/api/admin' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ── Overview (stats) ── */
export async function renderOverview(container) {
  container.innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="users" style="width:18px;height:18px"></i></div>
        <div><div class="stat-value" id="stat-users">—</div><div class="stat-label">Użytkownicy</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="user-check" style="width:18px;height:18px"></i></div>
        <div><div class="stat-value" id="stat-active">—</div><div class="stat-label">Aktywni</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="link" style="width:18px;height:18px"></i></div>
        <div><div class="stat-value" id="stat-links">—</div><div class="stat-label">Linki</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="key" style="width:18px;height:18px"></i></div>
        <div><div class="stat-value" id="stat-resets">—</div><div class="stat-label">Prośby o reset</div></div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons();

  const s = await api('/stats');
  $('stat-users').textContent = s.users;
  $('stat-active').textContent = s.activeUsers;
  $('stat-links').textContent = s.links;
  $('stat-resets').textContent = s.pendingResets;

  // Aktualizuj badge w nawigacji
  const badge = $('nav-resets-badge');
  if (badge) {
    if (s.pendingResets > 0) {
      badge.textContent = s.pendingResets;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }
}

/* ── Users ── */
export async function renderUsers(container) {
  container.innerHTML = `
    <div class="panel-card">
      <div class="panel-header">
        <i data-lucide="users" style="width:12px;height:12px;color:var(--color-accent)"></i>
        <span class="panel-title">Użytkownicy</span>
        <div class="panel-title-line"></div>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Login</th><th>Imię i nazwisko</th>
            <th class="hide-mobile">Brygada</th><th class="hide-mobile">Celka</th>
            <th>Rola</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr><td colspan="8" class="loading-cell">Ładowanie...</td></tr>
        </tbody>
      </table>
    </div>`;

  if (window.lucide) lucide.createIcons();
  await loadUsers();
}

async function loadUsers() {
  const users = await api('/users');
  const tbody = $('users-tbody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Brak użytkowników</td></tr>';
    return;
  }
  tbody.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td>${u.id}</td>
      <td><strong>${u.username}</strong></td>
      <td>${u.first_name} ${u.last_name}</td>
      <td class="hide-mobile">${u.brigade}</td>
      <td class="hide-mobile">${u.lu_id || '—'}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td><span class="badge badge-${u.active ? 'active' : 'inactive'}">${u.active ? 'Aktywny' : 'Nieaktywny'}</span></td>
      <td><button class="btn-sm ${u.active ? 'danger' : ''}" data-toggle-user="${u.id}">${u.active ? 'Dezaktywuj' : 'Aktywuj'}</button></td>
    </tr>`,
    )
    .join('');

  tbody.querySelectorAll('[data-toggle-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api(`/users/${btn.dataset.toggleUser}/toggle`, { method: 'PATCH' });
        await loadUsers();
      } catch (err) {
        alert('Błąd: ' + err.message);
      }
      btn.disabled = false;
    });
  });
}

/* ── Links ── */
export async function renderLinks(container) {
  container.innerHTML = `
    <div class="panel-card">
      <div class="panel-header">
        <i data-lucide="link" style="width:12px;height:12px;color:var(--color-accent)"></i>
        <span class="panel-title">Linki / Narzędzia</span>
        <div class="panel-title-line"></div>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Typ</th><th>Klucz</th><th>Etykieta</th>
            <th class="hide-mobile">URL</th><th class="hide-mobile">Grupa</th><th>Kolejność</th>
          </tr>
        </thead>
        <tbody id="links-tbody">
          <tr><td colspan="7" class="loading-cell">Ładowanie...</td></tr>
        </tbody>
      </table>
    </div>`;

  if (window.lucide) lucide.createIcons();

  const links = await api('/links');
  const tbody = $('links-tbody');
  if (!links.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Brak linków</td></tr>';
    return;
  }
  tbody.innerHTML = links
    .map(
      (l) => `
    <tr>
      <td>${l.id}</td>
      <td><span class="badge badge-${l.type}">${l.type}</span></td>
      <td><code>${l.link_key}</code></td>
      <td>${l.label}</td>
      <td class="hide-mobile" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.url || '—'}</td>
      <td class="hide-mobile">${l.group_name || '—'}</td>
      <td>${l.display_order}</td>
    </tr>`,
    )
    .join('');
}

/* ── Reset Requests ── */
export async function renderResets(container) {
  container.innerHTML = `
    <div class="panel-card">
      <div class="panel-header">
        <i data-lucide="key" style="width:12px;height:12px;color:var(--color-accent)"></i>
        <span class="panel-title">Prośby o reset hasła</span>
        <div class="panel-title-line"></div>
      </div>
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>Użytkownik</th><th>Data</th><th>Status</th><th></th></tr>
        </thead>
        <tbody id="resets-tbody">
          <tr><td colspan="5" class="loading-cell">Ładowanie...</td></tr>
        </tbody>
      </table>
    </div>`;

  if (window.lucide) lucide.createIcons();
  await loadResets();
}

async function loadResets() {
  const reqs = await api('/reset-requests');
  const tbody = $('resets-tbody');
  if (!reqs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Brak próśb o reset hasła</td></tr>';
    return;
  }
  tbody.innerHTML = reqs
    .map(
      (r) => `
    <tr>
      <td>${r.id}</td>
      <td><strong>${r.first_name} ${r.last_name}</strong> (${r.username})</td>
      <td>${new Date(r.requested_at).toLocaleString('pl-PL')}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
      <td>${
        r.status === 'pending'
          ? `<button class="btn-sm" data-resolve="${r.id}" data-status="done">Zresetowano</button>
           <button class="btn-sm danger" data-resolve="${r.id}" data-status="rejected">Odrzuć</button>`
          : ''
      }</td>
    </tr>`,
    )
    .join('');

  tbody.querySelectorAll('[data-resolve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api(`/reset-requests/${btn.dataset.resolve}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: btn.dataset.status }),
        });
        await loadResets();
      } catch (err) {
        alert('Błąd: ' + err.message);
      }
      btn.disabled = false;
    });
  });
}

/* ── Placeholder page ── */
export function renderPlaceholder(title, icon) {
  return (container) => {
    container.innerHTML = `
      <div class="card" style="flex:1;display:flex;align-items:center;justify-content:center">
        <div class="empty-state">
          <i data-lucide="${icon}" style="width:24px;height:24px;opacity:0.15"></i>
          <p>${title} — wkrótce</p>
        </div>
      </div>`;
    if (window.lucide) lucide.createIcons();
  };
}
