import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarMotorMapa } from '../../src/core/map-engine.js';

function mapLibreFake() {
  class MapFake {
    constructor(options) { this.options = options; this.removido = false; }
    remove() { this.removido = true; }
  }
  return { Map: MapFake };
}

describe('map-engine', () => {
  it('carrega e monta o provider solicitado', async () => {
    let carregamentos = 0;
    const motor = await criarMotorMapa({
      providerId: 'terreno',
      carregarMapLibre: async () => { carregamentos += 1; return mapLibreFake(); },
    });

    const mapa = motor.montar({ container: 'mapa', center: [-43.21, -22.95], zoom: 8 });

    assert.equal(carregamentos, 1);
    assert.equal(motor.provider.id, 'terreno');
    assert.equal(mapa.options.container, 'mapa');
    assert.ok(mapa.options.style.sources.terreno.tiles[0].includes('opentopomap'));
  });

  it('permite fornecer um style completo sem perder o provider', async () => {
    const motor = await criarMotorMapa({ providerId: 'terreno', carregarMapLibre: async () => mapLibreFake() });
    const style = { version: 8, sources: {}, layers: [] };
    const mapa = motor.montar({ container: 'mapa', style });

    assert.equal(mapa.options.style, style);
  });

  it('rejeita provider inexistente', async () => {
    await assert.rejects(
      criarMotorMapa({ providerId: 'nao-existe', carregarMapLibre: async () => mapLibreFake() }),
      /Provider de mapa indisponível/,
    );
  });

  it('rejeita falha no carregamento do MapLibre', async () => {
    await assert.rejects(
      criarMotorMapa({ providerId: 'terreno', carregarMapLibre: async () => null }),
      /MapLibre não pôde ser carregado/,
    );
  });

  it('exige a função de carregamento do motor', async () => {
    await assert.rejects(criarMotorMapa({ providerId: 'terreno' }), /carregarMapLibre é obrigatório/);
  });
});
