import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
    assert.equal(runtime.montar({ container: 'map' }), mapa);
    assert.deepEqual(recebido.tiles, provider.tiles);
    assert.equal(recebido.tileSize, 256);
    assert.equal(recebido.maxzoom, 14);
    assert.equal(recebido.creditos, 'Vanguard');
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

    assert.equal(destruido, true);
    assert.equal(runtime.obterMapa(), null);
  });

  it('rejeita provider inválido', () => {
    assert.throws(() => criarMapProviderRuntime({}, { renderizar() {} }), /MapProvider inválido/);
  });

  it('rejeita adapter sem renderizar', () => {
    assert.throws(() => criarMapProviderRuntime(provider, {}), /renderizar é obrigatório/);
  });
});
