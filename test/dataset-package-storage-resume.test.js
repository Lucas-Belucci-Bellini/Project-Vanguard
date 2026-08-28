import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPackageStorage, PACKAGE_STATES } from '../src/core/dataset-package-storage.js';

function criarIndexedDBFake() {
  const registros = new Map();
  // Toda requisição precisa disparar `onsuccess`: o adapter resolve a promessa
  // dentro desse callback, então uma requisição muda que nunca o chama deixa a
  // promessa pendente para sempre e o teste é cancelado pelo runner.
  function requisicao(result) {
    const req = { result, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess?.());
    return req;
  }
  const store = {
    put(value) { registros.set(value.datasetId, structuredClone(value)); return requisicao(value); },
    get(id) { return requisicao(registros.get(id) ? structuredClone(registros.get(id)) : undefined); },
    delete(id) { registros.delete(id); return requisicao(undefined); },
    clear() { registros.clear(); return requisicao(undefined); },
  };
  return {
    open() {
      const req = { result: { objectStoreNames: { contains: () => true }, transaction: () => ({ objectStore: () => store }), close() {} }, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  };
}

test('anexa continuação somente em STAGING e preserva ACTIVE', async () => {
  const storage = criarPackageStorage({ indexedDBImpl: criarIndexedDBFake() });
  await storage.salvarPacote('demo', new Uint8Array([1, 2]));
  const resultado = await storage.anexarPacoteStaging('demo', new Uint8Array([3, 4]), { resumed: true });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.sizeBytes, 4);
  assert.equal(resultado.state, PACKAGE_STATES.STAGING);
  const pacote = await storage.lerPacote('demo');
  assert.deepEqual([...pacote.pacote.bytes], [1, 2, 3, 4]);
});

test('recusa anexação quando o pacote não está em staging', async () => {
  const storage = criarPackageStorage({ indexedDBImpl: criarIndexedDBFake() });
  await storage.salvarPacote('demo', new Uint8Array([1]));
  await storage.promoverPacote('demo');
  const resultado = await storage.anexarPacoteStaging('demo', new Uint8Array([2]));
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'PACKAGE_NOT_STAGING');
});
