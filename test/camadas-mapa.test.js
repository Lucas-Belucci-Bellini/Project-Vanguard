import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMADAS_BASE,
  CAMADAS_OVERLAY,
  estiloMapLibre,
} from '../src/data/camadas-mapa.js';

test('as bases cartográficas usam fontes HTTPS públicas e sem CARTO/API key', () => {
  assert.deepEqual(CAMADAS_BASE.map((camada) => camada.id), ['carto-voyager', 'sat', 'terreno', 'dark', 'imagery']);
  // A base CARTO só é renderizável quando uma chave é fornecida em build/runtime.
  // Sem chave ela permanece indisponível, e nenhuma base exigida pelo app depende de chave.
  const carto = CAMADAS_BASE.find((camada) => camada.id === 'carto-voyager');
  assert.equal(carto.disponivel, false);
  for (const camada of CAMADAS_BASE.filter((base) => base.disponivel !== false)) {
    assert.notEqual(camada.id, 'carto-voyager');
  }
  for (const camada of CAMADAS_BASE) {
    assert.ok(camada.tiles.length > 0);
    for (const tile of camada.tiles) {
      assert.match(tile, /^https:\/\//);
      assert.doesNotMatch(tile, /cartodb|api[_-]?key/i);
    }
  }
  assert.deepEqual(CAMADAS_BASE.find((camada) => camada.id === 'dark').tiles, [
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  ]);
});

test('o overlay de nomes usa ArcGIS e o estilo o mantém sobre a base', () => {
  const rotulos = CAMADAS_OVERLAY.find((camada) => camada.id === 'labels');
  assert.ok(rotulos);
  assert.equal(rotulos.tiles.length, 1);
  assert.match(rotulos.tiles[0], /^https:\/\/server\.arcgisonline\.com\//);
  assert.doesNotMatch(rotulos.tiles[0], /cartodb|api[_-]?key/i);

  const estilo = estiloMapLibre({ base: 'sat', overlays: ['labels'], glyphs: null, incluirDem: false });
  assert.equal(estilo.sources.labels.tiles[0], rotulos.tiles[0]);
  assert.equal(estilo.layers.find((layer) => layer.id === 'labels-layer').layout.visibility, 'visible');
  assert.equal(estilo.layers.find((layer) => layer.id === 'base-sat').layout.visibility, 'visible');
});
