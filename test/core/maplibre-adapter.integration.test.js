import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarMapLibreAdapter } from '../../src/core/maplibre-adapter.js';

function fakeMapLibre() {
  const calls = [];
  const sources = new Map();
  const layers = new Map();
  const events = new Map();
  class MapFake {
    constructor() { this.removido = false; }
    addControl(c, p) { calls.push(['control', c, p]); }
    addSource(id, source) { sources.set(id, source); }
    getSource(id) { return sources.get(id); }
    removeSource(id) { sources.delete(id); }
    addLayer(layer) { layers.set(layer.id, layer); }
    getLayer(id) { return layers.get(id); }
    removeLayer(id) { layers.delete(id); }
    on(evento, listener) { events.set(evento, listener); }
    remove() { this.removido = true; }
  }
  return { Map: MapFake, calls, sources, layers, events };
}

describe('MapLibreAdapter integration surface', () => {
  it('expõe controls, sources, layers e eventos sem vazar o motor', () => {
    const lib = fakeMapLibre();
    const adapter = criarMapLibreAdapter(lib);
    const map = adapter.renderizar({ container: 'map', style: { version: 8 } });
    const control = {};
    const listener = () => {};

    adapter.adicionarControle(control, 'bottom-right');
    adapter.adicionarSource('grade', { type: 'geojson' });
    adapter.adicionarLayer({ id: 'grade', type: 'line', source: 'grade' });
    adapter.em('moveend', listener);

    assert.equal(adapter.obterMapa(), map);
    assert.deepEqual(lib.calls[0], ['control', control, 'bottom-right']);
    assert.deepEqual(adapter.obterSource('grade'), { type: 'geojson' });
    assert.equal(adapter.obterLayer('grade').id, 'grade');
    assert.equal(lib.events.get('moveend'), listener);
  });

  it('permite remover sources e layers existentes', () => {
    const lib = fakeMapLibre();
    const adapter = criarMapLibreAdapter(lib);
    adapter.renderizar({ container: 'map', style: { version: 8 } });
    adapter.adicionarSource('s', { type: 'geojson' });
    adapter.adicionarLayer({ id: 'l', type: 'line', source: 's' });
    adapter.removerLayer('l');
    adapter.removerSource('s');
    assert.equal(adapter.obterLayer('l'), undefined);
    assert.equal(adapter.obterSource('s'), undefined);
  });
});
