/**
 * Service worker do Vanguard Field.
 *
 * ## O defeito que este arquivo carregava
 *
 * O cache do shell se chamava `vanguard-field-shell-v9` — uma **constante
 * escrita à mão**. Ela atravessou 1.1.0, 1.2.0, 1.3.x e 1.4.x sem mudar. Como
 * o `fetch` respondia **cache-first para tudo**, incluindo o `index.html`, uma
 * instalação que já tivesse cacheado a versão antiga continuaria servindo o
 * `index.html` antigo — que aponta para chunks de nomes antigos, também
 * cacheados. O resultado é um aplicativo que roda uma versão anterior para
 * sempre, com o botão de atualizar sem poder de consertar, porque o nome do
 * cache não mudava nem depois do `skipWaiting`.
 *
 * Duas mudanças resolvem, e nenhuma delas é um remendo:
 *
 * 1. **O nome do cache do shell vem do identificador de build**, lido da URL de
 *    registro (`/sw.js?v=<build>`). Build novo é cache novo; o `activate`
 *    apaga os anteriores.
 * 2. **HTML nunca é cache-first.** O documento é buscado na rede e o cache é
 *    só a rede de segurança para quando não há rede. Arquivo com hash no nome
 *    (`/assets/index-AbC123.js`) continua cache-first, porque o nome muda
 *    sempre que o conteúdo muda — é o que torna esse cache seguro.
 *
 * ## O cache de tiles NÃO é versionado, de propósito
 *
 * O shell é descartável: se sumir, baixa de novo. Os tiles não — eles são o
 * mapa que a pessoa preparou antes de sair, possivelmente a única cópia que
 * ela tem do terreno. Apagá-los a cada atualização do aplicativo seria
 * destruir trabalho dela num momento em que ela pode não ter rede para
 * refazer. Por isso `TILE_CACHE` tem nome fixo e o `activate` não encosta nele.
 */

/* O identificador vem da URL de registro. Sem ele o cache é anônimo e nunca é
 * confundido com o de um build identificado. */
function buildDaUrl() {
  try {
    return new URL(self.location.href).searchParams.get('v') || 'sem-build';
  } catch {
    // Sem URL de registro não há build para nomear o cache. `sem-build` é um
    // nome honesto e distinto — nunca é confundido com o de um build real,
    // então nunca serve conteúdo de um por outro.
    return 'sem-build';
  }
}
const BUILD = buildDaUrl();
const PREFIXO_SHELL = 'vanguard-field-shell-';
const CACHE = `${PREFIXO_SHELL}${BUILD}`;
const TILE_CACHE = 'vanguard-field-tiles-v3';
/* Precache mínimo: é a rede de segurança do modo offline, não a fonte de
 * verdade. O `index.html` entra aqui para existir quando não há rede — e o
 * `fetch` cuida de nunca preferi-lo à rede quando ela existe. */
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/vanguard.svg'];
const TILE_HOSTS = new Set([
  'mt0.google.com', 'mt1.google.com', 'mt2.google.com', 'mt3.google.com',
  'a.tile.opentopomap.org',
  'tile.openstreetmap.org',
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
  const vistos = new Set();
  return urls
    .filter((value) => typeof value === 'string')
    .map((value) => {
      try { return new URL(value); } catch { return null; }
    })
    .filter((url) => {
      if (!url || !isTileRequest(url) || vistos.has(url.href)) return false;
      vistos.add(url.href);
      return true;
    })
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
    await Promise.all(nomes
      // Só os shells de builds anteriores. O cache de tiles é do operador:
      // ele guarda o mapa preparado antes de sair, e some só quando a pessoa
      // pede para limpar.
      .filter((nome) => nome.startsWith(PREFIXO_SHELL) && nome !== CACHE)
      .map((nome) => caches.delete(nome)));
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

  // Arquivo com hash no nome é imutável por construção: o nome muda quando o
  // conteúdo muda. Só nesse caso o cache pode vir antes da rede.
  const imutavel = url.pathname.startsWith('/assets/');
  if (imutavel) {
    event.respondWith(cacheFirst(event.request, CACHE));
    return;
  }

  // Todo o resto — documento, manifesto, ícones — vai à rede primeiro. Era
  // aqui que o aplicativo ficava preso: servindo um `index.html` cacheado que
  // apontava para chunks de uma versão anterior.
  event.respondWith((async () => {
    try {
      // `no-store` no documento de entrada não é excesso de zelo: o `fetch` do
      // service worker também passa pelo cache HTTP do navegador, e foi por
      // ele que o `index.html` antigo continuou chegando mesmo depois de a
      // rede ter o novo — medido. Para o arquivo que decide QUAIS chunks
      // carregar, nenhum cache intermediário pode ser confiável. Os chunks em
      // si têm hash no nome e podem vir de qualquer cache sem risco.
      const documento = event.request.mode === 'navigate' || event.request.destination === 'document';
      const response = await fetch(event.request, documento ? { cache: 'no-store' } : undefined);
      if (response.ok && event.request.destination !== 'image') {
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const shell = await caches.match('/index.html');
        if (shell) return shell;
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
