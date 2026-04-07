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

/* ── Dynamiczne przeliczanie wysokości tbody ── */
function setTableBodyHeight(tbodyId) {
  const tbody = $(tbodyId);
  if (!tbody) return;

  // Znajdź panel-card (ancestor) i oblicz dostępne miejsce od jego góry
  const panelCard = tbody.closest('.panel-card');
  if (!panelCard) return;

  // Elementy nad tbody wewnątrz panel-card
  const panelRect = panelCard.getBoundingClientRect();
  const tbodyRect = tbody.getBoundingClientRect();

  // Wysokość od góry panel-card do góry tbody
  // Działa też gdy tbody jest w ukrytej zakładce — używamy panel-card jako referencji
  const offsetFromPanelTop =
    tbodyRect.top > 0
      ? tbodyRect.top - panelRect.top
      : panelCard.querySelector('thead')
        ? panelCard.querySelector('thead').getBoundingClientRect().height +
          panelCard.querySelector('.panel-header')?.getBoundingClientRect().height +
          (panelCard.querySelector('[id^="tab-"] > div')?.getBoundingClientRect().height || 0)
        : 100;

  const available = window.innerHeight - panelRect.top - offsetFromPanelTop - 1;
  tbody.style.maxHeight = Math.max(available, 100) + 'px';
}

function initTableResize(...tbodyIds) {
  const update = () => tbodyIds.forEach((id) => setTableBodyHeight(id));
  // Wywołaj po małym opóźnieniu żeby DOM był gotowy
  setTimeout(update, 0);
  window.addEventListener('resize', update);
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
  initTableResize('users-tbody');
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
let editingLinkId = null;
let editingGroupId = null;
let allGroups = [];

export async function renderLinks(container) {
  container.innerHTML = `
    <div class="panel-card">
      <div class="panel-header">
        <i data-lucide="link" style="width:12px;height:12px;color:var(--color-accent)"></i>
        <span class="panel-title">Linki / Narzędzia</span>
        <div class="panel-title-line"></div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn-sm tab-btn tab-active" data-tab="links">Linki</button>
          <button class="btn-sm tab-btn" data-tab="groups">Grupy</button>
        </div>
      </div>

      <!-- Zakładka Linki -->
      <div id="tab-links">
        <div style="padding:10px 18px;border-bottom:1px solid var(--border-default)">
          <button class="btn-sm" id="btn-add-link">+ Dodaj link</button>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>Typ</th><th>Klucz</th><th>Etykieta</th>
              <th class="hide-mobile">Grupa</th><th class="hide-mobile">Primary</th><th></th>
            </tr>
          </thead>
          <tbody id="links-tbody">
            <tr><td colspan="7" class="loading-cell">Ładowanie...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Zakładka Grupy -->
      <div id="tab-groups" style="display:none">
        <div style="padding:10px 18px;border-bottom:1px solid var(--border-default)">
          <button class="btn-sm" id="btn-add-group">+ Dodaj grupę</button>
        </div>
        <table class="admin-table">
          <thead>
            <tr><th>ID</th><th>Nazwa</th><th>Etykieta</th><th>Strona</th><th>Ikona <a href="https://lucide.dev/icons/" target="_blank" style="opacity:0.7;text-decoration:none;vertical-align:middle" title="Przeglądaj ikony Lucide"><i data-lucide="external-link" style="width:11px;height:11px;display:inline-block"></i></a></th><th>Kolejność</th><th></th></tr>
          </thead>
          <tbody id="groups-tbody">
            <tr><td colspan="7" class="loading-cell">Ładowanie...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal linku -->
    <div id="link-modal-overlay" class="modal-overlay" style="display:none">
      <div class="modal-box">
        <div class="modal-header">
          <span id="link-modal-title">Dodaj link</span>
          <button class="modal-close" id="lf-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="link-form-grid">
            <div class="form-field" id="lf-key-wrap">
              <label>Klucz (link_key)</label>
              <input type="text" id="lf-key" placeholder="np. portal_kierownika" />
            </div>
            <div class="form-field">
              <label>Typ</label>
              <select id="lf-type">
                <option value="tool">tool — Dashboard</option>
                <option value="quick_link">quick_link — Sidebar</option>
                <option value="spa">spa — SPA grid</option>
                <option value="report">report — Raporty</option>
              </select>
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
              <label>URL Pattern <span style="color:var(--text-muted);font-weight:400">(dla SPA: {lu})</span></label>
              <input type="text" id="lf-pattern" placeholder="https://system/{lu}" />
            </div>
            <div class="form-field" id="lf-group-wrap">
              <label>Grupa <span style="color:var(--color-accent)">*</span></label>
              <select id="lf-group-id">
                <option value="">— Wybierz grupę —</option>
              </select>
            </div>
            <div class="form-field">
              <label>Kolejność</label>
              <input type="number" id="lf-order" value="0" />
            </div>
            <div class="form-field form-field-check">
              <label><input type="checkbox" id="lf-primary" /> Wyróżniony (primary)</label>
            </div>
          </div>
          <div class="link-form-error" id="lf-error" style="display:none"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-sm" id="lf-cancel">Anuluj</button>
          <button class="btn-sm btn-primary" id="lf-save">Zapisz</button>
        </div>
      </div>
    </div>

    <!-- Modal grupy -->
    <div id="group-modal-overlay" class="modal-overlay" style="display:none">
      <div class="modal-box" style="max-width:480px">
        <div class="modal-header">
          <span id="group-modal-title">Dodaj grupę</span>
          <button class="modal-close" id="gf-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="link-form-grid">
            <div class="form-field" id="gf-name-wrap">
              <label>Nazwa (klucz)</label>
              <input type="text" id="gf-name" placeholder="np. Produkcja" />
            </div>
            <div class="form-field">
              <label>Etykieta</label>
              <input type="text" id="gf-label" placeholder="np. Produkcja" />
            </div>
            <div class="form-field">
              <label>Ikona Lucide</label>
              <input type="text" id="gf-icon" placeholder="np. factory" value="layout-grid" />
            </div>
            <div class="form-field">
              <label>Strona</label>
              <select id="gf-page">
                <option value="dashboard">Dashboard</option>
                <option value="reports">Raporty</option>
                <option value="sidebar">Sidebar (Quick Links)</option>
              </select>
            </div>
            <div class="form-field">
              <label>Kolejność</label>
              <input type="number" id="gf-order" value="0" />
            </div>
          </div>
          <div class="link-form-error" id="gf-error" style="display:none"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-sm" id="gf-cancel">Anuluj</button>
          <button class="btn-sm btn-primary" id="gf-save">Zapisz</button>
        </div>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons();
  allGroups = await api('/groups');
  initTabSwitcher();
  initLinkForm();
  initGroupForm();
  await loadLinks();
  await loadGroups();
  initTableResize('links-tbody', 'groups-tbody');
}

function initTabSwitcher() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('tab-active'));
      btn.classList.add('tab-active');
      const tab = btn.dataset.tab;
      $('tab-links').style.display = tab === 'links' ? '' : 'none';
      $('tab-groups').style.display = tab === 'groups' ? '' : 'none';
      // Przelicz wysokość po pokazaniu zakładki
      setTimeout(() => {
        if (tab === 'links') setTableBodyHeight('links-tbody');
        if (tab === 'groups') setTableBodyHeight('groups-tbody');
      }, 0);
    });
  });
}

function openLinkModal(isEdit) {
  $('link-modal-overlay').style.display = 'flex';
  $('link-modal-title').textContent = isEdit ? 'Edytuj link' : 'Dodaj link';
  $('lf-key-wrap').style.display = isEdit ? 'none' : '';
  $('lf-error').style.display = 'none';
  updateGroupDropdown($('lf-type').value);
}

function closeLinkModal() {
  $('link-modal-overlay').style.display = 'none';
  editingLinkId = null;
  ['lf-key', 'lf-label', 'lf-url', 'lf-pattern'].forEach((id) => ($(id).value = ''));
  $('lf-type').value = 'tool';
  $('lf-order').value = '0';
  $('lf-primary').checked = false;
  $('lf-group-id').value = '';
  $('lf-error').style.display = 'none';
}

function openGroupModal(isEdit) {
  $('group-modal-overlay').style.display = 'flex';
  $('group-modal-title').textContent = isEdit ? 'Edytuj grupę' : 'Dodaj grupę';
  $('gf-name-wrap').style.display = isEdit ? 'none' : '';
  $('gf-error').style.display = 'none';
}

function closeGroupModal() {
  $('group-modal-overlay').style.display = 'none';
  editingGroupId = null;
  ['gf-name', 'gf-label', 'gf-icon'].forEach((id) => ($(id).value = ''));
  $('gf-icon').value = 'layout-grid';
  $('gf-page').value = 'dashboard';
  $('gf-order').value = '0';
  $('gf-error').style.display = 'none';
}

function updateGroupDropdown(type) {
  const pageMap = { tool: 'dashboard', report: 'reports', quick_link: 'sidebar', spa: null };
  const page = pageMap[type];
  const sel = $('lf-group-id');
  const wrap = $('lf-group-wrap');

  if (!page) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';

  sel.innerHTML = '<option value="">— Wybierz grupę —</option>';
  allGroups
    .filter((g) => g.page === page)
    .forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.label;
      sel.appendChild(opt);
    });
}

function initLinkForm() {
  $('btn-add-link').addEventListener('click', () => {
    editingLinkId = null;
    openLinkModal(false);
  });

  $('lf-type').addEventListener('change', () => updateGroupDropdown($('lf-type').value));

  $('lf-cancel').addEventListener('click', closeLinkModal);
  $('lf-close').addEventListener('click', closeLinkModal);
  $('link-modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('link-modal-overlay')) closeLinkModal();
  });

  $('lf-save').addEventListener('click', async () => {
    const btn = $('lf-save');
    btn.disabled = true;
    $('lf-error').style.display = 'none';

    const type = $('lf-type').value;
    const groupId = $('lf-group-id').value || null;
    const needsGroup = ['tool', 'report', 'quick_link'].includes(type);

    if (needsGroup && !groupId) {
      $('lf-error').textContent = 'Wybierz grupę';
      $('lf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }

    const data = {
      type,
      link_key: $('lf-key').value.trim(),
      label: $('lf-label').value.trim(),
      url: $('lf-url').value.trim() || '#',
      url_pattern: $('lf-pattern').value.trim() || null,
      group_id: groupId ? parseInt(groupId) : null,
      display_order: parseInt($('lf-order').value) || 0,
      is_primary: $('lf-primary').checked,
    };

    if (!data.label) {
      $('lf-error').textContent = 'Etykieta jest wymagana';
      $('lf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }

    try {
      if (editingLinkId) {
        await api(`/links/${editingLinkId}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        if (!data.link_key) {
          $('lf-error').textContent = 'Klucz jest wymagany';
          $('lf-error').style.display = 'block';
          btn.disabled = false;
          return;
        }
        await api('/links', { method: 'POST', body: JSON.stringify(data) });
      }
      closeLinkModal();
      await loadLinks();
      setTableBodyHeight('links-tbody');
    } catch (err) {
      $('lf-error').textContent = 'Błąd: ' + err.message;
      $('lf-error').style.display = 'block';
    }
    btn.disabled = false;
  });
}

function initGroupForm() {
  $('btn-add-group').addEventListener('click', () => {
    editingGroupId = null;
    openGroupModal(false);
  });

  $('gf-cancel').addEventListener('click', closeGroupModal);
  $('gf-close').addEventListener('click', closeGroupModal);
  $('group-modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('group-modal-overlay')) closeGroupModal();
  });

  $('gf-save').addEventListener('click', async () => {
    const btn = $('gf-save');
    btn.disabled = true;
    $('gf-error').style.display = 'none';

    const data = {
      name: $('gf-name').value.trim(),
      label: $('gf-label').value.trim(),
      icon: $('gf-icon').value.trim() || 'layout-grid',
      page: $('gf-page').value,
      display_order: parseInt($('gf-order').value) || 0,
    };

    if (!data.label || (!editingGroupId && !data.name)) {
      $('gf-error').textContent = 'Wypełnij wymagane pola';
      $('gf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }

    try {
      if (editingGroupId) {
        await api(`/groups/${editingGroupId}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        await api('/groups', { method: 'POST', body: JSON.stringify(data) });
      }
      allGroups = await api('/groups');
      closeGroupModal();
      await loadGroups();
      setTableBodyHeight('groups-tbody');
    } catch (err) {
      $('gf-error').textContent = 'Błąd: ' + err.message;
      $('gf-error').style.display = 'block';
    }
    btn.disabled = false;
  });
}

async function loadLinks() {
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
      <td class="hide-mobile">${l.group_label || l.group_name || '—'}</td>
      <td class="hide-mobile">${l.is_primary ? '<span class="badge badge-active">✓</span>' : '—'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn-sm" data-edit-link="${l.id}">Edytuj</button>
        <button class="btn-sm danger" data-delete-link="${l.id}">Usuń</button>
      </td>
    </tr>`,
    )
    .join('');

  tbody.querySelectorAll('[data-edit-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const link = links.find((l) => l.id === parseInt(btn.dataset.editLink));
      if (!link) return;
      editingLinkId = link.id;
      $('lf-type').value = link.type;
      $('lf-label').value = link.label;
      $('lf-url').value = link.url || '';
      $('lf-pattern').value = link.url_pattern || '';
      $('lf-order').value = link.display_order || 0;
      $('lf-primary').checked = !!link.is_primary;
      updateGroupDropdown(link.type);
      if (link.group_id) $('lf-group-id').value = link.group_id;
      openLinkModal(true);
    });
  });

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

async function loadGroups() {
  const groups = await api('/groups');
  allGroups = groups;
  const tbody = $('groups-tbody');
  if (!groups.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Brak grup</td></tr>';
    return;
  }
  const pageLabels = { dashboard: 'Dashboard', reports: 'Raporty', sidebar: 'Sidebar' };
  tbody.innerHTML = groups
    .map(
      (g) => `
    <tr>
      <td>${g.id}</td>
      <td><code>${g.name}</code></td>
      <td>${g.label}</td>
      <td><span class="badge badge-${g.page === 'dashboard' ? 'active' : g.page === 'reports' ? 'tool' : 'pending'}">${pageLabels[g.page] || g.page}</span></td>
      <td>${g.icon}</td>
      <td>${g.display_order}</td>
      <td style="display:flex;gap:4px">
        <button class="btn-sm" data-edit-group="${g.id}">Edytuj</button>
        <button class="btn-sm danger" data-delete-group="${g.id}">Usuń</button>
      </td>
    </tr>`,
    )
    .join('');

  tbody.querySelectorAll('[data-edit-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = groups.find((g) => g.id === parseInt(btn.dataset.editGroup));
      if (!group) return;
      editingGroupId = group.id;
      $('gf-label').value = group.label;
      $('gf-icon').value = group.icon || 'layout-grid';
      $('gf-page').value = group.page;
      $('gf-order').value = group.display_order || 0;
      openGroupModal(true);
    });
  });

  tbody.querySelectorAll('[data-delete-group]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Usunąć grupę? Linki w tej grupie zostaną odłączone.')) return;
      btn.disabled = true;
      try {
        await api(`/groups/${btn.dataset.deleteGroup}`, { method: 'DELETE' });
        allGroups = await api('/groups');
        await loadGroups();
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
