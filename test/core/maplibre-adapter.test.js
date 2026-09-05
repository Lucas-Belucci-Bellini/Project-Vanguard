import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

    assert.equal(mapa, fake.instancias[0]);
    assert.equal(mapa.opcoes.container, 'mapa');
    assert.equal(mapa.opcoes.style, 'style.json');
    assert.equal(mapa.opcoes.maxZoom, 14);
  });

  it('remove a instância anterior ao renderizar novamente', () => {
    const fake = criarMapLibreFake();
    const adapter = criarMapLibreAdapter(fake);

    adapter.renderizar({ container: 'a', style: 'a' });
    const primeiro = adapter.obterMapa();
    adapter.renderizar({ container: 'b', style: 'b' });

    assert.equal(primeiro.removido, true);
    assert.equal(adapter.obterMapa(), fake.instancias[1]);
  });

  it('destrói o mapa e limpa o estado', () => {
    const fake = criarMapLibreFake();
    const adapter = criarMapLibreAdapter(fake);

    adapter.renderizar({ container: 'mapa', style: 'style' });
    const mapa = adapter.obterMapa();
    adapter.destruir();

    assert.equal(mapa.removido, true);
    assert.equal(adapter.obterMapa(), null);
  });

  it('exige um container', () => {
    const fake = criarMapLibreFake();
    const adapter = criarMapLibreAdapter(fake);

    assert.throws(() => adapter.renderizar({ style: 'style' }), /container é obrigatório/);
  });
});
