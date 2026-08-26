import assert from 'node:assert/strict';
import test from 'node:test';
import { contextoPorId, detectarContexto, normalizarZona, zonasAtivas } from '../src/core/contexto.js';

test('normalizarZona exige coordenadas, limita o raio e preserva a fonte', () => {
  const zona = normalizarZona({
    id: 'chernobyl-demo',
    nome: 'Área publicada',
    contexto: 'contaminada',
    lat: 51.389,
    lon: 30.099,
    raioM: 999999,
    fonte: 'fonte oficial · 2026-08-26',
  });
  assert.equal(zona.id, 'chernobyl-demo');
  assert.equal(zona.contexto, 'contaminada');
  assert.equal(zona.raioM, 100000);
  assert.equal(zona.fonte, 'fonte oficial · 2026-08-26');
  assert.equal(normalizarZona({ lat: 'não', lon: 1 }), null);
});

test('detectarContexto ativa uma zona crítica somente quando a posição está dentro do raio', () => {
  const zonas = [{ id: 'z1', nome: 'Zona de teste', contexto: 'conflito', lat: 0, lon: 0, raioM: 1000, fonte: 'autoridade · hoje' }];
  const dentro = detectarContexto({ lat: 0, lon: 0.002 }, zonas, 'cidade');
  const fora = detectarContexto({ lat: 0, lon: 0.02 }, zonas, 'cidade');
  assert.equal(dentro.contexto.id, 'conflito');
  assert.equal(dentro.zona.id, 'z1');
  assert.equal(fora.contexto.id, 'cidade');
  assert.equal(fora.zona, null);
});

test('zonasAtivas descarta zonas desativadas e raios inválidos', () => {
  const ativas = zonasAtivas([
    { id: 'ok', lat: 1, lon: 1, raioM: 100, contexto: 'mar', fonte: 'CHM' },
    { id: 'off', lat: 1, lon: 1, raioM: 100, contexto: 'mar', fonte: 'CHM', ativo: false },
    { id: 'zero', lat: 1, lon: 1, raioM: 0, contexto: 'mar', fonte: 'CHM' },
  ]);
  assert.deepEqual(ativas.map((zona) => zona.id), ['ok']);
  assert.equal(contextoPorId('inexistente').id, 'cidade');
});
