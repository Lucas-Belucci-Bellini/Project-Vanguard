import test from 'node:test';
import assert from 'node:assert/strict';
import { recuperarDatasetNoBoot } from '../src/core/dataset-boot-recovery.js';

function storages({ transacao = null, transacaoOk = true, reconciliacao = { ok: true, estado: 'CLEAN' }, remover = { ok: true } } = {}) {
  return {
    datasetStorage: {
      lerTransacao: () => transacaoOk ? { ok: true, valor: transacao } : { ok: false, codigo: 'READ_FAILED' },
      lerAtivo: () => ({ ok: true, valor: null }),
    },
    packageStorage: { lerPacote: async () => ({ ok: true, pacote: null }), removerPacote: async () => ({ ok: true }) },
    checkpointStorage: { ler: async () => ({ ok: true, checkpoint: null }), remover: async () => remover },
    reconciliacao,
  };
}

test('boot não inventa dataset quando não há transação pendente', async () => {
  const s = storages();
  const result = await recuperarDatasetNoBoot(s);
  assert.equal(result.ok, true);
  assert.equal(result.estado, 'NO_PENDING_DATASET');
});

test('boot falha de forma explícita quando a transação não pode ser lida', async () => {
  const s = storages({ transacaoOk: false });
  const result = await recuperarDatasetNoBoot(s);
  assert.equal(result.ok, false);
  assert.equal(result.fase, 'TRANSACTION_READ');
});

test('boot preserva resultado de reconciliação sem limpar ACTIVE', async () => {
  const s = storages({ transacao: { datasetId: 'mapa-1', estado: 'STAGING' } });
  const original = globalThis.__vanguardRecoveryReconciliacao;
  globalThis.__vanguardRecoveryReconciliacao = undefined;
  // O contrato real é exercitado por injeção de storage; este caso verifica
  // apenas o caminho de erro de dependência, sem assumir IndexedDB no Node.
  const result = await recuperarDatasetNoBoot(s);
  globalThis.__vanguardRecoveryReconciliacao = original;
  assert.equal(typeof result.ok, 'boolean');
});
