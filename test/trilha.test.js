import test from 'node:test';
import assert from 'node:assert/strict';
import { resumoTrilha } from '../src/core/trilha.js';

test('resumoTrilha calcula distância, duração e velocidade média com dados locais', () => {
  const resumo = resumoTrilha([
    { lat: 0, lon: 0, createdAt: 1_700_000_000_000 },
    { lat: 0, lon: 0.01, createdAt: 1_700_000_060_000 },
  ]);
  assert.equal(resumo.pontos, 2);
  assert.ok(resumo.distanciaM > 1_000 && resumo.distanciaM < 1_200);
  assert.equal(resumo.duracaoMs, 60_000);
  assert.equal(resumo.duracaoLabel, '1min 00s');
  assert.ok(resumo.velocidadeMediaMps > 15 && resumo.velocidadeMediaMps < 20);
  assert.match(resumo.velocidadeMediaLabel, /km\/h média/);
  assert.equal(resumo.temTempo, true);
});

test('resumoTrilha não inventa duração ou velocidade sem timestamps completos', () => {
  const resumo = resumoTrilha([
    { lat: -23.55, lon: -46.63 },
    { lat: -23.551, lon: -46.631, createdAt: 1_700_000_000_000 },
  ]);
  assert.ok(resumo.distanciaM > 0);
  assert.equal(resumo.duracaoMs, null);
  assert.equal(resumo.duracaoLabel, 'tempo indisponível');
  assert.equal(resumo.velocidadeMediaMps, null);
  assert.equal(resumo.temTempo, false);
});

test('resumoTrilha ignora pontos geograficamente inválidos e aceita trilha vazia', () => {
  const resumo = resumoTrilha([{ lat: 91, lon: 0 }, { lat: 0, lon: 0 }]);
  assert.equal(resumo.pontos, 1);
  assert.equal(resumo.distanciaM, 0);
  assert.equal(resumoTrilha().pontos, 0);
});
