const CACHE = 'europa-2026-shell-v3';

const BASE = '/europa2026_app/';

const SHELL = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();

        caches.open(CACHE).then(cache => {
          cache.put(event.request, clone);
        });

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        return caches.match(`${BASE}index.html`);
      })
  );
});
