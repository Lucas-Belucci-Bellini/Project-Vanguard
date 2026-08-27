import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTADOS_TRILHA, estadoTrilha, transicionarTrilha } from '../src/core/trilha-sessao.js';

test('estadoTrilha distingue parada, gravação e pausa manual', () => {
  assert.equal(estadoTrilha(), ESTADOS_TRILHA.PARADA);
  assert.equal(estadoTrilha({ ativa: true }), ESTADOS_TRILHA.GRAVANDO);
  assert.equal(estadoTrilha({ ativa: true, pausada: true }), ESTADOS_TRILHA.PAUSADA);
  assert.equal(estadoTrilha({ ativa: false, pausada: true }), ESTADOS_TRILHA.PARADA);
});

test('transicionarTrilha implementa Start/Pause/Resume/Stop sem inventar transições', () => {
  assert.deepEqual(transicionarTrilha(ESTADOS_TRILHA.PARADA, 'START'), { ativa: true, pausada: false });
  assert.deepEqual(transicionarTrilha(ESTADOS_TRILHA.GRAVANDO, 'PAUSE'), { ativa: true, pausada: true });
  assert.deepEqual(transicionarTrilha(ESTADOS_TRILHA.PAUSADA, 'RESUME'), { ativa: true, pausada: false });
  assert.deepEqual(transicionarTrilha(ESTADOS_TRILHA.GRAVANDO, 'STOP'), { ativa: false, pausada: false });
  assert.deepEqual(transicionarTrilha(ESTADOS_TRILHA.PARADA, 'RESUME'), { ativa: false, pausada: false });
  assert.deepEqual(transicionarTrilha(ESTADOS_TRILHA.PAUSADA, 'PAUSE'), { ativa: true, pausada: true });
  assert.deepEqual(transicionarTrilha(ESTADOS_TRILHA.GRAVANDO, 'IGNORAR'), { ativa: true, pausada: false });
});
