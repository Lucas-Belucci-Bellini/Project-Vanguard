import test from 'node:test';
import assert from 'node:assert/strict';
import { criarCheckpointStorage } from '../src/core/dataset-download-checkpoint-storage.js';

test('storage sem IndexedDB informa indisponibilidade', async () => {
  const storage = criarCheckpointStorage({ indexedDBImpl: null });
  assert.equal(storage.disponivel, false);
  assert.equal((await storage.ler('x')).codigo, 'DOWNLOAD_CHECKPOINT_STORAGE_UNAVAILABLE');
});

test('checkpoint inválido é recusado antes do storage', async () => {
  const storage = criarCheckpointStorage({ indexedDBImpl: null });
  const resultado = await storage.salvar({ version: 2, datasetId: 'x', recebido: 1 });
  assert.equal(resultado.codigo, 'DOWNLOAD_CHECKPOINT_STORAGE_UNAVAILABLE');
});
