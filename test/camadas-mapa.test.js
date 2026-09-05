import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMADA_CARTO_OPCIONAL,
  CAMADAS_BASE,
  CAMADAS_OVERLAY,
  estiloMapLibre,
} from '../src/data/camadas-mapa.js';

test('as bases cartográficas usam fontes HTTPS públicas e sem CARTO/API key', () => {
  assert.deepEqual(CAMADAS_BASE.map((camada) => camada.id), ['sat', 'terreno', 'dark', 'imagery']);
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

test('a base CARTO fica fora do catálogo oferecido enquanto depender de chave', () => {
  // Ela é renderizável só com chave de build/runtime, então vive num export
  // separado em vez de aparecer como opção que o operador escolhe e não
  // carrega. A garantia que importa é a separação: nenhuma base do catálogo
  // pode depender de chave, e é isso que este teste cobra.
  assert.equal(CAMADA_CARTO_OPCIONAL.id, 'carto-voyager');
  assert.equal(CAMADA_CARTO_OPCIONAL.disponivel, false);
  assert.ok(!CAMADAS_BASE.some((camada) => camada.id === CAMADA_CARTO_OPCIONAL.id),
    'base que depende de chave não pode voltar para o catálogo oferecido');
  assert.ok(CAMADA_CARTO_OPCIONAL.tiles.some((tile) => /cartocdn/.test(tile)),
    'se os tiles deixarem de ser CARTO, esta separação perdeu o motivo');
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
