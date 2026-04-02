'use strict';

/* ============================================================
   admin-pages.js — Strony panelu admina
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

/* ── Overview ── */
export async function renderOverview(container) {
  container.innerHTML = `
    <!-- Stat cards -->
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
    </div>

    <!-- Szybkie akcje + Resety -->
    <div class="overview-grid">

      <!-- Szybkie akcje -->
      <div class="panel-card">
        <div class="panel-header">
          <i data-lucide="zap" style="width:12px;height:12px;color:var(--color-accent)"></i>
          <span class="panel-title">Szybkie akcje</span>
          <div class="panel-title-line"></div>
        </div>
        <div class="quick-actions">
          <button class="qa-btn" id="qa-add-user">
            <div class="qa-icon"><i data-lucide="user-plus" style="width:16px;height:16px"></i></div>
            <div class="qa-label">Dodaj użytkownika</div>
          </button>
          <button class="qa-btn" id="qa-add-link">
            <div class="qa-icon"><i data-lucide="link" style="width:16px;height:16px"></i></div>
            <div class="qa-label">Dodaj link</div>
          </button>
          <button class="qa-btn" id="qa-export-users">
            <div class="qa-icon"><i data-lucide="download" style="width:16px;height:16px"></i></div>
            <div class="qa-label">Eksportuj użytkowników</div>
          </button>
          <button class="qa-btn" id="qa-resets">
            <div class="qa-icon"><i data-lucide="key" style="width:16px;height:16px"></i></div>
            <div class="qa-label">Resety hasła</div>
          </button>
        </div>
      </div>

      <!-- Podgląd resetów -->
      <div class="panel-card">
        <div class="panel-header">
          <i data-lucide="key" style="width:12px;height:12px;color:var(--color-accent)"></i>
          <span class="panel-title">Prośby o reset hasła</span>
          <div class="panel-title-line"></div>
        </div>
        <div id="overview-resets-wrap">
          <div class="loading-cell">Ładowanie...</div>
        </div>
      </div>

    </div>`;

  if (window.lucide) lucide.createIcons();

  // Załaduj statystyki
  const s = await api('/stats');
  $('stat-users').textContent = s.users;
  $('stat-active').textContent = s.activeUsers;
  $('stat-links').textContent = s.links;
  $('stat-resets').textContent = s.pendingResets;

  const badge = $('nav-resets-badge');
  if (badge) {
    badge.textContent = s.pendingResets;
    badge.style.display = s.pendingResets > 0 ? 'inline' : 'none';
  }

  // Załaduj resety
  await loadOverviewResets();

  // Szybkie akcje — nawigacja
  $('qa-add-user').addEventListener('click', () => {
    import('./router.js').then((R) => R.navigate('admin-users'));
  });
  $('qa-add-link').addEventListener('click', () => {
    import('./router.js').then((R) => R.navigate('admin-links'));
  });
  $('qa-resets').addEventListener('click', () => {
    import('./router.js').then((R) => R.navigate('admin-resets'));
  });

  // Eksport CSV
  $('qa-export-users').addEventListener('click', async () => {
    const users = await api('/users');
    const rows = [
      ['ID', 'Login', 'Imię', 'Nazwisko', 'Brygada', 'Celka', 'BU', 'Rola', 'Aktywny', 'Utworzony'],
      ...users.map((u) => [
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.brigade,
        u.lu_id || '',
        u.bu_id || '',
        u.role,
        u.active ? 'Tak' : 'Nie',
        u.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `uzytkownicy_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });
}

async function loadOverviewResets() {
  const wrap = $('overview-resets-wrap');
  if (!wrap) return;

  const reqs = await api('/reset-requests');
  const pending = reqs.filter((r) => r.status === 'pending');

  if (!pending.length) {
    wrap.innerHTML = `<div class="empty-state" style="padding:24px">Brak oczekujących próśb</div>`;
    return;
  }

  wrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Użytkownik</th><th>Data</th><th></th></tr>
      </thead>
      <tbody>
        ${pending
          .map(
            (r) => `
          <tr>
            <td><strong>${r.first_name} ${r.last_name}</strong> <span style="color:var(--text-muted)">(${r.username})</span></td>
            <td>${new Date(r.requested_at).toLocaleString('pl-PL')}</td>
            <td style="display:flex;gap:4px">
              <button class="btn-sm" data-ov-resolve="${r.id}" data-ov-status="done">Zresetowano</button>
              <button class="btn-sm danger" data-ov-resolve="${r.id}" data-ov-status="rejected">Odrzuć</button>
            </td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('[data-ov-resolve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api(`/reset-requests/${btn.dataset.ovResolve}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: btn.dataset.ovStatus }),
        });
        await loadOverviewResets();
        const s = await api('/stats');
        $('stat-resets').textContent = s.pendingResets;
        const badge = $('nav-resets-badge');
        if (badge) {
          badge.textContent = s.pendingResets;
          badge.style.display = s.pendingResets > 0 ? 'inline' : 'none';
        }
      } catch (err) {
        alert('Błąd: ' + err.message);
      }
      btn.disabled = false;
    });
  });
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
        <button class="btn-sm" id="btn-add-link" style="margin-left:auto">+ Dodaj link</button>
      </div>

      <!-- Formularz dodawania/edycji -->
      <div id="link-form-wrap" style="display:none">
        <div class="link-form">
          <div class="link-form-grid">
            <div class="form-field">
              <label>Typ</label>
              <select id="lf-type">
                <option value="tool">tool</option>
                <option value="spa">spa</option>
                <option value="quick_link">quick_link</option>
              </select>
            </div>
            <div class="form-field">
              <label>Klucz (link_key)</label>
              <input type="text" id="lf-key" placeholder="np. portal_kierownika" />
            </div>
            <div class="form-field">
              <label>Etykieta</label>
              <input type="text" id="lf-label" placeholder="np. Portal Kierownika" />
            </div>
            <div class="form-field">
              <label>URL</label>
              <input type="text" id="lf-url" placeholder="#" />
            </div>
            <div class="form-field">
              <label>URL Pattern</label>
              <input type="text" id="lf-pattern" placeholder="np. https://system/{lu}" />
            </div>
            <div class="form-field">
              <label>Grupa</label>
              <input type="text" id="lf-group" placeholder="np. Nauka" />
            </div>
            <div class="form-field">
              <label>Celka (lu_id)</label>
              <input type="text" id="lf-lu" placeholder="np. 42/44 (opcjonalne)" />
            </div>
            <div class="form-field">
              <label>Kolejność</label>
              <input type="number" id="lf-order" placeholder="0" value="0" />
            </div>
            <div class="form-field form-field-check">
              <label><input type="checkbox" id="lf-primary" /> Wyróżniony (primary)</label>
            </div>
          </div>
          <div class="link-form-error" id="lf-error" style="display:none"></div>
          <div class="link-form-actions">
            <button class="btn-sm" id="lf-cancel">Anuluj</button>
            <button class="btn-sm btn-primary" id="lf-save">Zapisz</button>
          </div>
        </div>
      </div>

      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Typ</th><th>Klucz</th><th>Etykieta</th>
            <th class="hide-mobile">URL</th>
            <th class="hide-mobile">Grupa</th>
            <th class="hide-mobile">Celka</th>
            <th>Wyróżn.</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="links-tbody">
          <tr><td colspan="9" class="loading-cell">Ładowanie...</td></tr>
        </tbody>
      </table>
    </div>`;

  if (window.lucide) lucide.createIcons();
  await loadLinks();
  initLinkForm();
}

let editingLinkId = null;

function initLinkForm() {
  const wrap = $('link-form-wrap');

  $('btn-add-link').addEventListener('click', () => {
    editingLinkId = null;
    clearForm();
    wrap.style.display = 'block';
    $('btn-add-link').style.display = 'none';
  });

  $('lf-cancel').addEventListener('click', () => {
    wrap.style.display = 'none';
    $('btn-add-link').style.display = 'inline-block';
    editingLinkId = null;
  });

  $('lf-save').addEventListener('click', async () => {
    const btn = $('lf-save');
    btn.disabled = true;
    $('lf-error').style.display = 'none';

    const data = {
      type: $('lf-type').value,
      link_key: $('lf-key').value.trim(),
      label: $('lf-label').value.trim(),
      url: $('lf-url').value.trim() || '#',
      url_pattern: $('lf-pattern').value.trim() || null,
      group_name: $('lf-group').value.trim() || null,
      lu_id: $('lf-lu').value.trim() || null,
      display_order: parseInt($('lf-order').value) || 0,
      is_primary: $('lf-primary').checked,
    };

    if (!data.label) {
      showFormError('Etykieta jest wymagana');
      btn.disabled = false;
      return;
    }

    try {
      if (editingLinkId) {
        await api(`/links/${editingLinkId}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        if (!data.link_key) {
          showFormError('Klucz jest wymagany');
          btn.disabled = false;
          return;
        }
        await api('/links', { method: 'POST', body: JSON.stringify(data) });
      }
      wrap.style.display = 'none';
      $('btn-add-link').style.display = 'inline-block';
      editingLinkId = null;
      await loadLinks();
    } catch (err) {
      showFormError('Błąd: ' + err.message);
    }
    btn.disabled = false;
  });
}

function clearForm() {
  ['lf-key', 'lf-label', 'lf-url', 'lf-pattern', 'lf-group', 'lf-lu'].forEach((id) => ($(`${id}`).value = ''));
  $('lf-type').value = 'tool';
  $('lf-order').value = '0';
  $('lf-primary').checked = false;
  $('lf-key').disabled = false;
}

function showFormError(msg) {
  const el = $('lf-error');
  el.textContent = msg;
  el.style.display = 'block';
}

async function loadLinks() {
  const links = await api('/links');
  const tbody = $('links-tbody');
  if (!links.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Brak linków</td></tr>';
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
      <td class="hide-mobile" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.url || '—'}</td>
      <td class="hide-mobile">${l.group_name || '—'}</td>
      <td class="hide-mobile">${l.lu_id || '—'}</td>
      <td>${l.is_primary ? '<span class="badge badge-active">✓</span>' : '—'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn-sm" data-edit-link="${l.id}">Edytuj</button>
        <button class="btn-sm danger" data-delete-link="${l.id}">Usuń</button>
      </td>
    </tr>`,
    )
    .join('');

  // Edytuj
  tbody.querySelectorAll('[data-edit-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const link = links.find((l) => l.id === parseInt(btn.dataset.editLink));
      if (!link) return;
      editingLinkId = link.id;
      $('lf-type').value = link.type;
      $('lf-key').value = link.link_key;
      $('lf-key').disabled = true;
      $('lf-label').value = link.label;
      $('lf-url').value = link.url || '';
      $('lf-pattern').value = link.url_pattern || '';
      $('lf-group').value = link.group_name || '';
      $('lf-lu').value = link.lu_id || '';
      $('lf-order').value = link.display_order || 0;
      $('lf-primary').checked = !!link.is_primary;
      $('link-form-wrap').style.display = 'block';
      $('btn-add-link').style.display = 'none';
      $('lf-error').style.display = 'none';
    });
  });

  // Usuń
  tbody.querySelectorAll('[data-delete-link]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Usunąć ten link?')) return;
      btn.disabled = true;
      try {
        await api(`/links/${btn.dataset.deleteLink}`, { method: 'DELETE' });
        await loadLinks();
      } catch (err) {
        alert('Błąd: ' + err.message);
      }
      btn.disabled = false;
    });
  });
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

/* ── Placeholder ── */
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
