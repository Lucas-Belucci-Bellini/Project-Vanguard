import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function carregarPolitica(href) {
  const source = `${fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')}\nself.__vanguardPolicy = { allowedTileUrls, isTileRequest, CACHE, TILE_CACHE, PREFIXO_SHELL, BUILD };`;
  const context = {
    URL,
    self: {
      // A URL de registro é o que carrega o identificador de build; sem ela o
      // service worker não tem como versionar o próprio cache.
      location: { href: href ?? 'https://exemplo.test/sw.js' },
      addEventListener() {},
      skipWaiting() {},
    },
  };
  vm.runInNewContext(source, context);
  return context.self.__vanguardPolicy;
}

test('Service Worker aceita somente HTTPS nos hosts permitidos e remove URLs repetidas', () => {
  const { allowedTileUrls } = carregarPolitica();
  const permitido = 'https://tile.openstreetmap.org/12/10/20.png';
  const resultado = allowedTileUrls([
    permitido,
    permitido,
    'http://tile.openstreetmap.org/12/10/20.png',
    'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/12/10/20.png',
    'https://example.invalid/12/10/20.png',
    'não é URL',
  ]);
  assert.deepEqual(resultado.map((url) => url.href), [permitido]);
});

test('Service Worker limita URLs únicas de tiles a 256', () => {
  const { allowedTileUrls } = carregarPolitica();
  const urls = Array.from({ length: 300 }, (_, indice) => `https://server.arcgisonline.com/tiles/${indice}.png`);
  const resultado = allowedTileUrls(urls);
  assert.equal(resultado.length, 256);
  assert.equal(resultado[0].pathname, '/tiles/0.png');
  assert.equal(resultado.at(-1).pathname, '/tiles/255.png');
});

test('o cache do shell é versionado pelo identificador de build', () => {
  // Este é o teste que a versão anterior não tinha, e a ausência dele custou
  // quatro releases: o nome do cache era a constante `vanguard-field-shell-v9`
  // e nunca mudava, então uma instalação antiga servia o bundle antigo para
  // sempre — o `index.html` cacheado apontava para chunks de nomes antigos,
  // também cacheados.
  const a = carregarPolitica('https://exemplo.test/sw.js?v=1.4.1%2Babc123.202609021200');
  const b = carregarPolitica('https://exemplo.test/sw.js?v=1.4.2%2Bdef456.202609031300');
  assert.notEqual(a.CACHE, b.CACHE, 'builds diferentes precisam de caches diferentes');
  assert.ok(a.CACHE.startsWith(a.PREFIXO_SHELL));
  assert.ok(a.CACHE.includes('1.4.1'));
});

test('sem identificador de build o cache não se passa por um build real', () => {
  const sem = carregarPolitica('https://exemplo.test/sw.js');
  assert.equal(sem.BUILD, 'sem-build');
  assert.equal(sem.CACHE, `${sem.PREFIXO_SHELL}sem-build`);
});

test('o cache de tiles NÃO é versionado pelo build', () => {
  // O shell é descartável; os tiles são o mapa que a pessoa preparou antes de
  // sair, e podem ser a única cópia que ela tem do terreno. Apagá-los a cada
  // atualização seria destruir trabalho dela sem rede para refazer.
  const a = carregarPolitica('https://exemplo.test/sw.js?v=1.4.1%2Babc123.202609021200');
  const b = carregarPolitica('https://exemplo.test/sw.js?v=9.9.9%2Bzzz999.209912312359');
  assert.equal(a.TILE_CACHE, b.TILE_CACHE, 'o cache de tiles sobrevive à atualização');
  assert.ok(!a.TILE_CACHE.startsWith(a.PREFIXO_SHELL), 'o activate apaga por prefixo; o de tiles precisa ficar fora dele');
});

test('ESTRUTURAL: o HTML nunca é servido pelo cache antes da rede', () => {
  // A regra que impede o aplicativo de rodar uma versão anterior para sempre:
  // só arquivo com hash no nome pode vir do cache primeiro.
  const fonte = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  const codigo = fonte.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(codigo, /url\.pathname\.startsWith\('\/assets\/'\)/, 'o cache-first precisa ser restrito a /assets/');
  const trechoFetch = codigo.slice(codigo.indexOf("addEventListener('fetch'"));
  const posImutavel = trechoFetch.indexOf('cacheFirst(event.request, CACHE)');
  const posRede = trechoFetch.indexOf('await fetch(event.request,');
  assert.ok(posImutavel > 0 && posRede > posImutavel,
    'fora de /assets/, a rede vem antes do cache');
});
