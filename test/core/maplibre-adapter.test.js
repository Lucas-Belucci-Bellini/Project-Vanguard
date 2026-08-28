import { describe, expect, it } from 'vitest';
import { criarMapLibreAdapter } from '../../src/core/maplibre-adapter.js';

function criarMapLibreFake() {
  const instancias = [];

  class MapFake {
    constructor(opcoes) {
      this.opcoes = opcoes;
      this.removido = false;
      instancias.push(this);
    }

    remove() {
      this.removido = true;
    }
  }

  return { Map: MapFake, instancias };
}

describe('MapLibreAdapter', () => {
  it('cria um mapa com as opções do provider', () => {
    const fake = criarMapLibreFake();
    const adapter = criarMapLibreAdapter(fake);

    const mapa = adapter.renderizar({
      container: 'mapa',
      style: 'style.json',
      center: [-51, -23],
      zoom: 8,
      maxzoom: 14,
    });

    expect(mapa).toBe(fake.instancias[0]);
    expect(mapa.opcoes.container).toBe('mapa');
    expect(mapa.opcoes.style).toBe('style.json');
    expect(mapa.opcoes.maxZoom).toBe(14);
  });

  it('remove a instância anterior ao renderizar novamente', () => {
    const fake = criarMapLibreFake();
    const adapter = criarMapLibreAdapter(fake);

    adapter.renderizar({ container: 'a', style: 'a' });
    const primeiro = adapter.obterMapa();
    adapter.renderizar({ container: 'b', style: 'b' });

    expect(primeiro.removido).toBe(true);
    expect(adapter.obterMapa()).toBe(fake.instancias[1]);
  });

  it('destrói o mapa e limpa o estado', () => {
    const fake = criarMapLibreFake();
    const adapter = criarMapLibreAdapter(fake);

    adapter.renderizar({ container: 'mapa', style: 'style' });
    const mapa = adapter.obterMapa();
    adapter.destruir();

    expect(mapa.removido).toBe(true);
    expect(adapter.obterMapa()).toBe(null);
  });

  it('exige um container', () => {
    const fake = criarMapLibreFake();
    const adapter = criarMapLibreAdapter(fake);

    expect(() => adapter.renderizar({ style: 'style' })).toThrow(/container é obrigatório/);
  });
});
