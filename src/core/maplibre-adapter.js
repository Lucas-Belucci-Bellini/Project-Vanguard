/**
 * Adapter do motor MapLibre.
 *
 * A aplicação conversa com este adapter sem depender diretamente do motor.
 */

export function criarMapLibreAdapter(MapLibre = globalThis.maplibregl) {
  if (!MapLibre || typeof MapLibre.Map !== 'function') {
    throw new TypeError('MapLibre inválido: MapLibre.Map não encontrado');
  }

  let mapa = null;

  function exigirMapa() {
    if (!mapa) throw new Error('mapa ainda não foi montado');
    return mapa;
  }

  return Object.freeze({
    renderizar(opcoes = {}) {
      if (!opcoes.container) throw new TypeError('container é obrigatório para renderizar o mapa');
      if (mapa) { mapa.remove(); mapa = null; }
      mapa = new MapLibre.Map({
        container: opcoes.container,
        style: opcoes.style,
        center: opcoes.center,
        zoom: opcoes.zoom,
        maxZoom: opcoes.maxzoom,
        attributionControl: opcoes.attributionControl ?? true,
      });
      return mapa;
    },

    adicionarControle(controle, posicao) {
      const map = exigirMapa();
      if (!controle || typeof map.addControl !== 'function') throw new TypeError('controle inválido');
      map.addControl(controle, posicao);
      return controle;
    },

    adicionarSource(id, source) {
      const map = exigirMapa();
      map.addSource(id, source);
      return map.getSource(id);
    },

    adicionarLayer(layer, antesDe) {
      const map = exigirMapa();
      map.addLayer(layer, antesDe);
      return map.getLayer(layer.id);
    },

    obterSource(id) { return exigirMapa().getSource(id); },
    obterLayer(id) { return exigirMapa().getLayer(id); },
    removerSource(id) { const map = exigirMapa(); if (map.getSource(id)) map.removeSource(id); },
    removerLayer(id) { const map = exigirMapa(); if (map.getLayer(id)) map.removeLayer(id); },

    em(evento, listener) {
      exigirMapa().on(evento, listener);
      return listener;
    },

    obterMapa() { return mapa; },

    destruir() {
      if (mapa) { mapa.remove(); mapa = null; }
    },
  });
}
