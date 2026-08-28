/**
 * Registro de providers cartográficos.
 *
 * O registro mantém a escolha do provider fora da UI e permite que a
 * aplicação troque entre fontes online/offline sem alterar o domínio tático.
 */

import { criarMapProvider } from './map-provider.js';

export function criarMapProviderRegistry(providers = []) {
  const registro = new Map();

  function registrar(definicao, adaptador = {}) {
    const provider = criarMapProvider(definicao, adaptador);
    if (registro.has(provider.id)) {
      throw new Error(`MapProvider já registrado: ${provider.id}`);
    }
    registro.set(provider.id, provider);
    return provider;
  }

  function obter(id) {
    return registro.get(String(id)) ?? null;
  }

  function exigir(id) {
    const provider = obter(id);
    if (!provider) {
      throw new Error(`MapProvider não encontrado: ${id}`);
    }
    return provider;
  }

  function listar() {
    return [...registro.values()];
  }

  function remover(id) {
    return registro.delete(String(id));
  }

  for (const item of providers) {
    registrar(item);
  }

  return Object.freeze({ registrar, obter, exigir, listar, remover });
}
