/**
 * Runtime que conecta a definição agnóstica de MapProvider ao adapter do motor.
 * A camada de UI usa este ponto para montar/desmontar o mapa sem conhecer o
 * motor cartográfico concreto.
 */

import { validarMapProvider } from './map-provider.js';

export function criarMapProviderRuntime(provider, adaptador) {
  const validacao = validarMapProvider(provider);
  if (!validacao.valido) {
    throw new TypeError(`MapProvider inválido: ${validacao.erros.join('; ')}`);
  }

  if (!adaptador || typeof adaptador.renderizar !== 'function') {
    throw new TypeError('adapter inválido: renderizar é obrigatório');
  }

  let mapa = null;

  return Object.freeze({
    montar(opcoes = {}) {
      mapa = adaptador.renderizar({
        ...opcoes,
        tiles: provider.tiles,
        tileSize: provider.tileSize,
        maxzoom: provider.maxzoom,
        creditos: provider.creditos,
      });
      return mapa;
    },

    obterMapa() {
      return mapa;
    },

    desmontar() {
      if (typeof adaptador.destruir === 'function') {
        adaptador.destruir();
      } else if (mapa && typeof mapa.remove === 'function') {
        mapa.remove();
      }
      mapa = null;
    },
  });
}
