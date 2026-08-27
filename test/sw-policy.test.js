import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function carregarPolitica() {
  const source = `${fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')}\nself.__vanguardPolicy = { allowedTileUrls, isTileRequest };`;
  const context = {
    URL,
    self: {
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
