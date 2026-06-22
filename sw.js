/* Attendance Tracker — Service Worker
 * Cache-first offline support for PWA / TWA installs.
 * Version: 1.1.2
 */

const CACHE_NAME = 'attendance-tracker-v1.1.2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './login.html',
  './students.html',
  './attendance.html',
  './reports.html',
  './settings.html',
  './student-detail.html',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './css/style.css',
  './css/auth.css',
  './js/storage.js',
  './js/app.js',
  './js/auth.js',
  './js/students.js',
  './js/attendance.js',
  './js/dashboard.js',
  './js/reports.js',
  './js/settings.js',
  './js/student-detail.js'
];

/* Install: precache all app shell files */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* Activate: clean up old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch: cache-first, fall back to network, then offline fallback */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  let url;
  try { url = new URL(event.request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        // Cache new same-origin GET responses for next time
        if (networkResponse && networkResponse.status === 200 &&
            new URL(event.request.url).origin === self.location.origin) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback: serve login.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./login.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

/* Allow pages to request an immediate update */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});