import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarProntidaoOffline } from '../src/core/prontidao-offline.js';

test('prontidão offline começa pendente sem posição ou mapa preparado', () => {
  const resultado = avaliarProntidaoOffline({ agora: 1_700_000_000_000 });
  assert.equal(resultado.pronto, false);
  assert.equal(resultado.conferidos, 2);
  assert.equal(resultado.total, 5);
  assert.equal(resultado.itens.find((item) => item.id === 'posicao').estado, 'pendente');
  assert.equal(resultado.itens.find((item) => item.id === 'mapa').estado, 'pendente');
  assert.equal(resultado.itens.find((item) => item.id === 'comunicacao').estado, 'atencao');
});

test('prontidão offline fica pronta somente para a base local, sem prometer comunicação', () => {
  const resultado = avaliarProntidaoOffline({
    agora: 1_700_000_000_000,
    posicao: { lat: -23.55, lon: -46.63, createdAt: 1_700_000_000_000 },
    mapasOffline: { tilesSalvos: 12 },
    armazenamento: true,
    manualDisponivel: true,
    trilha: [{ lat: -23.55, lon: -46.63 }],
    waypoints: [{ lat: -23.54, lon: -46.62 }],
  });
  assert.equal(resultado.pronto, true);
  assert.match(resultado.recomendacao, /canal de comunicação independente/);
  assert.equal(resultado.itens.find((item) => item.id === 'comunicacao').estado, 'atencao');
});

test('posição válida sem idade confiável fica em atenção e não libera a prontidão', () => {
  for (const posicao of [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 0, createdAt: 0 },
    { lat: 0, lon: 0, createdAt: 1_700_000_000_001 },
  ]) {
    const resultado = avaliarProntidaoOffline({
      agora: 1_700_000_000_000,
      posicao,
      mapasOffline: { tilesSalvos: 4 },
    });
    const item = resultado.itens.find((valor) => valor.id === 'posicao');
    assert.equal(item.estado, 'atencao');
    assert.match(item.detalhe, /idade do fixo não pode ser confirmada/);
    assert.equal(resultado.pronto, false);
  }
  const relogioInvalido = avaliarProntidaoOffline({
    agora: Number.NaN,
    posicao: { lat: 0, lon: 0, createdAt: 1_699_999_999_000 },
    mapasOffline: { tilesSalvos: 4 },
  });
  assert.equal(relogioInvalido.itens.find((valor) => valor.id === 'posicao').estado, 'atencao');
});

test('posição antiga vira atenção e limites geográficos inválidos não contam como fixo', () => {
  const resultado = avaliarProntidaoOffline({
    agora: 1_700_000_000_000,
    posicao: { lat: 91, lon: 0, createdAt: 1_600_000_000_000 },
    cacheTiles: 4,
  });
  assert.equal(resultado.itens.find((item) => item.id === 'posicao').estado, 'pendente');
  const antigo = avaliarProntidaoOffline({
    agora: 1_700_000_000_000,
    posicao: { lat: 0, lon: 0, createdAt: 1_600_000_000_000 },
  });
  assert.equal(antigo.itens.find((item) => item.id === 'posicao').estado, 'atencao');
});
