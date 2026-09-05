/* Service worker : coquille applicative en cache, réseau en priorité pour le reste. */
const CACHE = 'mediterraneo-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/tokens.css',
  './assets/css/app.css',
  './assets/js/app.js',
  './assets/js/store.js',
  './assets/js/data.js',
  './assets/js/auth.js',
  './assets/js/photo.js',
  './assets/js/views.js',
  './assets/js/ui.js',
  './assets/js/config.js',
  './assets/js/date.js',
  './assets/js/energy.js',
  './assets/js/off.js',
  './assets/js/barcode.js',
  './assets/js/scanner.js',
  './assets/js/views/today.js',
  './assets/js/views/calendar.js',
  './assets/js/views/add.js',
  './assets/js/views/scan.js',
  './assets/js/views/journal.js',
  './assets/js/views/progress.js',
  './assets/js/views/plan.js',
  './assets/js/views/settings.js',
  './assets/js/views/sport.js',
  './assets/icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Supabase, Open Food Facts, le CDN des modules et les polices : au navigateur
  // de gérer. Mettre en cache une réponse authentifiée serait une fuite.
  if (new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
