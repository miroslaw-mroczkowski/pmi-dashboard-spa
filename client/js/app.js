'use strict';

/* ============================================================
   app.js — Główny moduł SPA (init, router, globalne funkcje)
   ============================================================ */

import * as DB from './db.js';
import * as Data from './data.js';
import * as Weather from './weather.js';
import * as UI from './ui.js';
import * as Popup from './popup.js';
import * as Router from './router.js';
import { renderOverview, renderUsers, renderLinks, renderResets, renderPlaceholder } from './admin-pages.js';

/* ── Pokaż app po zalogowaniu ── */
export function showApp(user) {
  document.getElementById('popup-overlay').style.display = 'none';
  const app = document.getElementById('app');
  if (app) app.style.display = 'flex';

  const normalized = {
    ...user,
    role: user.role || 'user',
    userBU: user.bu_id || user.userBU,
    userLU: user.lu_id || user.userLU,
    userName: user.first_name || user.userName,
    userBrigade: user.brigade || user.userBrigade,
  };

  // Topbar + sidebar dane
  UI.renderUserInfo(normalized);
  UI.renderBUNav(normalized.userBU, normalized.userLU);
  UI.renderQuickLinks();

  // Buduj nawigację per rola
  Router.buildNav(normalized);

  // Startuj na dashboard
  Router.navigate('dashboard');

  // Pogoda
  Weather.load();
}

/* ── Rejestracja stron ── */
function registerPages() {
  // User pages
  Router.register('dashboard', (container, user) => UI.renderDashboardPage(container, user));
  Router.register('reports', renderPlaceholder('Raporty', 'bar-chart-2'));
  Router.register('contacts', renderPlaceholder('Kontakty', 'phone'));
  Router.register('documents', renderPlaceholder('Dokumenty', 'file-text'));

  // Admin pages
  Router.register('admin-overview', (container) => renderOverview(container));
  Router.register('admin-users', (container) => renderUsers(container));
  Router.register('admin-links', (container) => renderLinks(container));
  Router.register('admin-resets', (container) => renderResets(container));
  Router.register('admin-structure', renderPlaceholder('Struktura (BU / Celki / Linie)', 'network'));
  Router.register('admin-contacts', renderPlaceholder('Kontakty (zarządzanie)', 'phone-forwarded'));
  Router.register('admin-calendar', renderPlaceholder('Kalendarz zmianowy', 'calendar'));
}

/* ── Globalne — wywoływane z HTML onclick ── */
window.setTheme = (theme) => UI.applyTheme(theme);
window.openSettings = () => Popup.open(true);

window.toggleSidebar = () => {
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (!sb) return;
  const isOpen = sb.classList.toggle('open');
  if (ov) ov.classList.toggle('visible', isOpen);
};

window.closeSidebar = () => {
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('visible');
};

/* ── Init ── */
async function init() {
  try {
    await Data.loadAll();
    const saved = await DB.getAll();
    UI.applyTheme(saved.theme || 'light');
    UI.startClock();
    Popup.initEvents();
    registerPages();

    const token = saved.token;
    if (!token) {
      Popup.open();
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        await DB.set('token', null);
        await DB.set('user', null);
        Popup.open();
      } else {
        // Zawsze czytaj dane z tokena JWT (nie z IndexedDB) żeby mieć aktualne dane
        const userFromToken = {
          id: payload.id,
          username: payload.username,
          role: payload.role,
          brigade: payload.brigade,
          lu_id: payload.lu_id,
          bu_id: payload.bu_id,
          first_name: payload.first_name,
          last_name: payload.last_name,
        };
        showApp(userFromToken);
      }
    } catch {
      Popup.open();
    }
  } catch (err) {
    console.error('PMI Dashboard – błąd:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
