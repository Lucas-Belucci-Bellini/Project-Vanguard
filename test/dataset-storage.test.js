import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHAVES_STORAGE_DATASET,
  ESQUEMA_STORAGE_DATASET,
  VERSAO_STORAGE_DATASET,
  criarStorageDataset,
} from '../src/core/dataset-storage.js';

const CHECKSUM = 'a'.repeat(64);
const MANIFESTO = {
  schema: 'vanguard-dataset-manifest',
  manifestVersion: 1,
  datasetId: 'world-overview',
  version: '2026.08.3',
  formatVersion: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
  source: 'Fonte autorizada',
  license: 'Licença revisada',
  checksum: CHECKSUM.toUpperCase(),
  minimumAppVersion: '1.0.0',
  regions: [{ id: 'south-america', version: '2026.08.3', sizeBytes: 12, checksum: CHECKSUM.toUpperCase() }],
};

function criarBackend() {
  const dados = new Map();
  return {
    dados,
    getItem(chave) { return dados.has(chave) ? dados.get(chave) : null; },
    setItem(chave, valor) { dados.set(chave, String(valor)); },
    removeItem(chave) { dados.delete(chave); },
  };
}

test('salva e lê manifesto ativo normalizado em namespace separado', () => {
  const backend = criarBackend();
  backend.setItem('vanguard:trilha', JSON.stringify({ pontos: ['preservar'] }));
  const storage = criarStorageDataset(backend);

  const salvo = storage.salvarAtivo(MANIFESTO);
  assert.equal(salvo.ok, true);
  const lido = storage.lerAtivo();
  assert.equal(lido.ok, true);
  assert.equal(lido.valor.checksum, CHECKSUM);
  assert.equal(lido.valor.regions[0].checksum, CHECKSUM);
  assert.equal(backend.getItem('vanguard:trilha'), JSON.stringify({ pontos: ['preservar'] }));
  assert.equal(backend.dados.has(CHAVES_STORAGE_DATASET.ATIVO), true);
});

test('rejeita manifesto ativo inválido sem escrever', () => {
  const backend = criarBackend();
  const storage = criarStorageDataset(backend);
  const resultado = storage.salvarAtivo({ ...MANIFESTO, checksum: 'invalido' });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'MANIFESTO_INVALIDO');
  assert.equal(backend.dados.has(CHAVES_STORAGE_DATASET.ATIVO), false);
});

test('detecta envelope ativo corrompido e não retorna dados silenciosamente', () => {
  const backend = criarBackend();
  backend.setItem(CHAVES_STORAGE_DATASET.ATIVO, JSON.stringify({ schema: 'outro', version: 1, type: 'active', value: MANIFESTO }));
  const storage = criarStorageDataset(backend);
  const resultado = storage.lerAtivo();
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'STORAGE_CORRUPTED');
});

test('salva, valida, lê e limpa transação sem apagar o dataset ativo', () => {
  const backend = criarBackend();
  const storage = criarStorageDataset(backend);
  const transacao = { id: 'world-overview:2026.08.3', datasetId: 'world-overview', estado: 'STAGING' };

  assert.equal(storage.salvarAtivo(MANIFESTO).ok, true);
  assert.equal(storage.salvarTransacao(transacao).ok, true);
  assert.deepEqual(storage.lerTransacao().valor, transacao);
  assert.equal(storage.limparTransacao().ok, true);
  assert.equal(storage.lerTransacao().valor, null);
  assert.equal(storage.lerAtivo().ok, true);
  assert.equal(backend.dados.has(CHAVES_STORAGE_DATASET.ATIVO), true);
});

test('rejeita transação com estado inválido e envelope de transação inválido', () => {
  const backend = criarBackend();
  const storage = criarStorageDataset(backend);
  const resultado = storage.salvarTransacao({ datasetId: 'world-overview', estado: 'UNKNOWN_STATE' });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'ESTADO_INVALIDO');

  backend.setItem(CHAVES_STORAGE_DATASET.TRANSACAO, JSON.stringify({
    schema: ESQUEMA_STORAGE_DATASET,
    version: VERSAO_STORAGE_DATASET,
    type: 'transaction',
    value: { datasetId: 'world-overview', estado: 'UNKNOWN_STATE' },
  }));
  const lido = storage.lerTransacao();
  assert.equal(lido.ok, false);
  assert.equal(lido.codigo, 'TRANSACAO_INVALIDA');
});

test('expõe diagnóstico e falha de forma explícita quando localStorage não existe', () => {
  const storage = criarStorageDataset(null);
  assert.deepEqual(storage.diagnostico(), {
    schema: ESQUEMA_STORAGE_DATASET,
    version: VERSAO_STORAGE_DATASET,
    disponivel: false,
    chaves: { ...CHAVES_STORAGE_DATASET },
  });
  assert.equal(storage.lerAtivo().codigo, 'STORAGE_UNAVAILABLE');
  assert.equal(storage.salvarTransacao({}).codigo, 'STORAGE_UNAVAILABLE');
});

test('não esconde falha de escrita do backend', () => {
  const backend = criarBackend();
  backend.setItem = () => { throw new Error('quota'); };
  const storage = criarStorageDataset(backend);
  const resultado = storage.salvarAtivo(MANIFESTO);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'STORAGE_WRITE_FAILED');
});
