/**
 * Adapter do motor MapLibre.
 *
 * O restante da aplicação conversa com este adapter através do contrato
 * MapProvider, evitando dependência direta do motor cartográfico.
 */

export function criarMapLibreAdapter(MapLibre = globalThis.maplibregl) {
  if (!MapLibre || typeof MapLibre.Map !== 'function') {
    throw new TypeError('MapLibre inválido: MapLibre.Map não encontrado');
  }

  let mapa = null;

  return Object.freeze({
    renderizar(opcoes = {}) {
      if (!opcoes.container) {
        throw new TypeError('container é obrigatório para renderizar o mapa');
      }

      if (mapa) {
        mapa.remove();
        mapa = null;
      }

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

    obterMapa() {
      return mapa;
    },

    destruir() {
      if (mapa) {
        mapa.remove();
        mapa = null;
      }
    },
  });
}
