'use strict';

/* ============================================================
   ui.js — Renderowanie dashboardu (jako strona SPA)
   ============================================================ */

import * as DB from './db.js';
import * as Data from './data.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

let state = { bu: null, lu: null };
let spaObservers = [];

/* ── Zegar ── */
const DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const MONTHS = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

export function startClock() {
  function tick() {
    const now = new Date();
    const dateEl = $('date-display');
    const timeEl = $('time-display');
    if (dateEl)
      dateEl.textContent = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

/* ── Motyw ── */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('theme-light')?.classList.toggle('active', theme === 'light');
  $('theme-dark')?.classList.toggle('active', theme === 'dark');
  DB.set('theme', theme);
}

/* ── Topbar info ── */
export function renderUserInfo(user) {
  const initials = (user.userName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  if ($('user-avatar')) $('user-avatar').textContent = initials;
  if ($('user-name-display')) $('user-name-display').textContent = user.userName || '—';
  if ($('user-bu-display')) $('user-bu-display').textContent = user.userBU || '—';
  if ($('user-lu-display')) $('user-lu-display').textContent = user.userLU || '—';
  if ($('user-brigade-display')) $('user-brigade-display').textContent = user.userBrigade || '—';
}

/* ── Sidebar BU/LU ── */
export function renderBUNav(userBU, userLU) {
  state.bu = userBU;
  state.lu = userLU;

  const buSel = $('sb-bu-select');
  const luSel = $('sb-lu-select');
  const luWrap = $('sb-lu-wrap');
  if (!buSel) return;

  buSel.innerHTML = '<option value="">— Select Unit —</option>';
  Data.getBUs().forEach((bu) => {
    const opt = document.createElement('option');
    opt.value = bu.id;
    opt.textContent = bu.id;
    if (bu.id === userBU) opt.selected = true;
    buSel.appendChild(opt);
  });
  buSel.classList.toggle('selected', !!userBU);

  if (userBU) {
    fillLUSelect(userBU, userLU);
    luWrap.style.display = 'block';
  }

  buSel.onchange = () => {
    const buId = buSel.value;
    buSel.classList.toggle('selected', !!buId);
    if (buId) {
      fillLUSelect(buId, null);
      luWrap.style.display = 'block';
      renderSPA(null, buId);
      setTimeout(initSpaScale, 50);
    } else {
      luWrap.style.display = 'none';
    }
  };

  luSel.onchange = () => {
    const luId = luSel.value;
    const buId = buSel.value;
    luSel.classList.toggle('selected', !!luId);
    if (luId && buId) {
      state.lu = luId;
      state.bu = buId;
      DB.set('userLU', luId);
      DB.set('userBU', buId);
      renderSPA(luId, buId);
      setTimeout(initSpaScale, 50);
    }
  };
}

function fillLUSelect(buId, selectedLU) {
  const luSel = $('sb-lu-select');
  if (!luSel) return;
  luSel.innerHTML = '<option value="">— Select Cell —</option>';
  Data.getLUsByBU(buId).forEach((luId) => {
    const opt = document.createElement('option');
    opt.value = luId;
    opt.textContent = luId;
    if (luId === selectedLU) opt.selected = true;
    luSel.appendChild(opt);
  });
  luSel.classList.toggle('selected', !!selectedLU);
}

/* ── Quick Links ── */
export function renderQuickLinks() {
  const container = $('quicklinks-container');
  if (!container) return;
  container.innerHTML = '';

  const groups = Data.getQuickLinkGroups();
  const items = groups?.length ? groups : [{ label: null, links: [] }];

  items.forEach((group) => {
    const section = el('div', 'sb-section');
    const label = el('div', 'sb-section-label');
    label.textContent = group.label || 'Quick Links';
    section.appendChild(label);

    const list = el('div', 'ql-list');
    group.links.forEach((link) => {
      const a = el('a', 'ql-btn');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = link.label;
      list.appendChild(a);
    });
    section.appendChild(list);
    container.appendChild(section);
  });
}

/* ── Render dashboard PAGE (wywoływane przez router) ── */
export function renderDashboardPage(container, user) {
  container.innerHTML = `
    <!-- SPA -->
    <div class="spa-row-wrap">
      <div class="card spa-card">
        <div class="spa-panel">
          <div class="spa-panel-header">
            <i data-lucide="activity" style="width:12px;height:12px;color:var(--color-accent)"></i>
            <span class="card-title">SPA Live</span>
            <div class="card-title-line"></div>
          </div>
          <div class="spa-wrap" id="spa-life-grid"></div>
        </div>
        <div class="spa-separator"></div>
        <div class="spa-panel">
          <div class="spa-panel-header">
            <i data-lucide="clock" style="width:12px;height:12px;color:var(--color-accent)"></i>
            <span class="card-title">SPA Shifts</span>
            <div class="card-title-line"></div>
          </div>
          <div class="spa-wrap" id="spa-shifts-grid"></div>
        </div>
      </div>
      <div class="card spa-future-card">
        <div class="spa-panel-header">
          <i data-lucide="bar-chart-2" style="width:12px;height:12px;color:var(--color-accent)"></i>
          <span class="card-title">Coming Soon</span>
          <div class="card-title-line"></div>
        </div>
        <div class="spa-future-placeholder">
          <i data-lucide="clock" style="width:24px;height:24px;opacity:0.12"></i>
          <span>Tutaj pojawią się<br/>dodatkowe informacje</span>
        </div>
      </div>
    </div>

    <!-- Rząd 2: Produkcja + Codzienne -->
    <div class="tools-row tools-row-last" id="tools-row-2"></div>

    <!-- Rząd 3: Jakość & Safety + pozostałe grupy -->
    <div class="tools-row tools-row-last" id="tools-row-3"></div>`;

  renderSPA(user.userLU, user.userBU);
  renderToolGroups();
  if (window.lucide) lucide.createIcons();
  setTimeout(initSpaScale, 50);
}

/* ── SPA grid ── */
function renderSPA(myLU, myBU) {
  const buId = myBU || state.bu;
  const luIds = Data.getLUsByBU(buId);
  const spas = Data.getSpaLinks();

  ['spa-life-grid', 'spa-shifts-grid'].forEach((gridId, idx) => {
    const grid = $(gridId);
    if (!grid) return;
    grid.innerHTML = '';

    const spa = spas[idx];
    if (!spa) return;

    const leftLUs = luIds.filter((id) => (Data.getLUData(id)?.lines || [id]).length === 3);
    const rightLUs = luIds
      .filter((id) => (Data.getLUData(id)?.lines || [id]).length !== 3)
      .sort((a, b) => (Data.getLUData(a)?.lines || [a]).length - (Data.getLUData(b)?.lines || [b]).length);

    const spaLabel = spa.id === 'spa_life' ? 'life' : 'shifts';

    const makeBtn = (lineNum, isMine) => {
      const btn = el('a', `spa-btn${isMine ? ' mine' : ''}`);
      btn.href = Data.getSpaUrl(spa.id, lineNum);
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.innerHTML = `<div class="spa-num${isMine ? ' mine' : ''}">${lineNum}</div>
        <div class="spa-sub${isMine ? ' mine' : ''}">${spaLabel}</div>`;
      return btn;
    };

    leftLUs.forEach((luId) => {
      const luData = Data.getLUData(luId);
      const isMine = luId === myLU;
      const lines = luData?.lines || [luId];
      const colLeft = el('div', `spa-col-left${isMine ? ' mine' : ''}`);
      lines.forEach((ln) => colLeft.appendChild(makeBtn(ln, isMine)));
      grid.appendChild(colLeft);
    });

    if (rightLUs.length) {
      const hasPairs = rightLUs.some((id) => (Data.getLUData(id)?.lines || [id]).length > 2);
      const colRight = el('div', hasPairs ? 'spa-col-right paired' : 'spa-col-right');
      rightLUs.forEach((luId) => {
        const luData = Data.getLUData(luId);
        const isMine = luId === myLU;
        const lines = luData?.lines || [luId];
        if (lines.length <= 2) {
          const group = el('div', `spa-group${isMine ? ' mine' : ''}`);
          lines.forEach((ln) => group.appendChild(makeBtn(ln, isMine)));
          colRight.appendChild(group);
        } else {
          for (let i = 0; i < lines.length; i += 2) {
            const group = el('div', `spa-group${isMine ? ' mine' : ''}`);
            lines.slice(i, i + 2).forEach((ln) => group.appendChild(makeBtn(ln, isMine)));
            colRight.appendChild(group);
          }
        }
      });
      grid.appendChild(colRight);
    }
  });
  if (window.lucide) lucide.createIcons();
}

/* ── Narzędzia — karty per group_name ── */
const GROUP_CONFIG = {
  Produkcja: { row: 2, icon: 'factory', label: 'Produkcja' },
  Codzienne: { row: 2, icon: 'check-square', label: 'Codzienne' },
  Jakość: { row: 3, icon: 'shield-check', label: 'Jakość & BHP' },
};

function renderToolGroups() {
  const tools = Data.getTools();
  if (!tools.length) return;

  const grouped = {};
  const ungrouped = [];

  tools.forEach((tool) => {
    if (tool.group) {
      if (!grouped[tool.group]) grouped[tool.group] = [];
      grouped[tool.group].push(tool);
    } else {
      ungrouped.push(tool);
    }
  });

  const row2 = $('tools-row-2');
  const row3 = $('tools-row-3');

  Object.entries(GROUP_CONFIG).forEach(([groupName, config]) => {
    const items = grouped[groupName];
    if (!items?.length) return;
    const card = makeToolCard(groupName, config.label, config.icon, items);
    if (config.row === 2 && row2) row2.appendChild(card);
    else if (config.row === 3 && row3) row3.appendChild(card);
  });

  Object.entries(grouped).forEach(([groupName, items]) => {
    if (GROUP_CONFIG[groupName]) return;
    const card = makeToolCard(groupName, groupName, 'layout-grid', items);
    if (row3) row3.appendChild(card);
  });

  if (ungrouped.length) {
    const card = makeToolCard('ungrouped', 'Inne', 'grid', ungrouped);
    if (row3) row3.appendChild(card);
  }

  if (window.lucide) lucide.createIcons();
}

function makeToolCard(id, label, icon, tools) {
  const card = el('div', 'card tool-group-card');
  card.innerHTML = `
    <div class="card-header">
      <i data-lucide="${icon}" style="width:12px;height:12px;color:var(--color-accent)"></i>
      <span class="card-title">${label}</span>
      <div class="card-title-line"></div>
    </div>
    <div class="tools-grid" id="tools-grid-${id}"></div>`;

  const grid = card.querySelector(`#tools-grid-${id}`);
  tools.forEach((tool) => {
    const btn = el('a', `tool-btn${tool.primary ? ' primary' : ''}`);
    btn.href = tool.url;
    btn.rel = 'noopener noreferrer';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(tool.url, '_blank', 'noopener,noreferrer');
    });
    btn.innerHTML = `<div class="tool-label">${tool.label}</div>`;
    grid.appendChild(btn);
  });

  return card;
}

/* ── SPA auto-scale ── */
function initSpaScale() {
  spaObservers.forEach((ro) => ro.disconnect());
  spaObservers = [];
  const naturalSizes = {};

  function applyScale(panel, wrap) {
    const { w, h } = naturalSizes[wrap.id] || {};
    if (!w) return;
    const style = getComputedStyle(panel);
    const paddingH = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const extraMargin = Math.min(32, panel.clientWidth * 0.06);
    const avail = panel.clientWidth - paddingH - extraMargin;
    const scale = Math.min(1, avail / w);
    if (scale < 0.98) {
      wrap.style.transform = `scale(${scale.toFixed(3)})`;
      wrap.style.transformOrigin = 'center top';
      wrap.style.height = h + 'px';
      wrap.style.marginBottom = Math.round(h * scale - h) + 'px';
    } else {
      wrap.style.transform = '';
      wrap.style.height = '';
      wrap.style.marginBottom = '';
    }
  }

  ['spa-life-grid', 'spa-shifts-grid'].forEach((id) => {
    const wrap = $(id);
    if (!wrap) return;
    const panel = wrap.closest('.spa-panel');
    if (!panel) return;
    wrap.style.transform = '';
    wrap.style.height = '';
    wrap.style.marginBottom = '';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrap.style.width = 'max-content';
        naturalSizes[id] = { w: wrap.scrollWidth, h: wrap.scrollHeight };
        wrap.style.width = '';
        const ro = new ResizeObserver(() => applyScale(panel, wrap));
        ro.observe(panel);
        spaObservers.push(ro);
        applyScale(panel, wrap);
      });
    });
  });
}
