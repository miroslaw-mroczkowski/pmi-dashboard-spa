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

let editingUserId = null;

/* ── Users ── */
export async function renderUsers(container) {
  container.innerHTML = `
    <div class="panel-card">
      <div class="panel-header">
        <i data-lucide="users" style="width:12px;height:12px;color:var(--color-accent)"></i>
        <span class="panel-title">Użytkownicy</span>
        <div class="panel-title-line"></div>
        <button class="btn-sm" id="btn-add-user" style="margin-left:auto">+ Dodaj użytkownika</button>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Login</th><th>Imię i nazwisko</th>
            <th class="hide-mobile">Brygada</th>
            <th class="hide-mobile">BU</th>
            <th class="hide-mobile">Celka</th>
            <th>Rola</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr><td colspan="9" class="loading-cell">Ładowanie...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal użytkownika -->
    <div id="user-modal-overlay" class="modal-overlay" style="display:none">
      <div class="modal-box">
        <div class="modal-header">
          <span id="user-modal-title">Dodaj użytkownika</span>
          <button class="modal-close" id="uf-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="link-form-grid">
            <div class="form-field" id="uf-username-wrap">
              <label>Login</label>
              <input type="text" id="uf-username" placeholder="np. jkowalski" />
            </div>
            <div class="form-field">
              <label>Imię</label>
              <input type="text" id="uf-firstname" placeholder="Jan" />
            </div>
            <div class="form-field">
              <label>Nazwisko</label>
              <input type="text" id="uf-lastname" placeholder="Kowalski" />
            </div>
            <div class="form-field">
              <label>Hasło <span id="uf-password-hint" style="color:var(--text-muted);font-weight:400">(opcjonalne przy edycji)</span></label>
              <input type="password" id="uf-password" placeholder="Hasło..." />
            </div>
            <div class="form-field">
              <label>Brygada</label>
              <select id="uf-brigade">
                <option value="">— Wybierz —</option>
                <option value="A">Brygada A</option>
                <option value="B">Brygada B</option>
                <option value="C">Brygada C</option>
                <option value="D">Brygada D</option>
              </select>
            </div>
            <div class="form-field">
              <label>Dział (BU)</label>
              <select id="uf-bu">
                <option value="">— Wybierz —</option>
              </select>
            </div>
            <div class="form-field">
              <label>Celka</label>
              <select id="uf-lu">
                <option value="">— Wybierz —</option>
              </select>
            </div>
            <div class="form-field">
              <label>Rola</label>
              <select id="uf-role">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <div class="link-form-error" id="uf-error" style="display:none"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-sm" id="uf-cancel">Anuluj</button>
          <button class="btn-sm btn-primary" id="uf-save">Zapisz</button>
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons();
  await initUserForm();
  await loadUsers();
}

function openModal(isEdit) {
  $('user-modal-overlay').style.display = 'flex';
  $('user-modal-title').textContent = isEdit ? 'Edytuj użytkownika' : 'Dodaj użytkownika';
  $('uf-username-wrap').style.display = isEdit ? 'none' : '';
  $('uf-password-hint').style.display = isEdit ? 'inline' : 'none';
  $('uf-error').style.display = 'none';
}

function closeModal() {
  $('user-modal-overlay').style.display = 'none';
  editingUserId = null;
  ['uf-username', 'uf-firstname', 'uf-lastname', 'uf-password'].forEach((id) => ($(id).value = ''));
  $('uf-brigade').value = '';
  $('uf-bu').value = '';
  $('uf-lu').innerHTML = '<option value="">— Wybierz —</option>';
  $('uf-error').style.display = 'none';
}

async function initUserForm() {
  // Załaduj strukturę BU/LU
  let bus = [],
    lus = [];
  try {
    const s = await api('/structure');
    bus = s.bus || [];
    lus = s.lus || [];
  } catch {
    /* endpoint niedostępny */
  }

  const buSel = $('uf-bu');
  const luSel = $('uf-lu');

  bus.forEach((bu) => {
    const opt = document.createElement('option');
    opt.value = bu.id;
    opt.textContent = bu.name || bu.id;
    buSel.appendChild(opt);
  });

  buSel.addEventListener('change', () => {
    luSel.innerHTML = '<option value="">— Wybierz —</option>';
    lus
      .filter((lu) => lu.bu_id === buSel.value)
      .forEach((lu) => {
        const opt = document.createElement('option');
        opt.value = lu.id;
        opt.textContent = lu.id;
        luSel.appendChild(opt);
      });
  });

  $('btn-add-user').addEventListener('click', () => {
    editingUserId = null;
    openModal(false);
  });

  $('uf-cancel').addEventListener('click', closeModal);
  $('uf-close').addEventListener('click', closeModal);
  $('user-modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('user-modal-overlay')) closeModal();
  });

  $('uf-save').addEventListener('click', async () => {
    const btn = $('uf-save');
    btn.disabled = true;
    $('uf-error').style.display = 'none';

    const data = {
      username: $('uf-username').value.trim(),
      first_name: $('uf-firstname').value.trim(),
      last_name: $('uf-lastname').value.trim(),
      password: $('uf-password').value,
      brigade: $('uf-brigade').value,
      bu_id: $('uf-bu').value || null,
      lu_id: $('uf-lu').value || null,
      role: $('uf-role').value,
    };

    if (!data.username || !data.first_name || !data.last_name || !data.password || !data.brigade) {
      $('uf-error').textContent = 'Wypełnij wszystkie wymagane pola';
      $('uf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }

    try {
      if (editingUserId) {
        await api(`/users/${editingUserId}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        await api('/users', { method: 'POST', body: JSON.stringify(data) });
      }
      closeModal();
      await loadUsers();
    } catch (err) {
      $('uf-error').textContent = 'Błąd: ' + err.message;
      $('uf-error').style.display = 'block';
    }
    btn.disabled = false;
  });
}

async function loadUsers() {
  const users = await api('/users');
  const tbody = $('users-tbody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Brak użytkowników</td></tr>';
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
      <td class="hide-mobile">${u.bu_id || '—'}</td>
      <td class="hide-mobile">${u.lu_id || '—'}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td><span class="badge badge-${u.active ? 'active' : 'inactive'}">${u.active ? 'Aktywny' : 'Nieaktywny'}</span></td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn-sm" data-edit-user="${u.id}">Edytuj</button>
        <button class="btn-sm ${u.active ? 'danger' : ''}" data-toggle-user="${u.id}">${u.active ? 'Dezaktywuj' : 'Aktywuj'}</button>
        <button class="btn-sm danger" data-delete-user="${u.id}">Usuń</button>
      </td>
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

  tbody.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Usunąć tego użytkownika?')) return;
      btn.disabled = true;
      try {
        await api(`/users/${btn.dataset.deleteUser}`, { method: 'DELETE' });
        await loadUsers();
      } catch (err) {
        alert('Błąd: ' + err.message);
      }
      btn.disabled = false;
    });
  });

  tbody.querySelectorAll('[data-edit-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const u = users.find((u) => u.id === parseInt(btn.dataset.editUser));
      if (!u) return;
      editingUserId = u.id;
      $('uf-username').value = u.username;
      $('uf-username').disabled = true;
      $('uf-firstname').value = u.first_name;
      $('uf-lastname').value = u.last_name;
      $('uf-password').value = '';
      $('uf-brigade').value = u.brigade || '';
      $('uf-role').value = u.role;
      if (u.bu_id) {
        $('uf-bu').value = u.bu_id;
        $('uf-bu').dispatchEvent(new Event('change'));
        setTimeout(() => {
          if (u.lu_id) $('uf-lu').value = u.lu_id;
        }, 50);
      }
      openModal(true);
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
