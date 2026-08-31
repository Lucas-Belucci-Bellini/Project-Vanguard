/**
 * Composição do runtime cartográfico da aplicação.
 *
 * Esta camada transforma o catálogo de camadas em um MapProvider e conecta
 * o provider ao adapter escolhido. A página não precisa conhecer o motor.
 */

import { providerDeCamada } from './map-provider.js';
import { criarMapProviderRegistry } from './map-provider-registry.js';
import { criarMapProviderRuntime } from './map-provider-runtime.js';
import { CAMADA_CARTO_OPCIONAL, CAMADAS_BASE, estiloMapLibre } from '../data/camadas-mapa.js';

export function criarMapaRuntime({ adaptador, baseId = 'sat', overlays = ['labels'], incluirDem = true } = {}) {
  if (!adaptador) throw new TypeError('adaptador é obrigatório');

  const catalogoRuntime = [CAMADA_CARTO_OPCIONAL, ...CAMADAS_BASE];
  const camadaInicial = catalogoRuntime.find((camada) => camada.id === baseId) ?? catalogoRuntime[0];
  if (!camadaInicial) throw new Error('nenhuma camada base cartográfica disponível');

  const registry = criarMapProviderRegistry();
  for (const camada of catalogoRuntime) {
    registry.registrar(providerDeCamada(camada));
  }

  const provider = registry.exigir(camadaInicial.id);
  const runtime = criarMapProviderRuntime(provider, adaptador);

  return Object.freeze({
    providerAtual: () => registry.exigir(camadaInicial.id),
    providers: () => registry.listar(),
    montar(opcoes = {}) {
      return runtime.montar({
        ...opcoes,
        style: estiloMapLibre({ base: camadaInicial.id, overlays, incluirDem }),
      });
    },
    desmontar: runtime.desmontar,
    obterMapa: runtime.obterMapa,
  });
}
