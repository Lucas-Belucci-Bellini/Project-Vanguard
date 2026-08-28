import { describe, expect, it } from 'vitest';
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

    expect(adapter.obterMapa()).toBe(map);
    expect(lib.calls[0]).toEqual(['control', control, 'bottom-right']);
    expect(adapter.obterSource('grade')).toEqual({ type: 'geojson' });
    expect(adapter.obterLayer('grade').id).toBe('grade');
    expect(lib.events.get('moveend')).toBe(listener);
  });

  it('permite remover sources e layers existentes', () => {
    const lib = fakeMapLibre();
    const adapter = criarMapLibreAdapter(lib);
    adapter.renderizar({ container: 'map', style: { version: 8 } });
    adapter.adicionarSource('s', { type: 'geojson' });
    adapter.adicionarLayer({ id: 'l', type: 'line', source: 's' });
    adapter.removerLayer('l');
    adapter.removerSource('s');
    expect(adapter.obterLayer('l')).toBeUndefined();
    expect(adapter.obterSource('s')).toBeUndefined();
  });
});
