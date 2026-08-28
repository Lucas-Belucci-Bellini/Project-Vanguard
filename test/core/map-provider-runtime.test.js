import { describe, expect, it } from 'vitest';
import { criarMapProviderRuntime } from '../../src/core/map-provider-runtime.js';

const provider = {
  id: 'offline',
  nome: 'Offline',
  tiles: ['https://example.test/{z}/{x}/{y}.pbf'],
  tileSize: 256,
  maxzoom: 14,
  creditos: 'Vanguard',
};

describe('MapProviderRuntime', () => {
  it('passa a configuração do provider para o adapter', () => {
    let recebido;
    const mapa = {};
    const adapter = {
      renderizar(opcoes) {
        recebido = opcoes;
        return mapa;
      },
    };

    const runtime = criarMapProviderRuntime(provider, adapter);
    expect(runtime.montar({ container: 'map' })).toBe(mapa);
    expect(recebido.tiles).toEqual(provider.tiles);
    expect(recebido.tileSize).toBe(256);
    expect(recebido.maxzoom).toBe(14);
    expect(recebido.creditos).toBe('Vanguard');
  });

  it('desmonta através do adapter', () => {
    let destruido = false;
    const adapter = {
      renderizar: () => ({}),
      destruir: () => { destruido = true; },
    };

    const runtime = criarMapProviderRuntime(provider, adapter);
    runtime.montar({ container: 'map' });
    runtime.desmontar();

    expect(destruido).toBe(true);
    expect(runtime.obterMapa()).toBe(null);
  });

  it('rejeita provider inválido', () => {
    expect(() => criarMapProviderRuntime({}, { renderizar() {} })).toThrow(/MapProvider inválido/);
  });

  it('rejeita adapter sem renderizar', () => {
    expect(() => criarMapProviderRuntime(provider, {})).toThrow(/renderizar é obrigatório/);
  });
});
