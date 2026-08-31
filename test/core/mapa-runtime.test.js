import { describe, expect, it } from 'vitest';
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

    expect(mapa).toBeTruthy();
    expect(runtime.providerAtual().id).toBe('terreno');
    expect(runtime.providers().length).toBeGreaterThan(0);
    expect(fakeProvider.opcoes.style.version).toBe(8);
    expect(fakeProvider.opcoes.style.sources.terreno.tiles[0]).toMatch(/opentopomap\.org/);
    expect(fakeProvider.opcoes.style.layers.find((layer) => layer.id === 'base-terreno').layout.visibility).toBe('visible');
  });

  it('usa a primeira camada quando a base solicitada não existe', () => {
    const runtime = criarMapaRuntime({ adaptador: fakeProvider, baseId: 'inexistente' });
    expect(runtime.providerAtual().id).toBe('carto-voyager');
  });

  it('exige um adapter', () => {
    expect(() => criarMapaRuntime()).toThrow(/adaptador é obrigatório/);
  });
});
