import { describe, expect, it } from 'vitest';
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

    expect(carregamentos).toBe(1);
    expect(motor.provider.id).toBe('terreno');
    expect(mapa.options.container).toBe('mapa');
    expect(mapa.options.style.sources.terreno.tiles[0]).toContain('opentopomap');
  });

  it('permite fornecer um style completo sem perder o provider', async () => {
    const motor = await criarMotorMapa({ providerId: 'terreno', carregarMapLibre: async () => mapLibreFake() });
    const style = { version: 8, sources: {}, layers: [] };
    const mapa = motor.montar({ container: 'mapa', style });

    expect(mapa.options.style).toBe(style);
  });

  it('rejeita provider inexistente', async () => {
    await expect(criarMotorMapa({ providerId: 'nao-existe', carregarMapLibre: async () => mapLibreFake() }))
      .rejects.toThrow(/Provider de mapa indisponível/);
  });

  it('rejeita falha no carregamento do MapLibre', async () => {
    await expect(criarMotorMapa({ providerId: 'terreno', carregarMapLibre: async () => null }))
      .rejects.toThrow(/MapLibre não pôde ser carregado/);
  });
});
