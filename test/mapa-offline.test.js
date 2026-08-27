import assert from 'node:assert/strict';
import test from 'node:test';
import { LIMITE_TILES_OFFLINE, planejarTilesDoViewport, tileX, tileY, urlDoTile } from '../src/core/mapa-offline.js';

function bounds(west, east, south = -1, north = 1) {
  return {
    getWest: () => west,
    getEast: () => east,
    getSouth: () => south,
    getNorth: () => north,
  };
}

test('tileX normaliza longitude e tileY limita latitude aos limites Web Mercator', () => {
  assert.equal(tileX(-180, 2), 0);
  assert.equal(tileX(180, 2), 0);
  assert.equal(tileX(540, 2), 0);
  assert.equal(tileY(90, 2), 0);
  assert.equal(tileY(-90, 2), 3);
});

test('urlDoTile substitui template de tile', () => {
  assert.equal(urlDoTile('https://tiles.example/{z}/{x}/{y}.png', 3, 4, 5), 'https://tiles.example/5/3/4.png');
});

test('planejarTilesDoViewport respeita o limite local e informa a estimativa', () => {
  const plano = planejarTilesDoViewport(bounds(-180, 180, -80, 80), { zoomAtual: 15, maxzoom: 16, tiles: ['https://tiles.example/{z}/{x}/{y}.png'] });
  assert.equal(plano.urls.length, LIMITE_TILES_OFFLINE);
  assert.equal(plano.limitado, true);
  assert.ok(plano.totalEstimado > LIMITE_TILES_OFFLINE);
});

test('planejarTilesDoViewport inclui ambos os lados do antimeridiano', () => {
  const plano = planejarTilesDoViewport(bounds(179, -179, -1, 1), { zoomAtual: 5, maxzoom: 5, tiles: ['https://tiles.example/{z}/{x}/{y}.png'] });
  const xs = new Set(plano.urls.map((url) => Number(url.split('/').at(-2))));
  assert.ok(xs.has(0));
  assert.ok(xs.has(31));
});
