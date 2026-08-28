import test from 'node:test';
import assert from 'node:assert/strict';
import { criarCheckpointDownload, criarRangeRetomada, validarRespostaRetomada } from '../src/core/dataset-download-resume.js';

test('cria checkpoint e Range a partir do offset recebido', () => {
  const checkpoint = criarCheckpointDownload({ datasetId: 'mapa-br', recebido: 1024, total: 4096, etag: '"abc"' });
  const range = criarRangeRetomada(checkpoint);
  assert.deepEqual(range.headers, { Range: 'bytes=1024-', 'If-Range': '"abc"' });
});

test('não cria Range quando ainda não há bytes', () => {
  const checkpoint = criarCheckpointDownload({ datasetId: 'mapa-br' });
  assert.equal(criarRangeRetomada(checkpoint).codigo, 'RETOMADA_NAO_NECESSARIA');
});

test('aceita Content-Range exatamente no offset salvo', () => {
  const checkpoint = criarCheckpointDownload({ datasetId: 'mapa-br', recebido: 1024, total: 4096 });
  const response = new Response(new Uint8Array([1]), { status: 206, headers: { 'content-range': 'bytes 1024-1024/4096' } });
  assert.equal(validarRespostaRetomada(response, checkpoint).ok, true);
});

test('rejeita resposta Range iniciando em offset diferente', () => {
  const checkpoint = criarCheckpointDownload({ datasetId: 'mapa-br', recebido: 1024, total: 4096 });
  const response = new Response(new Uint8Array([1]), { status: 206, headers: { 'content-range': 'bytes 2048-2048/4096' } });
  assert.equal(validarRespostaRetomada(response, checkpoint).codigo, 'RANGE_OFFSET_INCORRETO');
});

test('rejeita resposta sem status 206', () => {
  const checkpoint = criarCheckpointDownload({ datasetId: 'mapa-br', recebido: 1024, total: 4096 });
  const response = new Response(new Uint8Array([1]), { status: 200 });
  assert.equal(validarRespostaRetomada(response, checkpoint).codigo, 'RANGE_NAO_ATENDIDO');
});
