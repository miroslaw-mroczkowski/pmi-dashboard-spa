'use strict';

/* ============================================================
   admin-pages.js — Panel admina z akordeonami
   ============================================================ */

import * as DB from './db.js';
import * as Data from './data.js';
import * as UI from './ui.js';

async function reloadUI() {
  await Data.loadAll();
  UI.renderQuickLinks();
  const row2 = document.getElementById('tools-row-2');
  const row3 = document.getElementById('tools-row-3');
  if (row2 && row3) {
    row2.innerHTML = '';
    row3.innerHTML = '';
    UI.renderToolGroups();
  }
  if (window.lucide) lucide.createIcons();
}

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

/* ── Dynamiczne przeliczanie wysokości tbody ── */
function setTableBodyHeight(tbodyId) {
  const tbody = $(tbodyId);
  if (!tbody) return;
  const panelCard = tbody.closest('.panel-card');
  if (!panelCard) return;
  const panelRect = panelCard.getBoundingClientRect();
  const tbodyRect = tbody.getBoundingClientRect();
  const offset = tbodyRect.top > 0 ? tbodyRect.top - panelRect.top : 150;
  const available = window.innerHeight - panelRect.top - offset - 1;
  tbody.style.maxHeight = Math.max(available, 100) + 'px';
}

function initTableResize(...ids) {
  const update = () => ids.forEach(setTableBodyHeight);
  setTimeout(update, 0);
  window.addEventListener('resize', update);
}

/* ── Akordeon ── */
let openAccordionRow = null;

function closeAccordion() {
  if (!openAccordionRow) return;
  const next = openAccordionRow.nextSibling;
  if (next && next.classList?.contains('accordion-row')) next.remove();
  openAccordionRow.classList.remove('accordion-open');
  openAccordionRow = null;
}

function openAccordion(tr, html, onMount) {
  if (openAccordionRow === tr) {
    closeAccordion();
    return;
  }
  closeAccordion();
  tr.classList.add('accordion-open');
  openAccordionRow = tr;
  const colspan = tr.querySelectorAll('td').length;
  const row = document.createElement('tr');
  row.className = 'accordion-row';
  row.innerHTML = `<td colspan="${colspan}" class="accordion-cell">${html}</td>`;
  tr.after(row);
  if (onMount) onMount(row);
  if (window.lucide) lucide.createIcons();
}

/* ── Overview ── */
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
  const badge = $('nav-resets-badge');
  if (badge) {
    badge.textContent = s.pendingResets;
    badge.style.display = s.pendingResets > 0 ? 'inline' : 'none';
  }
}

/* ══════════════════════════════════════════════════════════════
   UŻYTKOWNICY
══════════════════════════════════════════════════════════════ */
export async function renderUsers(container) {
  let bus = [],
    lus = [];
  try {
    const s = await api('/structure');
    bus = s.bus || [];
    lus = s.lus || [];
  } catch {}
  const buOpts = bus.map((b) => `<option value="${b.id}">${b.name || b.id}</option>`).join('');

  container.innerHTML = `
    <div class="panel-card">
      <div class="panel-header">
        <i data-lucide="users" style="width:12px;height:12px;color:var(--color-accent)"></i>
        <span class="panel-title">Użytkownicy</span>
        <div class="panel-title-line"></div>
        <button class="btn-sm" id="btn-add-user" style="margin-left:auto">+ Dodaj użytkownika</button>
      </div>
      <div id="add-user-form" style="display:none">${userFormHtml(buOpts, false)}</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Login</th><th>Imię i nazwisko</th>
            <th class="hide-mobile">Brygada</th><th class="hide-mobile">BU</th>
            <th class="hide-mobile">Celka</th><th>Rola</th><th>Status</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr><td colspan="8" class="loading-cell">Ładowanie...</td></tr>
        </tbody>
      </table>
    </div>`;

  if (window.lucide) lucide.createIcons();

  $('btn-add-user').addEventListener('click', () => {
    const form = $('add-user-form');
    const open = form.style.display !== 'none';
    form.style.display = open ? 'none' : 'block';
    $('btn-add-user').textContent = open ? '+ Dodaj użytkownika' : '✕ Anuluj';
    closeAccordion();
    if (!open)
      initUserFormEvents(null, bus, lus, async () => {
        $('add-user-form').style.display = 'none';
        $('btn-add-user').textContent = '+ Dodaj użytkownika';
        await loadUsers(bus, lus, buOpts);
        setTableBodyHeight('users-tbody');
      });
  });

  await loadUsers(bus, lus, buOpts);
  initTableResize('users-tbody');
}

function userFormHtml(buOpts, isEdit) {
  return `<div class="accordion-form">
    <div class="link-form-grid">
      ${!isEdit ? `<div class="form-field"><label>Login</label><input type="text" id="uf-username" placeholder="np. jkowalski"/></div>` : ''}
      <div class="form-field"><label>Imię</label><input type="text" id="uf-firstname" placeholder="Jan"/></div>
      <div class="form-field"><label>Nazwisko</label><input type="text" id="uf-lastname" placeholder="Kowalski"/></div>
      <div class="form-field"><label>Hasło${isEdit ? ' <span style="color:var(--text-muted);font-weight:400">(opcjonalne)</span>' : ''}</label><input type="password" id="uf-password" placeholder="Hasło..."/></div>
      <div class="form-field"><label>Brygada</label><select id="uf-brigade"><option value="">— Wybierz —</option><option value="A">Brygada A</option><option value="B">Brygada B</option><option value="C">Brygada C</option><option value="D">Brygada D</option></select></div>
      <div class="form-field"><label>Dział (BU)</label><select id="uf-bu"><option value="">— Wybierz —</option>${buOpts}</select></div>
      <div class="form-field"><label>Celka</label><select id="uf-lu"><option value="">— Wybierz —</option></select></div>
      <div class="form-field"><label>Rola</label><select id="uf-role"><option value="user">user</option><option value="admin">admin</option></select></div>
    </div>
    <div class="link-form-error" id="uf-error" style="display:none"></div>
    <div class="accordion-actions">
      <button class="btn-sm" id="uf-cancel">Anuluj</button>
      ${isEdit ? '<button class="btn-sm danger" id="uf-toggle-btn"></button><button class="btn-sm danger" id="uf-delete">Usuń</button>' : ''}
      <button class="btn-sm btn-primary" id="uf-save">Zapisz</button>
    </div>
  </div>`;
}

function initUserFormEvents(userId, bus, lus, onSuccess, userData) {
  const buSel = $('uf-bu'),
    luSel = $('uf-lu');
  if (buSel)
    buSel.addEventListener('change', () => {
      luSel.innerHTML = '<option value="">— Wybierz —</option>';
      lus
        .filter((l) => l.bu_id === buSel.value)
        .forEach((l) => {
          const o = document.createElement('option');
          o.value = l.id;
          o.textContent = l.id;
          luSel.appendChild(o);
        });
    });

  $('uf-cancel')?.addEventListener('click', () => {
    if (userId) closeAccordion();
    else {
      $('add-user-form').style.display = 'none';
      $('btn-add-user').textContent = '+ Dodaj użytkownika';
    }
  });

  if (userId && userData) {
    const toggleBtn = $('uf-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = userData.active ? 'Dezaktywuj' : 'Aktywuj';
      if (!userData.active) toggleBtn.classList.remove('danger');
      toggleBtn.addEventListener('click', async () => {
        if (!confirm(`${userData.active ? 'Dezaktywować' : 'Aktywować'} użytkownika?`)) return;
        try {
          await api(`/users/${userId}/toggle`, { method: 'PATCH' });
          closeAccordion();
          await onSuccess();
        } catch (err) {
          alert('Błąd: ' + err.message);
        }
      });
    }
    $('uf-delete')?.addEventListener('click', async () => {
      if (!confirm('Usunąć użytkownika?')) return;
      try {
        await api(`/users/${userId}`, { method: 'DELETE' });
        closeAccordion();
        await onSuccess();
      } catch (err) {
        alert('Błąd: ' + err.message);
      }
    });
  }

  $('uf-save')?.addEventListener('click', async () => {
    const btn = $('uf-save');
    btn.disabled = true;
    $('uf-error').style.display = 'none';
    const data = {
      username: $('uf-username')?.value.trim(),
      first_name: $('uf-firstname').value.trim(),
      last_name: $('uf-lastname').value.trim(),
      password: $('uf-password').value,
      brigade: $('uf-brigade').value,
      bu_id: $('uf-bu').value || null,
      lu_id: $('uf-lu').value || null,
      role: $('uf-role').value,
    };
    if (!userId && (!data.username || !data.password)) {
      $('uf-error').textContent = 'Login i hasło są wymagane';
      $('uf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }
    if (!data.first_name || !data.last_name || !data.brigade) {
      $('uf-error').textContent = 'Wypełnij wszystkie wymagane pola';
      $('uf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }
    try {
      if (userId) await api(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
      else await api('/users', { method: 'POST', body: JSON.stringify(data) });
      if (userId) closeAccordion();
      await onSuccess();
    } catch (err) {
      $('uf-error').textContent = 'Błąd: ' + err.message;
      $('uf-error').style.display = 'block';
    }
    btn.disabled = false;
  });
}

async function loadUsers(bus, lus, buOpts) {
  const users = await api('/users');
  const tbody = $('users-tbody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Brak użytkowników</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (u) => `
    <tr class="accordion-trigger" data-id="${u.id}" style="cursor:pointer">
      <td>${u.id}</td><td><strong>${u.username}</strong></td><td>${u.first_name} ${u.last_name}</td>
      <td class="hide-mobile">${u.brigade || '—'}</td><td class="hide-mobile">${u.bu_id || '—'}</td>
      <td class="hide-mobile">${u.lu_id || '—'}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td><span class="badge badge-${u.active ? 'active' : 'inactive'}">${u.active ? 'Aktywny' : 'Nieaktywny'}</span></td>
    </tr>`,
    )
    .join('');

  tbody.querySelectorAll('.accordion-trigger').forEach((tr) => {
    tr.addEventListener('click', () => {
      const u = users.find((u) => u.id === parseInt(tr.dataset.id));
      if (!u) return;
      $('add-user-form').style.display = 'none';
      $('btn-add-user').textContent = '+ Dodaj użytkownika';
      openAccordion(tr, userFormHtml(buOpts, true), () => {
        $('uf-firstname').value = u.first_name;
        $('uf-lastname').value = u.last_name;
        $('uf-brigade').value = u.brigade || '';
        $('uf-role').value = u.role;
        if (u.bu_id) {
          $('uf-bu').value = u.bu_id;
          $('uf-bu').dispatchEvent(new Event('change'));
          setTimeout(() => {
            if (u.lu_id) $('uf-lu').value = u.lu_id;
          }, 50);
        }
        const reload = async () => {
          await loadUsers(bus, lus, buOpts);
          setTableBodyHeight('users-tbody');
        };
        initUserFormEvents(u.id, bus, lus, reload, u);
      });
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   LINKI
══════════════════════════════════════════════════════════════ */
let allGroups = [];

export async function renderLinks(container) {
  allGroups = await api('/groups');

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
      <div id="tab-links">
        <div class="accordion-add-bar"><button class="btn-sm" id="btn-add-link">+ Dodaj link</button></div>
        <div id="add-link-form" style="display:none"></div>
        <table class="admin-table">
          <thead><tr><th>ID</th><th>Typ</th><th>Klucz</th><th>Etykieta</th><th class="hide-mobile">Grupa</th><th class="hide-mobile">Primary</th></tr></thead>
          <tbody id="links-tbody"><tr><td colspan="6" class="loading-cell">Ładowanie...</td></tr></tbody>
        </table>
      </div>
      <div id="tab-groups" style="display:none">
        <div class="accordion-add-bar"><button class="btn-sm" id="btn-add-group">+ Dodaj grupę</button></div>
        <div id="add-group-form" style="display:none"></div>
        <table class="admin-table">
          <thead><tr><th>ID</th><th>Nazwa</th><th>Etykieta</th><th>Strona</th><th>Ikona <a href="https://lucide.dev/icons/" target="_blank" style="opacity:0.6;text-decoration:none">↗</a></th><th>Kolejność</th></tr></thead>
          <tbody id="groups-tbody"><tr><td colspan="6" class="loading-cell">Ładowanie...</td></tr></tbody>
        </table>
      </div>
    </div>`;

  if (window.lucide) lucide.createIcons();
  initTabSwitcher();

  $('btn-add-link').addEventListener('click', () => {
    const form = $('add-link-form');
    const open = form.style.display !== 'none';
    if (open) {
      form.style.display = 'none';
      $('btn-add-link').textContent = '+ Dodaj link';
      return;
    }
    closeAccordion();
    form.innerHTML = linkFormHtml(false);
    form.style.display = 'block';
    $('btn-add-link').textContent = '✕ Anuluj';
    if (window.lucide) lucide.createIcons();
    updateGroupDropdown($('lf-type').value);
    $('lf-type').addEventListener('change', () => updateGroupDropdown($('lf-type').value));
    initLinkFormEvents(null, async () => {
      form.style.display = 'none';
      $('btn-add-link').textContent = '+ Dodaj link';
      await loadLinks();
      setTableBodyHeight('links-tbody');
    });
  });

  $('btn-add-group').addEventListener('click', () => {
    const form = $('add-group-form');
    const open = form.style.display !== 'none';
    if (open) {
      form.style.display = 'none';
      $('btn-add-group').textContent = '+ Dodaj grupę';
      return;
    }
    closeAccordion();
    form.innerHTML = groupFormHtml(false);
    form.style.display = 'block';
    $('btn-add-group').textContent = '✕ Anuluj';
    if (window.lucide) lucide.createIcons();
    initGroupFormEvents(null, async () => {
      form.style.display = 'none';
      $('btn-add-group').textContent = '+ Dodaj grupę';
      allGroups = await api('/groups');
      await loadGroups();
      setTableBodyHeight('groups-tbody');
    });
  });

  await loadLinks();
  await loadGroups();
  initTableResize('links-tbody', 'groups-tbody');
}

function linkFormHtml(isEdit) {
  return `<div class="accordion-form">
    <div class="link-form-grid">
      ${!isEdit ? `<div class="form-field"><label>Klucz (link_key)</label><input type="text" id="lf-key" placeholder="np. portal_kierownika"/></div>` : ''}
      <div class="form-field"><label>Typ</label><select id="lf-type"><option value="tool">tool — Dashboard</option><option value="quick_link">quick_link — Sidebar</option><option value="spa">spa — SPA grid</option><option value="report">report — Raporty</option></select></div>
      <div class="form-field"><label>Etykieta</label><input type="text" id="lf-label" placeholder="np. Portal Kierownika"/></div>
      <div class="form-field"><label>URL</label><input type="text" id="lf-url" placeholder="#"/></div>
      <div class="form-field"><label>URL Pattern <span style="color:var(--text-muted);font-weight:400">(SPA: {lu})</span></label><input type="text" id="lf-pattern" placeholder="https://system/{lu}"/></div>
      <div class="form-field" id="lf-group-wrap"><label>Grupa <span style="color:var(--color-accent)">*</span></label><select id="lf-group-id"><option value="">— Wybierz —</option></select></div>
      <div class="form-field"><label>Kolejność</label><input type="number" id="lf-order" value="0"/></div>
      <div class="form-field form-field-check"><label><input type="checkbox" id="lf-primary"/> Wyróżniony (primary)</label></div>
      ${isEdit ? `<div class="form-field form-field-check"><label><input type="checkbox" id="lf-active" checked/> Aktywny</label></div>` : ''}
    </div>
    <div class="link-form-error" id="lf-error" style="display:none"></div>
    <div class="accordion-actions">
      <button class="btn-sm" id="lf-cancel">Anuluj</button>
      ${isEdit ? '<button class="btn-sm danger" id="lf-delete">Usuń</button>' : ''}
      <button class="btn-sm btn-primary" id="lf-save">Zapisz</button>
    </div>
  </div>`;
}

function updateGroupDropdown(type) {
  const pageMap = { tool: 'dashboard', report: 'reports', quick_link: 'sidebar', spa: null };
  const page = pageMap[type];
  const sel = $('lf-group-id'),
    wrap = $('lf-group-wrap');
  if (!sel || !wrap) return;
  if (!page) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';
  sel.innerHTML = '<option value="">— Wybierz —</option>';
  allGroups
    .filter((g) => g.page === page)
    .forEach((g) => {
      const o = document.createElement('option');
      o.value = g.id;
      o.textContent = g.label;
      sel.appendChild(o);
    });
}

function initLinkFormEvents(linkId, onSuccess) {
  $('lf-cancel')?.addEventListener('click', () => {
    if (linkId) closeAccordion();
    else {
      $('add-link-form').style.display = 'none';
      $('btn-add-link').textContent = '+ Dodaj link';
    }
  });
  $('lf-delete')?.addEventListener('click', async () => {
    if (!confirm('Usunąć ten link?')) return;
    try {
      await api(`/links/${linkId}`, { method: 'DELETE' });
      await reloadUI();
      closeAccordion();
      await loadLinks();
      setTableBodyHeight('links-tbody');
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  });
  $('lf-save')?.addEventListener('click', async () => {
    const btn = $('lf-save');
    btn.disabled = true;
    $('lf-error').style.display = 'none';
    const type = $('lf-type').value;
    const groupId = $('lf-group-id')?.value || null;
    if (['tool', 'report', 'quick_link'].includes(type) && !groupId) {
      $('lf-error').textContent = 'Wybierz grupę';
      $('lf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }
    const label = $('lf-label').value.trim();
    if (!label) {
      $('lf-error').textContent = 'Etykieta jest wymagana';
      $('lf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }
    const data = {
      type,
      label,
      url: $('lf-url').value.trim() || '#',
      url_pattern: $('lf-pattern').value.trim() || null,
      group_id: groupId ? parseInt(groupId) : null,
      display_order: parseInt($('lf-order').value) || 0,
      is_primary: $('lf-primary').checked,
      active: $('lf-active') ? ($('lf-active').checked ? 1 : 0) : 1,
    };
    if (!linkId) {
      data.link_key = $('lf-key')?.value.trim();
      if (!data.link_key) {
        $('lf-error').textContent = 'Klucz jest wymagany';
        $('lf-error').style.display = 'block';
        btn.disabled = false;
        return;
      }
    }
    try {
      if (linkId) await api(`/links/${linkId}`, { method: 'PATCH', body: JSON.stringify(data) });
      else await api('/links', { method: 'POST', body: JSON.stringify(data) });
      await reloadUI();
      await onSuccess();
    } catch (err) {
      $('lf-error').textContent = 'Błąd: ' + err.message;
      $('lf-error').style.display = 'block';
    }
    btn.disabled = false;
  });
}

async function loadLinks() {
  const links = await api('/links');
  const tbody = $('links-tbody');
  if (!links.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Brak linków</td></tr>';
    return;
  }
  tbody.innerHTML = links
    .map(
      (l) => `
    <tr class="accordion-trigger" data-id="${l.id}" style="cursor:pointer">
      <td>${l.id}</td><td><span class="badge badge-${l.type}">${l.type}</span></td>
      <td><code>${l.link_key}</code></td><td>${l.label}</td>
      <td class="hide-mobile">${l.group_label || l.group_name || '—'}</td>
      <td class="hide-mobile">${l.is_primary ? '<span class="badge badge-active">✓</span>' : '—'}</td>
    </tr>`,
    )
    .join('');

  tbody.querySelectorAll('.accordion-trigger').forEach((tr) => {
    tr.addEventListener('click', () => {
      const link = links.find((l) => l.id === parseInt(tr.dataset.id));
      if (!link) return;
      $('add-link-form').style.display = 'none';
      $('btn-add-link').textContent = '+ Dodaj link';
      openAccordion(tr, linkFormHtml(true), () => {
        $('lf-type').value = link.type;
        $('lf-label').value = link.label;
        $('lf-url').value = link.url || '';
        $('lf-pattern').value = link.url_pattern || '';
        $('lf-order').value = link.display_order || 0;
        $('lf-primary').checked = !!link.is_primary;
        if ($('lf-active')) $('lf-active').checked = link.active !== 0;
        $('lf-type').addEventListener('change', () => updateGroupDropdown($('lf-type').value));
        updateGroupDropdown(link.type);
        if (link.group_id)
          setTimeout(() => {
            $('lf-group-id').value = link.group_id;
          }, 0);
        initLinkFormEvents(link.id, async () => {
          closeAccordion();
          await loadLinks();
          setTableBodyHeight('links-tbody');
        });
      });
    });
  });
}

function groupFormHtml(isEdit) {
  return `<div class="accordion-form">
    <div class="link-form-grid">
      ${!isEdit ? `<div class="form-field"><label>Nazwa (klucz)</label><input type="text" id="gf-name" placeholder="np. Produkcja"/></div>` : ''}
      <div class="form-field"><label>Etykieta</label><input type="text" id="gf-label" placeholder="np. Produkcja"/></div>
      <div class="form-field"><label>Ikona Lucide</label><input type="text" id="gf-icon" placeholder="np. factory" value="layout-grid"/></div>
      <div class="form-field"><label>Strona</label><select id="gf-page"><option value="dashboard">Dashboard</option><option value="reports">Raporty</option><option value="sidebar">Sidebar (Quick Links)</option></select></div>
      <div class="form-field"><label>Kolejność</label><input type="number" id="gf-order" value="0"/></div>
    </div>
    <div class="link-form-error" id="gf-error" style="display:none"></div>
    <div class="accordion-actions">
      <button class="btn-sm" id="gf-cancel">Anuluj</button>
      ${isEdit ? '<button class="btn-sm danger" id="gf-delete">Usuń</button>' : ''}
      <button class="btn-sm btn-primary" id="gf-save">Zapisz</button>
    </div>
  </div>`;
}

function initGroupFormEvents(groupId, onSuccess) {
  $('gf-cancel')?.addEventListener('click', () => {
    if (groupId) closeAccordion();
    else {
      $('add-group-form').style.display = 'none';
      $('btn-add-group').textContent = '+ Dodaj grupę';
    }
  });
  $('gf-delete')?.addEventListener('click', async () => {
    if (!confirm('Usunąć grupę? Linki zostaną odłączone.')) return;
    try {
      await api(`/groups/${groupId}`, { method: 'DELETE' });
      allGroups = await api('/groups');
      await reloadUI();
      closeAccordion();
      await loadGroups();
      setTableBodyHeight('groups-tbody');
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  });
  $('gf-save')?.addEventListener('click', async () => {
    const btn = $('gf-save');
    btn.disabled = true;
    $('gf-error').style.display = 'none';
    const data = {
      name: $('gf-name')?.value.trim(),
      label: $('gf-label').value.trim(),
      icon: $('gf-icon').value.trim() || 'layout-grid',
      page: $('gf-page').value,
      display_order: parseInt($('gf-order').value) || 0,
    };
    if (!data.label || (!groupId && !data.name)) {
      $('gf-error').textContent = 'Wypełnij wymagane pola';
      $('gf-error').style.display = 'block';
      btn.disabled = false;
      return;
    }
    try {
      if (groupId) await api(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(data) });
      else await api('/groups', { method: 'POST', body: JSON.stringify(data) });
      allGroups = await api('/groups');
      await reloadUI();
      await onSuccess();
    } catch (err) {
      $('gf-error').textContent = 'Błąd: ' + err.message;
      $('gf-error').style.display = 'block';
    }
    btn.disabled = false;
  });
}

async function loadGroups() {
  const groups = await api('/groups');
  allGroups = groups;
  const tbody = $('groups-tbody');
  if (!groups.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Brak grup</td></tr>';
    return;
  }
  const pL = { dashboard: 'Dashboard', reports: 'Raporty', sidebar: 'Sidebar' };
  const pB = { dashboard: 'active', reports: 'tool', sidebar: 'pending' };
  tbody.innerHTML = groups
    .map(
      (g) => `
    <tr class="accordion-trigger" data-id="${g.id}" style="cursor:pointer">
      <td>${g.id}</td><td><code>${g.name}</code></td><td>${g.label}</td>
      <td><span class="badge badge-${pB[g.page] || 'user'}">${pL[g.page] || g.page}</span></td>
      <td>${g.icon}</td><td>${g.display_order}</td>
    </tr>`,
    )
    .join('');

  tbody.querySelectorAll('.accordion-trigger').forEach((tr) => {
    tr.addEventListener('click', () => {
      const g = groups.find((g) => g.id === parseInt(tr.dataset.id));
      if (!g) return;
      $('add-group-form').style.display = 'none';
      $('btn-add-group').textContent = '+ Dodaj grupę';
      openAccordion(tr, groupFormHtml(true), () => {
        $('gf-label').value = g.label;
        $('gf-icon').value = g.icon || 'layout-grid';
        $('gf-page').value = g.page;
        $('gf-order').value = g.display_order || 0;
        initGroupFormEvents(g.id, async () => {
          closeAccordion();
          await loadGroups();
          setTableBodyHeight('groups-tbody');
        });
      });
    });
  });
}

function initTabSwitcher() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('tab-active'));
      btn.classList.add('tab-active');
      const tab = btn.dataset.tab;
      $('tab-links').style.display = tab === 'links' ? '' : 'none';
      $('tab-groups').style.display = tab === 'groups' ? '' : 'none';
      closeAccordion();
      setTimeout(() => {
        if (tab === 'links') setTableBodyHeight('links-tbody');
        if (tab === 'groups') setTableBodyHeight('groups-tbody');
      }, 0);
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   RESETY HASŁA
══════════════════════════════════════════════════════════════ */
export async function renderResets(container) {
  container.innerHTML = `
    <div class="panel-card">
      <div class="panel-header">
        <i data-lucide="key" style="width:12px;height:12px;color:var(--color-accent)"></i>
        <span class="panel-title">Prośby o reset hasła</span>
        <div class="panel-title-line"></div>
      </div>
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Użytkownik</th><th>Data</th><th>Status</th></tr></thead>
        <tbody id="resets-tbody"><tr><td colspan="4" class="loading-cell">Ładowanie...</td></tr></tbody>
      </table>
    </div>`;
  if (window.lucide) lucide.createIcons();
  await loadResets();
  initTableResize('resets-tbody');
}

async function loadResets() {
  const reqs = await api('/reset-requests');
  const tbody = $('resets-tbody');
  if (!reqs.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Brak próśb</td></tr>';
    return;
  }
  tbody.innerHTML = reqs
    .map(
      (r) => `
    <tr class="${r.status === 'pending' ? 'accordion-trigger' : ''}" data-id="${r.id}" style="${r.status === 'pending' ? 'cursor:pointer' : ''}">
      <td>${r.id}</td><td><strong>${r.first_name} ${r.last_name}</strong> (${r.username})</td>
      <td>${new Date(r.requested_at).toLocaleString('pl-PL')}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
    </tr>`,
    )
    .join('');

  tbody.querySelectorAll('.accordion-trigger').forEach((tr) => {
    tr.addEventListener('click', () => {
      const r = reqs.find((r) => r.id === parseInt(tr.dataset.id));
      if (!r) return;
      openAccordion(
        tr,
        `<div class="accordion-form">
        <p style="font-size:var(--font-sm);color:var(--text-secondary);margin-bottom:12px">Reset dla: <strong>${r.first_name} ${r.last_name}</strong> (${r.username})</p>
        <div class="accordion-actions">
          <button class="btn-sm" id="rst-cancel">Anuluj</button>
          <button class="btn-sm danger" id="rst-reject">Odrzuć</button>
          <button class="btn-sm btn-primary" id="rst-done">Zresetowano</button>
        </div>
      </div>`,
        () => {
          $('rst-cancel').addEventListener('click', closeAccordion);
          $('rst-done').addEventListener('click', async () => {
            try {
              await api(`/reset-requests/${r.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'done' }) });
              closeAccordion();
              await loadResets();
              setTableBodyHeight('resets-tbody');
            } catch (err) {
              alert('Błąd: ' + err.message);
            }
          });
          $('rst-reject').addEventListener('click', async () => {
            try {
              await api(`/reset-requests/${r.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) });
              closeAccordion();
              await loadResets();
              setTableBodyHeight('resets-tbody');
            } catch (err) {
              alert('Błąd: ' + err.message);
            }
          });
        },
      );
    });
  });
}

/* ── Placeholder ── */
export function renderPlaceholder(title, icon) {
  return (container) => {
    container.innerHTML = `<div class="card" style="flex:1;display:flex;align-items:center;justify-content:center">
      <div class="empty-state"><i data-lucide="${icon}" style="width:24px;height:24px;opacity:0.15"></i><p>${title} — wkrótce</p></div>
    </div>`;
    if (window.lucide) lucide.createIcons();
  };
}
