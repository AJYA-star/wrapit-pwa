/* WrapIt service worker
   - Pages & scripts: network first (so you always get the newest version), cache as offline fallback
   - API calls and other websites: never touched (always live data)
   Bump CACHE_NAME whenever you want to force everyone's cache to reset. */
const CACHE_NAME = 'wrapit-v2';

const PRECACHE = [
  './',
  'index.html',
  'shops.html',
  'shop-detail.html',
  'login.html',
  'register.html',
  'my-orders.html',
  'shop-owner-dashboard.html',
  'shop-orders.html',
  'config.js',
  'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // add one by one so a single missing file can't break the whole install
      Promise.all(PRECACHE.map(url => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-site GET requests; let API calls / fonts / images from other sites pass through
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('index.html')))
  );
});
