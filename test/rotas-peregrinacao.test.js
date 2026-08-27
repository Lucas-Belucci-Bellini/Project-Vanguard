import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADOS_ROTA,
  ROTAS_PEREGRINACAO,
  rotaPorId,
  statusRotaLabel,
} from '../src/data/rotas-peregrinacao.js';

test('catálogo traz rotas de peregrinação verificáveis como referência sem geometria inventada', () => {
  assert.deepEqual(ROTAS_PEREGRINACAO.slice(0, 4).map((rota) => rota.id), [
    'caminhos-dos-anjos',
    'caminho-da-fe',
    'rota-do-rosario',
    'caminho-sagrado',
  ]);
  for (const rota of ROTAS_PEREGRINACAO.slice(0, 4)) {
    assert.equal(rota.estado, ESTADOS_ROTA.REFERENCIA);
    assert.equal(rota.navegacaoDisponivel, false);
    assert.ok(rota.fontes.length > 0);
  }
  assert.ok(rotaPorId('caminhos-dos-anjos').cidades.includes('Londrina'));
  assert.ok(rotaPorId('caminho-sagrado').cidades.includes('Nova Veneza'));
});

test('Rota do Carvalho fica não confirmada e fora da navegação', () => {
  const rota = rotaPorId('rota-do-carvalho');
  assert.equal(rota.estado, ESTADOS_ROTA.NAO_CONFIRMADA);
  assert.equal(rota.navegacaoDisponivel, false);
  assert.deepEqual(rota.fontes, []);
  assert.match(statusRotaLabel(rota), /NÃO CONFIRMADA/);
});

test('catálogo e seus registros internos são imutáveis', () => {
  assert.equal(Object.isFrozen(ROTAS_PEREGRINACAO), true);
  assert.equal(Object.isFrozen(rotaPorId('caminhos-dos-anjos')), true);
  assert.equal(Object.isFrozen(rotaPorId('caminhos-dos-anjos').cidades), true);
  assert.equal(Object.isFrozen(rotaPorId('caminhos-dos-anjos').fontes), true);
});
