import test from 'node:test';
import assert from 'node:assert/strict';
import { reconciliarPacoteDownload, descartarCheckpointOrfao } from '../src/core/dataset-package-recovery.js';

function mocks({ pacote = null, checkpoint = null } = {}) {
  const calls = { removido: 0, checkpointRemovido: 0 };
  return {
    calls,
    packageStorage: {
      async lerPacote() { return { ok: true, pacote }; },
      async removerPacote() { calls.removido += 1; return { ok: true }; },
    },
    checkpointStorage: {
      async ler() { return { ok: true, checkpoint }; },
      async remover() { calls.checkpointRemovido += 1; return { ok: true }; },
    },
  };
}

test('reconhece estado limpo', async () => {
  const m = mocks();
  assert.deepEqual(await reconciliarPacoteDownload({ ...m, datasetId: 'd1' }), { ok: true, estado: 'CLEAN', datasetId: 'd1' });
});

test('preserva ACTIVE', async () => {
  const m = mocks({ pacote: { datasetId: 'd1', state: 'ACTIVE', sizeBytes: 10 }, checkpoint: { version: 1, datasetId: 'd1', recebido: 5 } });
  const r = await reconciliarPacoteDownload({ ...m, datasetId: 'd1' });
  assert.equal(r.estado, 'ACTIVE_PRESERVED');
  assert.equal(m.calls.removido, 0);
});

test('mantém STAGING quando checkpoint e bytes concordam', async () => {
  const m = mocks({ pacote: { datasetId: 'd1', state: 'STAGING', sizeBytes: 10 }, checkpoint: { version: 1, datasetId: 'd1', recebido: 10 } });
  const r = await reconciliarPacoteDownload({ ...m, datasetId: 'd1' });
  assert.equal(r.estado, 'STAGING_RESUMABLE');
  assert.equal(m.calls.removido, 0);
});

test('descarta STAGING divergente', async () => {
  const m = mocks({ pacote: { datasetId: 'd1', state: 'STAGING', sizeBytes: 9 }, checkpoint: { version: 1, datasetId: 'd1', recebido: 10 } });
  const r = await reconciliarPacoteDownload({ ...m, datasetId: 'd1' });
  assert.equal(r.estado, 'STAGING_DISCARDED_DIVERGENT');
  assert.equal(m.calls.removido, 1);
});

test('descarta STAGING órfão', async () => {
  const m = mocks({ pacote: { datasetId: 'd1', state: 'STAGING', sizeBytes: 9 } });
  const r = await reconciliarPacoteDownload({ ...m, datasetId: 'd1' });
  assert.equal(r.estado, 'STAGING_DISCARDED_ORPHAN');
  assert.equal(m.calls.removido, 1);
});

test('permite remover checkpoint órfão explicitamente', async () => {
  const m = mocks({ checkpoint: { version: 1, datasetId: 'd1', recebido: 10 } });
  const r = await descartarCheckpointOrfao({ checkpointStorage: m.checkpointStorage, datasetId: 'd1' });
  assert.equal(r.ok, true);
  assert.equal(m.calls.checkpointRemovido, 1);
});
