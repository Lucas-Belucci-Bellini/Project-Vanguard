import test from 'node:test';
import assert from 'node:assert/strict';
import { baixarDataset } from '../src/core/dataset-download.js';

test('baixa stream completo e reporta progresso', async () => {
  const progresso = [];
  const response = new Response(new Uint8Array([1, 2, 3, 4]), {
    status: 200,
    headers: { 'content-length': '4' },
  });
  const resultado = await baixarDataset(response, { onProgress: (evento) => progresso.push(evento) });

  assert.equal(resultado.ok, true);
  assert.deepEqual([...resultado.bytes], [1, 2, 3, 4]);
  assert.equal(resultado.sizeBytes, 4);
  assert.equal(progresso.at(-1).percentual, 100);
});

test('recusa resposta HTTP não bem-sucedida', async () => {
  const resultado = await baixarDataset(new Response(null, { status: 404 }));
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'DOWNLOAD_HTTP');
});

test('bloqueia pacote acima do limite', async () => {
  const response = new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { 'content-length': '3' },
  });
  const resultado = await baixarDataset(response, { maxBytes: 2 });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'DOWNLOAD_LIMITE');
});

test('detecta stream menor que content-length declarado', async () => {
  const response = new Response(new Uint8Array([1, 2]), {
    status: 200,
    headers: { 'content-length': '3' },
  });
  const resultado = await baixarDataset(response);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'DOWNLOAD_INCOMPLETO');
});
