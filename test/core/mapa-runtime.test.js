import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarMapaRuntime } from '../../src/core/mapa-runtime.js';

const fakeProvider = {
  renderizar(opcoes) {
    this.opcoes = opcoes;
    return { remove() {} };
  },
  destruir() {},
};

describe('MapaRuntime', () => {
  it('compõe o catálogo e gera o estilo para o provider escolhido', () => {
    const runtime = criarMapaRuntime({ adaptador: fakeProvider, baseId: 'terreno', overlays: ['labels'] });
    const mapa = runtime.montar({ container: 'mapa', center: [-43.2, -22.9], zoom: 10 });

    assert.ok(mapa);
    assert.equal(runtime.providerAtual().id, 'terreno');
    assert.ok(runtime.providers().length > 0);
    assert.equal(fakeProvider.opcoes.style.version, 8);
    assert.ok(fakeProvider.opcoes.style.sources.terreno.tiles.some((tile) => tile.includes('opentopomap.org')));
    assert.equal(fakeProvider.opcoes.style.layers.find((layer) => layer.id === 'base-terreno').layout.visibility, 'visible');
  });

  it('usa a primeira camada quando a base solicitada não existe', () => {
    const runtime = criarMapaRuntime({ adaptador: fakeProvider, baseId: 'inexistente' });
    assert.equal(runtime.providerAtual().id, 'carto-voyager');
  });

  it('exige um adapter', () => {
    assert.throws(() => criarMapaRuntime(), /adaptador é obrigatório/);
  });
});
