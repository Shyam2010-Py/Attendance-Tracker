/* ============================================
   Attendance Tracker — Authentication
   - Default password on first run: AT2026
   - Password is stored in localStorage as a SHA-256 hash
     (localStorage key: attendanceTracker.v1.passHash)
   - Active session flag: attendanceTracker.v1.session = 'granted'
   - Stored login time:   attendanceTracker.v1.loginAt
   ============================================ */

(function () {
  'use strict';

  const PASS_HASH_KEY = 'attendanceTracker.v1.passHash';
  const SESSION_KEY   = 'attendanceTracker.v1.session';
  const LOGIN_AT_KEY  = 'attendanceTracker.v1.loginAt';

  /** Default password (used only on very first run). */
  const DEFAULT_PASSWORD = 'AT2026';

  /* ---------- SHA-256 (no deps) ---------- */
  async function sha256(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /* ---------- Password storage ---------- */
  async function getStoredHash() {
    try {
      let h = localStorage.getItem(PASS_HASH_KEY);
      if (!h) {
        h = await sha256(DEFAULT_PASSWORD);
        localStorage.setItem(PASS_HASH_KEY, h);
      }
      return h;
    } catch (e) { return null; }
  }

  async function setPassword(newPassword) {
    const h = await sha256(newPassword);
    localStorage.setItem(PASS_HASH_KEY, h);
    return h;
  }

  /* ---------- Session ---------- */
  function isAuthenticated() {
    try { return localStorage.getItem(SESSION_KEY) === 'granted'; }
    catch (e) { return false; }
  }

  function grantSession() {
    localStorage.setItem(SESSION_KEY, 'granted');
    localStorage.setItem(LOGIN_AT_KEY, new Date().toISOString());
  }

  function loginTimeISO() {
    try { return localStorage.getItem(LOGIN_AT_KEY) || ''; }
    catch (e) { return ''; }
  }

  /* ---------- Logout (global so inline onclick works) ---------- */
  window.logout = function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LOGIN_AT_KEY);
    } catch (e) { /* ignore */ }
    location.replace('login.html');
  };

  /* ============================================
     LOGIN PAGE
     ============================================ */
  function initLoginPage() {
    const form        = document.getElementById('loginForm');
    if (!form) return;

    const passInput   = document.getElementById('loginPassword');
    const submitBtn   = document.getElementById('loginSubmit');
    const errorEl     = document.getElementById('loginError');
    const toggleBtn   = document.getElementById('togglePassword');
    const forgotLink  = document.getElementById('forgotLink');

    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.classList.add('show');
    }
    function clearError() {
      if (!errorEl) return;
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }

    // If already authenticated, go straight to dashboard.
    if (isAuthenticated()) {
      location.replace('index.html');
      return;
    }

    if (toggleBtn && passInput) {
      toggleBtn.addEventListener('click', () => {
        const isPw = passInput.type === 'password';
        passInput.type = isPw ? 'text' : 'password';
        toggleBtn.textContent = isPw ? '🙈' : '👁️';
        toggleBtn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
      });
    }

    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        showError('Hint: the default password is AT2026. You can change it from Settings → Security after logging in.');
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const entered = (passInput.value || '').trim();
      if (!entered) { showError('Please enter the access code.'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Checking…';

      try {
        const stored = await getStoredHash();
        const enteredHash = await sha256(entered);
        if (enteredHash === stored) {
          grantSession();
          location.replace('index.html');
        } else {
          showError('❌ Incorrect access code. Please try again.');
          passInput.value = '';
          passInput.focus();
        }
      } catch (err) {
        showError('⚠️ Unable to verify access code in this browser.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🔓 Sign In';
      }
    });
  }

  /* ============================================
     SETTINGS → SECURITY TAB
     ============================================ */
  function initSecurityTab() {
    const changeForm = document.getElementById('changePassForm');
    if (!changeForm) return;

    const currentEl  = document.getElementById('currentPass');
    const newEl      = document.getElementById('newPass');
    const confirmEl  = document.getElementById('confirmPass');
    const msgEl      = document.getElementById('changePassMsg');
    const loginAtEl  = document.getElementById('sessionLoginAt');
    const logoutBtn  = document.getElementById('logoutBtn');

    function setMsg(text, type) {
      if (!msgEl) return;
      msgEl.textContent = text;
      msgEl.className = 'inline-msg ' + (type || '');
      if (text) {
        clearTimeout(setMsg._t);
        setMsg._t = setTimeout(() => {
          msgEl.textContent = '';
          msgEl.className = 'inline-msg';
        }, 4000);
      }
    }

    // Display session start time
    if (loginAtEl) {
      const iso = loginTimeISO();
      if (iso) {
        try {
          loginAtEl.textContent = new Date(iso).toLocaleString();
        } catch { loginAtEl.textContent = '—'; }
      } else {
        loginAtEl.textContent = '—';
      }
    }

    // Password show/hide toggles
    document.querySelectorAll('[data-toggle-pw]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.getAttribute('data-toggle-pw'));
        if (!target) return;
        const isPw = target.type === 'password';
        target.type = isPw ? 'text' : 'password';
        btn.textContent = isPw ? '🙈' : '👁️';
      });
    });

    changeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setMsg('');

      const current  = (currentEl.value  || '').trim();
      const next     = (newEl.value      || '').trim();
      const confirmV = (confirmEl.value  || '').trim();

      if (!current || !next || !confirmV) {
        setMsg('Please fill in all three fields.', 'error'); return;
      }
      if (next.length < 4) {
        setMsg('New password must be at least 4 characters.', 'error'); return;
      }
      if (next !== confirmV) {
        setMsg('New password and confirmation do not match.', 'error'); return;
      }
      if (next === current) {
        setMsg('New password must be different from the current one.', 'error'); return;
      }

      const stored = await getStoredHash();
      const currentHash = await sha256(current);
      if (currentHash !== stored) {
        setMsg('Current password is incorrect.', 'error');
        currentEl.value = '';
        currentEl.focus();
        return;
      }

      await setPassword(next);
      setMsg('✅ Password updated successfully.', 'success');
      changeForm.reset();
    });

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Sign out of Attendance Tracker?')) {
          window.logout();
        }
      });
    }
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
    initSecurityTab();
  });
})();
