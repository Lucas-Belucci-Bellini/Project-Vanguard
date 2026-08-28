import assert from 'node:assert/strict';
import test from 'node:test';
import { criarPackageStorage } from '../src/core/dataset-package-storage.js';

test('retorna indisponível sem IndexedDB sem lançar exceção', async () => {
  const storage = criarPackageStorage({ indexedDBImpl: null });
  assert.equal(storage.disponivel, false);
  assert.equal((await storage.lerPacote('x')).codigo, 'PACKAGE_STORAGE_UNAVAILABLE');
});

test('rejeita datasetId vazio e bytes inválidos antes do backend', async () => {
  const storage = criarPackageStorage({ indexedDBImpl: null });
  assert.equal((await storage.salvarPacote('', new Uint8Array([1]))).codigo, 'DATASET_ID_INVALIDO');
  assert.equal((await storage.salvarPacote('x', 'bytes')).codigo, 'BYTES_INVALIDOS');
});

test('expõe diagnóstico explícito do backend físico', () => {
  const storage = criarPackageStorage({ indexedDBImpl: {} });
  assert.equal(storage.disponivel, true);
  assert.equal(storage.diagnostico().backend, 'indexedDB');
});
