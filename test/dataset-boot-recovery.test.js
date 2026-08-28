import test from 'node:test';
import assert from 'node:assert/strict';
import { recuperarDatasetNoBoot } from '../src/core/dataset-boot-recovery.js';

function baseStorages(transacao = null) {
  return {
    datasetStorage: {
      lerTransacao: () => ({ ok: true, valor: transacao }),
      lerAtivo: () => ({ ok: true, valor: null }),
    },
    packageStorage: {},
    checkpointStorage: {},
  };
}

test('boot não inventa dataset quando não há transação pendente', async () => {
  const result = await recuperarDatasetNoBoot(baseStorages());
  assert.equal(result.ok, true);
  assert.equal(result.estado, 'NO_PENDING_DATASET');
});

test('boot falha de forma explícita quando a transação não pode ser lida', async () => {
  const result = await recuperarDatasetNoBoot({
    ...baseStorages(),
    datasetStorage: { lerTransacao: () => ({ ok: false, codigo: 'READ_FAILED' }), lerAtivo: () => ({ ok: true, valor: null }) },
  });
  assert.equal(result.ok, false);
  assert.equal(result.fase, 'TRANSACTION_READ');
});

test('boot encaminha o dataset pendente para reconciliação', async () => {
  let recebido;
  const result = await recuperarDatasetNoBoot({
    ...baseStorages({ datasetId: 'mapa-1', estado: 'STAGING' }),
    reconciliar: async (args) => { recebido = args; return { ok: true, estado: 'STAGING_RESUMABLE' }; },
  });
  assert.equal(result.ok, true);
  assert.equal(result.estado, 'STAGING_RESUMABLE');
  assert.equal(recebido.datasetId, 'mapa-1');
});

test('boot remove checkpoint órfão somente depois de reconciliação', async () => {
  let removido = false;
  const result = await recuperarDatasetNoBoot({
    ...baseStorages({ datasetId: 'mapa-2', estado: 'STAGING' }),
    reconciliar: async () => ({ ok: true, estado: 'CHECKPOINT_ORPHAN' }),
    removerCheckpointOrfao: async ({ datasetId }) => { removido = datasetId === 'mapa-2'; return { ok: true, datasetId }; },
  });
  assert.equal(result.ok, true);
  assert.equal(result.checkpointOrfaoRemovido, true);
  assert.equal(removido, true);
});

test('boot não limpa checkpoint se a reconciliação falhar', async () => {
  let limpeza = false;
  const result = await recuperarDatasetNoBoot({
    ...baseStorages({ datasetId: 'mapa-3', estado: 'STAGING' }),
    reconciliar: async () => ({ ok: false, codigo: 'PACKAGE_STORAGE_FAILED' }),
    removerCheckpointOrfao: async () => { limpeza = true; return { ok: true }; },
  });
  assert.equal(result.ok, false);
  assert.equal(result.fase, 'PACKAGE_RECONCILIATION');
  assert.equal(limpeza, false);
});
