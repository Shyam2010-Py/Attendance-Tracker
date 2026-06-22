/* ============================================
   Attendance Tracker — Common Helpers
   ============================================ */

/** Show a toast message */
function showToast(message, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'show ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = '';
  }, 2400);
}

/** Today as YYYY-MM */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Month label like "June 2026" */
function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

/** Highlight active nav link based on current file */
function highlightNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}

/**
 * Notify the dashboard (and any other listeners) that shared
 * LocalStorage data has been mutated within the current tab.
 * The browser's native `storage` event only fires for changes
 * from OTHER tabs/windows — same-tab listeners need a custom event.
 */
function notifyDataChange(detail) {
  try {
    window.dispatchEvent(new CustomEvent('at:data-changed', { detail: detail || null }));
  } catch (e) {
    // Fallback for very old environments
    const evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('at:data-changed', false, false, detail || null);
    window.dispatchEvent(evt);
  }
}

/* ============================================
   Attendance Tracker — Page Auth Gate
   Redirects to login.html when no valid session.
   Runs on every page via the shared app.js.
   ============================================ */
(function () {
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // login.html handles its own auth flow.
  if (page === 'login.html') return;

  try {
    if (localStorage.getItem('attendanceTracker.v1.session') !== 'granted') {
      location.replace('login.html');
    }
  } catch (e) { /* ignore */ }
})();

document.addEventListener('DOMContentLoaded', highlightNav);

/* ============================================
   Service Worker Registration (PWA / TWA)
   Required by PWABuilder to package the app
   as an installable / offline-capable APK.
   ============================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // Optional: listen for new SW and prompt user
        reg.addEventListener('updatefound', () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener('statechange', () => {
            if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
              // New version installed — silently activate
              newSw.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[Attendance Tracker] Service worker registration failed:', err);
      });
  });
}