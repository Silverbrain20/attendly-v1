const CACHE_VERSION = 'attendly-v2';
const STATIC_ASSETS = ['/icon.svg', '/manifest.webmanifest'];

// Install: pre-cache only static assets (NOT index.html — always network-first)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: delete old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: never cache, always network
  if (url.pathname.startsWith('/api/')) return;

  // index.html and navigation: network-first so new deploys are always picked up
  if (request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets (icon, manifest): cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
