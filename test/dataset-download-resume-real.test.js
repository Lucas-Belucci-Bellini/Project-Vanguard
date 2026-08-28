import test from 'node:test';
import assert from 'node:assert/strict';
import { criarCheckpointDownload, retomarDataset } from '../src/core/dataset-download-resume.js';

test('retoma dataset usando Range e If-Range e combina staging', async () => {
  const checkpoint = criarCheckpointDownload({ datasetId: 'demo', recebido: 2, total: 4, etag: '"abc"' });
  let chamada;
  const resultado = await retomarDataset({
    url: 'https://example.invalid/dataset',
    checkpoint,
    bytesStaging: new Uint8Array([1, 2]),
    fetchImpl: async (_url, options) => {
      chamada = options;
      return new Response(new Uint8Array([3, 4]), {
        status: 206,
        headers: { 'content-range': 'bytes 2-3/4' },
      });
    },
  });

  assert.equal(resultado.ok, true);
  assert.deepEqual([...resultado.bytes], [1, 2, 3, 4]);
  assert.equal(chamada.headers.get('Range'), 'bytes=2-');
  assert.equal(chamada.headers.get('If-Range'), '"abc"');
});

test('rejeita resposta 200 para uma retomada', async () => {
  const checkpoint = criarCheckpointDownload({ datasetId: 'demo', recebido: 2, total: 4 });
  const resultado = await retomarDataset({
    url: 'https://example.invalid/dataset',
    checkpoint,
    bytesStaging: new Uint8Array([1, 2]),
    fetchImpl: async () => new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }),
  });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'RANGE_NAO_ATENDIDO');
});

test('rejeita staging cujo tamanho diverge do checkpoint', async () => {
  const checkpoint = criarCheckpointDownload({ datasetId: 'demo', recebido: 2 });
  const resultado = await retomarDataset({
    url: 'https://example.invalid/dataset',
    checkpoint,
    bytesStaging: new Uint8Array([1]),
    fetchImpl: async () => { throw new Error('não deveria chamar fetch'); },
  });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'STAGING_CHECKPOINT_DIVERGENTE');
});
