'use strict';

/* ============================================================
   popup.js — Logowanie, zmiana hasła, wylogowanie
   ============================================================ */

import * as DB from './db.js';
import { showApp } from './app.js';

const $ = (id) => document.getElementById(id);

const PASSWORD_FIELDS = ['input-old-password', 'input-new-password', 'input-new-password2'];

/** Wyczyść pola i komunikaty zmiany hasła */
function resetChangePasswordView() {
  $('popup-change-password').style.display = 'none';
  $('change-password-error').style.display = 'none';
  $('change-password-success').style.display = 'none';
  PASSWORD_FIELDS.forEach((id) => { const el = $(id); if (el) el.value = ''; });
}

/* ── Otwórz popup ── */
export function open(fromSettings = false) {
  $('input-username').value = '';
  $('input-password').value = '';
  $('login-error').style.display = 'none';

  const closeBtn = $('popup-close');
  if (closeBtn) closeBtn.style.display = fromSettings ? 'flex' : 'none';

  $('popup-overlay').onclick = fromSettings
    ? (e) => { if (e.target === $('popup-overlay')) close(); }
    : null;

  resetChangePasswordView();

  DB.get('user').then((userStr) => {
    if (fromSettings && userStr) {
      const user = JSON.parse(userStr);
      $('popup-username').textContent = user.first_name || user.username;
      $('popup-logged-in').style.display = 'block';
      $('popup-login-form').style.display = 'none';
    } else {
      $('popup-logged-in').style.display = 'none';
      $('popup-login-form').style.display = 'block';
    }
  });

  $('popup-overlay').style.display = 'flex';
  if (window.lucide) lucide.createIcons();
}

export function close() {
  $('popup-overlay').style.display = 'none';
}

/* ── Przełączanie widoków ── */
function showLoggedIn() {
  $('popup-logged-in').style.display = 'block';
  $('popup-login-form').style.display = 'none';
  resetChangePasswordView();
}

function showChangePassword() {
  $('popup-logged-in').style.display = 'none';
  $('popup-login-form').style.display = 'none';
  $('popup-change-password').style.display = 'block';
}

/* ── Wylogowanie ── */
async function logout() {
  await DB.set('token', null);
  await DB.set('user', null);
  $('popup-logged-in').style.display = 'none';
  $('popup-login-form').style.display = 'block';
  $('popup-close').style.display = 'none';
  $('popup-overlay').onclick = null;
}

/* ── Zmiana hasła ── */
async function changePassword() {
  const oldPw = $('input-old-password')?.value;
  const newPw = $('input-new-password')?.value;
  const newPw2 = $('input-new-password2')?.value;
  const errorEl = $('change-password-error');
  const successEl = $('change-password-success');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  if (!oldPw || !newPw || !newPw2) {
    return showError(errorEl, 'Wypełnij wszystkie pola.');
  }
  if (newPw !== newPw2) {
    return showError(errorEl, 'Nowe hasła nie są identyczne.');
  }
  if (newPw.length < 6) {
    return showError(errorEl, 'Nowe hasło musi mieć minimum 6 znaków.');
  }

  try {
    const token = await DB.get('token');
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
    });
    const data = await res.json();

    if (!res.ok) {
      return showError(errorEl, data.error || 'Błąd zmiany hasła.');
    }

    successEl.style.display = 'block';
    PASSWORD_FIELDS.forEach((id) => { const el = $(id); if (el) el.value = ''; });
    setTimeout(() => close(), 1500);
  } catch (err) {
    console.error('Change password error:', err);
    showError(errorEl, 'Błąd połączenia z serwerem.');
  }
}

function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

/* ── Logowanie ── */
async function submit() {
  const username = $('input-username')?.value.trim();
  const password = $('input-password')?.value;
  const errorEl = $('login-error');

  if (!username || !password) return;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) { errorEl.style.display = 'block'; return; }

    await DB.set('token', data.token);
    await DB.set('user', JSON.stringify(data.user));
    close();
    showApp(data.user);
  } catch (err) {
    console.error('Login error:', err);
    errorEl.style.display = 'block';
  }
}

/* ── Inicjalizacja eventów ── */
export function initEvents() {
  // Toggley hasła (oczko)
  document.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.target || 'input-password');
      const icon = btn.querySelector('i');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      icon.setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
      if (window.lucide) lucide.createIcons();
    });
  });

  // Enter w polach logowania
  ['input-username', 'input-password'].forEach((id) => {
    $(id)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    $(id)?.addEventListener('input', () => { $('login-error').style.display = 'none'; });
  });

  $('popup-submit')?.addEventListener('click', submit);
  $('popup-close')?.addEventListener('click', close);
  $('popup-logout')?.addEventListener('click', logout);
  $('popup-change-link')?.addEventListener('click', showChangePassword);
  $('popup-back')?.addEventListener('click', showLoggedIn);
  $('popup-change-submit')?.addEventListener('click', changePassword);
}
