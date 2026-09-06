import { criarMapProviderRuntime } from './map-provider-runtime.js';
import { criarMapLibreAdapter } from './maplibre-adapter.js';
import { camadaPorId, estiloMapLibre } from '../data/camadas-mapa.js';

/**
 * Composição do motor cartográfico.
 * A página recebe uma única instância MapLibre, enquanto a seleção de base
 * acontece por visibilidade de camadas dentro de um estilo estável.
 */
export async function criarMotorMapa({ providerId = 'terreno', carregarMapLibre } = {}) {
  if (typeof carregarMapLibre !== 'function') throw new TypeError('carregarMapLibre é obrigatório');

  const provider = camadaPorId(providerId);
  if (!provider || !Array.isArray(provider.tiles) || provider.tiles.length === 0) {
    throw new RangeError(`Provider de mapa indisponível: ${providerId}`);
  }

  const MapLibre = await carregarMapLibre();
  if (!MapLibre) throw new Error('MapLibre não pôde ser carregado');

  const adapter = criarMapLibreAdapter(MapLibre);
  const runtime = criarMapProviderRuntime(provider, adapter);

  return Object.freeze({
    provider,
    // O motor carregado fica exposto para a página montar controles (navegação,
    // escala) sem importar `maplibre-gl` nem instanciar o mapa: quem cria o
    // `Map` continua sendo esta composição.
    MapLibre,
    montar(opcoes = {}) {
      return runtime.montar({
        ...opcoes,
        style: opcoes.style ?? estiloMapLibre({ base: provider.id, overlays: ['labels'], incluirDem: false }),
      });
    },
    obterMapa: runtime.obterMapa,
    desmontar: runtime.desmontar,
  });
}
