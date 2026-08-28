import { criarMapProviderRuntime } from './map-provider-runtime.js';
import { criarMapLibreAdapter } from './maplibre-adapter.js';
import { camadaPorId } from '../data/camadas-mapa.js';

/**
 * Composição do motor cartográfico para a aplicação.
 * Mantém o carregamento de MapLibre fora da página do mapa.
 */
export async function criarMotorMapa({ providerId = 'terreno', carregarMapLibre } = {}) {
  if (typeof carregarMapLibre !== 'function') {
    throw new TypeError('carregarMapLibre é obrigatório');
  }

  const provider = camadaPorId(providerId);
  if (!provider || !Array.isArray(provider.tiles) || provider.tiles.length === 0) {
    throw new RangeError(`Provider de mapa indisponível: ${providerId}`);
  }

  const MapLibre = await carregarMapLibre();
  if (!MapLibre) {
    throw new Error('MapLibre não pôde ser carregado');
  }

  const adapter = criarMapLibreAdapter(MapLibre);
  const runtime = criarMapProviderRuntime(provider, adapter);

  return Object.freeze({
    provider,
    montar(opcoes = {}) {
      return runtime.montar({
        ...opcoes,
        style: opcoes.style ?? {
          version: 8,
          sources: {
            [provider.id]: {
              type: 'raster',
              tiles: provider.tiles,
              tileSize: provider.tileSize,
              maxzoom: provider.maxzoom,
              attribution: provider.creditos,
            },
          },
          layers: [{
            id: `base-${provider.id}`,
            type: 'raster',
            source: provider.id,
          }],
        },
      });
    },
    obterMapa: runtime.obterMapa,
    desmontar: runtime.desmontar,
  });
}
