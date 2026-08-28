import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPipelineDownloadDataset } from '../src/core/dataset-download-pipeline.js';

function criarFakes({ falharEm = null } = {}) {
  const chamadas = [];
  const session = {
    async iniciar(response) {
      chamadas.push(['download', response]);
      if (falharEm === 'download') return { ok: false, codigo: 'DOWNLOAD_FALHOU' };
      return { ok: true, bytes: new Uint8Array([1, 2, 3]), sizeBytes: 3 };
    },
  };
  const sync = {
    avancar(estado, detalhes) {
      chamadas.push(['avancar', estado, detalhes]);
      if (falharEm === 'avancar') return { ok: false, codigo: 'ESTADO_INVALIDO' };
      return { ok: true };
    },
    async armazenarBytes(bytes, metadata) {
      chamadas.push(['armazenar', [...bytes], metadata]);
      if (falharEm === 'armazenar') return { ok: false, codigo: 'CHECKSUM_INVALIDO' };
      return { ok: true, pacote: { datasetId: 'teste' } };
    },
    async ativar() {
      chamadas.push(['ativar']);
      if (falharEm === 'ativar') return { ok: false, codigo: 'ATIVACAO_NAO_GRAVADA' };
      return { ok: true, transacao: { estado: 'COMPLETE' } };
    },
  };
  return { session, sync, chamadas };
}

test('pipeline executa download, verificacao, armazenamento e ativacao em ordem', async () => {
  const { session, sync, chamadas } = criarFakes();
  const pipeline = criarPipelineDownloadDataset({ session, sync });
  const resultado = await pipeline.executar({ id: 'response' }, { metadata: { origem: 'teste' } });

  assert.equal(resultado.ok, true);
  assert.deepEqual(chamadas.map((item) => item[0]), ['download', 'avancar', 'armazenar', 'ativar']);
  assert.equal(chamadas[1][1], 'VERIFYING');
  assert.deepEqual(chamadas[2][1], [1, 2, 3]);
  assert.equal(pipeline.emExecucao(), false);
});

test('pipeline para no download e não ativa pacote', async () => {
  const { session, sync, chamadas } = criarFakes({ falharEm: 'download' });
  const pipeline = criarPipelineDownloadDataset({ session, sync });
  const resultado = await pipeline.executar({});

  assert.equal(resultado.ok, false);
  assert.deepEqual(chamadas.map((item) => item[0]), ['download']);
});

test('pipeline não ativa quando armazenamento falha', async () => {
  const { session, sync, chamadas } = criarFakes({ falharEm: 'armazenar' });
  const pipeline = criarPipelineDownloadDataset({ session, sync });
  const resultado = await pipeline.executar({});

  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'CHECKSUM_INVALIDO');
  assert.deepEqual(chamadas.map((item) => item[0]), ['download', 'avancar', 'armazenar']);
});

test('pipeline rejeita execução concorrente', async () => {
  let liberar;
  const session = {
    iniciar: () => new Promise((resolve) => { liberar = () => resolve({ ok: true, bytes: new Uint8Array(), sizeBytes: 0 }); }),
  };
  const sync = {
    avancar: () => ({ ok: true }),
    armazenarBytes: async () => ({ ok: true }),
    ativar: async () => ({ ok: true }),
  };
  const pipeline = criarPipelineDownloadDataset({ session, sync });
  const primeiro = pipeline.executar({});
  const segundo = await pipeline.executar({});
  assert.equal(segundo.codigo, 'PIPELINE_EM_ANDAMENTO');
  liberar();
  await primeiro;
});
