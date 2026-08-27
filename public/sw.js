const CACHE = 'vanguard-field-shell-v9';
const TILE_CACHE = 'vanguard-field-tiles-v2';
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
  return url.protocol === 'https:' && TILE_HOSTS.has(url.hostname);
}

function allowedTileUrls(urls) {
  return urls
    .filter((value) => typeof value === 'string')
    .map((value) => {
      try { return new URL(value); } catch { return null; }
    })
    .filter((url) => url && isTileRequest(url))
    .slice(0, 256);
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

async function prepareTiles(urls) {
  const cache = await caches.open(TILE_CACHE);
  let salvos = 0;
  for (const url of urls) {
    try {
      const resposta = await fetch(url.href, { mode: 'no-cors' });
      if (resposta.ok || resposta.type === 'opaque') {
        await cache.put(url.href, resposta.clone());
        salvos += 1;
      }
    } catch { /* um tile indisponível não interrompe os demais */ }
  }
  return salvos;
}

async function tileCacheStatus() {
  const cache = await caches.open(TILE_CACHE);
  const requests = await cache.keys();
  return { tiles: requests.length, cache: TILE_CACHE };
}

self.addEventListener('install', (event) => {
  /* Em atualizações, aguarda o botão do app enviar SKIP_WAITING. */
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('message', (event) => {
  const tipo = event.data?.type;
  if (!tipo) return;

  if (tipo === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (tipo === 'CACHE_TILES') {
    const urls = allowedTileUrls(Array.isArray(event.data.urls) ? event.data.urls : []);
    const trabalho = prepareTiles(urls).then((salvos) => ({ type: 'CACHE_TILES_DONE', salvos, total: urls.length }));
    if (typeof event.waitUntil === 'function') event.waitUntil(trabalho);
    if (event.ports?.[0]) trabalho.then((resposta) => event.ports[0].postMessage(resposta));
    return;
  }

  if (tipo === 'CACHE_STATUS') {
    const trabalho = tileCacheStatus();
    if (typeof event.waitUntil === 'function') event.waitUntil(trabalho);
    if (event.ports?.[0]) trabalho.then((resposta) => event.ports[0].postMessage({ type: 'CACHE_STATUS_DONE', ...resposta }));
    return;
  }

  if (tipo === 'CLEAR_TILES') {
    const trabalho = caches.delete(TILE_CACHE).then(() => ({ type: 'CLEAR_TILES_DONE', cleared: true }));
    if (typeof event.waitUntil === 'function') event.waitUntil(trabalho);
    if (event.ports?.[0]) trabalho.then((resposta) => event.ports[0].postMessage(resposta));
  }
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
