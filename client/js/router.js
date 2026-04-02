'use strict';

/* ============================================================
   router.js — SPA router (podmienia content, buduje menu)
   ============================================================ */

const $ = (id) => document.getElementById(id);
let currentPage = null;
let currentUser = null;
let pages = {};

/* ── Definicje stron ── */

// Strony dostępne dla wszystkich zalogowanych
const USER_PAGES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'layout-dashboard',
    svg: `<svg class="nav-icon" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="2" fill="currentColor"/><rect x="10" y="1" width="7" height="7" rx="2" fill="currentColor" opacity=".35"/><rect x="1" y="10" width="7" height="7" rx="2" fill="currentColor" opacity=".35"/><rect x="10" y="10" width="7" height="7" rx="2" fill="currentColor" opacity=".35"/></svg>`,
  },
  { id: 'reports', label: 'Raporty', icon: 'bar-chart-2' },
  { id: 'contacts', label: 'Kontakty', icon: 'phone' },
  { id: 'documents', label: 'Dokumenty', icon: 'file-text' },
];

// Strony tylko dla admina
const ADMIN_PAGES = [
  { id: 'admin-overview', label: 'Przegląd Admin', icon: 'shield' },
  { id: 'admin-users', label: 'Użytkownicy', icon: 'users' },
  { id: 'admin-links', label: 'Linki', icon: 'link' },
  { id: 'admin-structure', label: 'Struktura', icon: 'network' },
  { id: 'admin-contacts', label: 'Kontakty (admin)', icon: 'phone-forwarded' },
  { id: 'admin-calendar', label: 'Kalendarz', icon: 'calendar' },
  { id: 'admin-resets', label: 'Resety hasła', icon: 'key', badge: 'nav-resets-badge' },
];

/* ── Rejestracja strony ── */
export function register(id, renderFn) {
  pages[id] = renderFn;
}

/* ── Buduj nawigację na podstawie roli ── */
export function buildNav(user) {
  currentUser = user;
  const nav = $('sb-nav');
  nav.innerHTML = '';

  const isAdmin = user.role === 'admin';
  const allPages = isAdmin ? [...USER_PAGES, null, ...ADMIN_PAGES] : USER_PAGES;

  allPages.forEach((page) => {
    if (page === null) {
      // Divider
      const div = document.createElement('div');
      div.className = 'nav-divider';
      nav.appendChild(div);
      return;
    }

    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.dataset.page = page.id;

    const iconHtml = page.svg ? page.svg : `<i data-lucide="${page.icon}" style="width:14px;height:14px"></i>`;

    let badgeHtml = '';
    if (page.badge) {
      badgeHtml = `<span class="nav-badge" id="${page.badge}" style="display:none">0</span>`;
    }

    btn.innerHTML = `${iconHtml}<span>${page.label}</span>${badgeHtml}`;

    btn.addEventListener('click', () => navigate(page.id));
    nav.appendChild(btn);
  });

  if (window.lucide) lucide.createIcons();
}

/* ── Nawigacja ── */
export function navigate(pageId) {
  // BU/LU zawsze widoczne (niezależnie od strony)

  // Active state w menu
  document.querySelectorAll('.nav-item[data-page]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  // Renderuj stronę
  const content = $('content');
  const renderFn = pages[pageId];

  if (renderFn) {
    currentPage = pageId;
    renderFn(content, currentUser);
  } else {
    content.innerHTML = `
      <div class="card" style="flex:1;display:flex;align-items:center;justify-content:center">
        <div class="empty-state">
          <i data-lucide="construction" style="width:24px;height:24px;opacity:0.15"></i>
          <p>Strona "${pageId}" — wkrótce</p>
        </div>
      </div>`;
  }

  if (window.lucide) lucide.createIcons();

  // Zamknij sidebar na mobile
  const sb = document.querySelector('.sidebar');
  const ov = $('sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('visible');
}

export function getCurrentPage() {
  return currentPage;
}
