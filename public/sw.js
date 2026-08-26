const CACHE = 'vanguard-field-shell-v7';
const TILE_CACHE = 'vanguard-field-tiles-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/vanguard.svg'];
const TILE_HOSTS = new Set([
  'mt0.google.com', 'mt1.google.com', 'mt2.google.com', 'mt3.google.com',
  'a.tile.opentopomap.org',
  'cartodb-basemaps-a.global.ssl.fastly.net',
  'cartodb-basemaps-b.global.ssl.fastly.net',
  'cartodb-basemaps-c.global.ssl.fastly.net',
  'server.arcgisonline.com',
  'gibs.earthdata.nasa.gov',
  'wms.gebco.net',
  'elevation-tiles-prod.s3.amazonaws.com',
  'demotiles.maplibre.org',
]);

function isTileRequest(url) {
  return TILE_HOSTS.has(url.hostname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_TILES' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.slice(0, 256);
  const trabalho = caches.open(TILE_CACHE).then(async (cache) => {
    let salvos = 0;
    for (const url of urls) {
      try {
        const resposta = await fetch(url, { mode: 'no-cors' });
        if (resposta.ok || resposta.type === 'opaque') {
          await cache.put(url, resposta.clone());
          salvos += 1;
        }
      } catch { /* um tile indisponível não interrompe os demais */ }
    }
    return salvos;
  });
  if (typeof event.waitUntil === 'function') event.waitUntil(trabalho);
  if (event.ports?.[0]) trabalho.then((salvos) => event.ports[0].postMessage({ type: 'CACHE_TILES_DONE', salvos, total: urls.length }));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((nome) => nome !== CACHE && nome !== TILE_CACHE).map((nome) => caches.delete(nome)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (isTileRequest(url)) {
    event.respondWith(cacheFirst(event.request, TILE_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;
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
