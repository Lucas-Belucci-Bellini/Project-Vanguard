import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ESTADOS_SYNC_DATASET,
  cancelarTransacaoDataset,
  concluirAtivacaoDataset,
  criarTransacaoDataset,
  rollbackTransacaoDataset,
  solicitarAtivacaoDataset,
  transicionarDataset,
  verificarPacoteDataset,
} from '../src/core/dataset-transacao.js';

const CHECKSUM = 'a'.repeat(64);
const ATIVO = {
  schema: 'vanguard-dataset-manifest',
  manifestVersion: 1,
  datasetId: 'world-overview',
  version: '2026.08.1',
  formatVersion: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  source: 'Fonte autorizada',
  license: 'Licença revisada',
  checksum: CHECKSUM,
  minimumAppVersion: '1.0.0',
  regions: [{ id: 'south-america', version: '2026.08.1', sizeBytes: 1024, checksum: CHECKSUM }],
};

function novoManifesto(overrides = {}) {
  return {
    ...ATIVO,
    version: '2026.08.2',
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  };
}

function emEstado(manifesto = novoManifesto()) {
  const criada = criarTransacaoDataset({ ativo: ATIVO, manifesto, agora: Date.parse('2026-08-28T00:00:00.000Z') });
  assert.equal(criada.ok, true);
  return criada.transacao;
}

function ateVerificacao(manifesto = novoManifesto()) {
  let transacao = emEstado(manifesto);
  transacao = transicionarDataset(transacao, ESTADOS_SYNC_DATASET.CHECKING).transacao;
  transacao = transicionarDataset(transacao, ESTADOS_SYNC_DATASET.AVAILABLE).transacao;
  transacao = transicionarDataset(transacao, ESTADOS_SYNC_DATASET.DOWNLOADING).transacao;
  transacao = transicionarDataset(transacao, ESTADOS_SYNC_DATASET.VERIFYING).transacao;
  return transacao;
}

test('cria transação válida e bloqueia concorrência do mesmo dataset', () => {
  const primeira = emEstado();
  const concorrente = criarTransacaoDataset({ ativo: ATIVO, manifesto: novoManifesto(), transacaoAtiva: primeira });
  assert.equal(concorrente.ok, false);
  assert.equal(concorrente.codigo, 'ATUALIZACAO_EM_ANDAMENTO');
});

test('executa download, verificação, staging e ativação atômica', () => {
  let transacao = ateVerificacao();
  transacao = verificarPacoteDataset(transacao, { bytes: 1024, checksum: CHECKSUM.toUpperCase(), verificadoEm: Date.parse('2026-08-28T01:00:00.000Z') }).transacao;
  assert.equal(transacao.estado, ESTADOS_SYNC_DATASET.STAGING);
  assert.deepEqual(transacao.ativo, ATIVO);
  assert.equal(transacao.staging.bytes, 1024);

  transacao = solicitarAtivacaoDataset(transacao).transacao;
  assert.equal(transacao.estado, ESTADOS_SYNC_DATASET.ACTIVATING);
  assert.deepEqual(transacao.ativo, ATIVO);

  transacao = concluirAtivacaoDataset(transacao, { concluidoEm: Date.parse('2026-08-28T01:01:00.000Z') }).transacao;
  assert.equal(transacao.estado, ESTADOS_SYNC_DATASET.COMPLETE);
  assert.equal(transacao.ativo.version, '2026.08.2');
  assert.equal(transacao.staging, null);
});

test('rejeita tamanho ou checksum inválido e preserva ativo até rollback', () => {
  const antes = ateVerificacao();
  const falhaTamanho = verificarPacoteDataset(antes, { bytes: 1, checksum: CHECKSUM });
  assert.equal(falhaTamanho.ok, true);
  assert.equal(falhaTamanho.transacao.estado, ESTADOS_SYNC_DATASET.FAILED);
  assert.equal(falhaTamanho.transacao.erro.codigo, 'TAMANHO_INVALIDO');
  assert.deepEqual(falhaTamanho.transacao.ativo, ATIVO);

  const rollback = rollbackTransacaoDataset(falhaTamanho.transacao);
  assert.equal(rollback.ok, true);
  assert.equal(rollback.transacao.estado, ESTADOS_SYNC_DATASET.ROLLED_BACK);
  assert.deepEqual(rollback.transacao.ativo, ATIVO);
  assert.equal(rollback.transacao.staging, null);

  const falhaChecksum = verificarPacoteDataset(ateVerificacao(), { bytes: 1024, checksum: 'b'.repeat(64) });
  assert.equal(falhaChecksum.transacao.estado, ESTADOS_SYNC_DATASET.FAILED);
  assert.equal(falhaChecksum.transacao.erro.codigo, 'CHECKSUM_INVALIDO');
});

test('cancela antes da ativação e não altera dataset ativo', () => {
  const transacao = transicionarDataset(emEstado(), ESTADOS_SYNC_DATASET.CHECKING).transacao;
  const cancelada = cancelarTransacaoDataset(transacao);
  assert.equal(cancelada.ok, true);
  assert.equal(cancelada.transacao.estado, ESTADOS_SYNC_DATASET.CANCELLED);
  assert.deepEqual(cancelada.transacao.ativo, ATIVO);
  assert.equal(cancelada.transacao.staging, null);
  assert.equal(cancelarTransacaoDataset(cancelada.transacao).ok, false);
});

test('impede ativação sem staging e transições inválidas', () => {
  const transacao = emEstado();
  const ativacao = solicitarAtivacaoDataset(transacao);
  assert.equal(ativacao.ok, false);
  assert.equal(ativacao.codigo, 'STAGING_NAO_VALIDO');

  const invalida = transicionarDataset(transacao, ESTADOS_SYNC_DATASET.COMPLETE);
  assert.equal(invalida.ok, false);
  assert.equal(invalida.codigo, 'TRANSICAO_INVALIDA');
});

test('rejeita versão igual e datasetId divergente', () => {
  const igual = criarTransacaoDataset({ ativo: ATIVO, manifesto: ATIVO });
  assert.equal(igual.ok, false);
  assert.equal(igual.codigo, 'SEM_ATUALIZACAO');

  const diferente = criarTransacaoDataset({ ativo: ATIVO, manifesto: novoManifesto({ datasetId: 'other-dataset' }) });
  assert.equal(diferente.ok, false);
  assert.equal(diferente.codigo, 'DATASET_ID_DIVERGENTE');
});
