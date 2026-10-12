


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


function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}


function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}


function highlightNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}


function notifyDataChange(detail) {
  try {
    window.dispatchEvent(new CustomEvent('at:data-changed', { detail: detail || null }));
  } catch (e) {

    const evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('at:data-changed', false, false, detail || null);
    window.dispatchEvent(evt);
  }
}


(function () {
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  if (page === 'login.html') return;

  try {
    if (localStorage.getItem('attendanceTracker.v1.session') !== 'granted') {
      location.replace('login.html');
    }
  } catch (e) {  }
})();

document.addEventListener('DOMContentLoaded', highlightNav);


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {

        reg.addEventListener('updatefound', () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener('statechange', () => {
            if (newSw.state === 'installed' && navigator.serviceWorker.controller) {

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