const CACHE = 'vanguard-field-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/vanguard.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && event.request.destination !== 'image') {
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      if (event.request.mode === 'navigate') return caches.match('/index.html');
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
