import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ESQUEMA_DATASET,
  ESTADOS_DATASET,
  VERSAO_MANIFESTO_DATASET,
  estadoFrescorDataset,
  normalizarManifestoDataset,
  validarManifestoDataset,
} from '../src/core/dataset-manifest.js';

const CHECKSUM = 'A'.repeat(64);

function manifesto(overrides = {}) {
  return {
    schema: ESQUEMA_DATASET,
    manifestVersion: VERSAO_MANIFESTO_DATASET,
    datasetId: 'world-overview',
    version: '2026.08.1',
    formatVersion: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    source: 'Fonte licenciada pendente de cadastro',
    license: 'Revisão de redistribuição pendente',
    checksum: CHECKSUM,
    minimumAppVersion: '1.0.0',
    regions: [
      { id: 'south-america', version: '2026.08.1', sizeBytes: 1024, checksum: CHECKSUM },
    ],
    ...overrides,
  };
}

test('valida manifesto versionado com metadados e região', () => {
  const resultado = validarManifestoDataset(manifesto());
  assert.equal(resultado.valido, true);
  assert.deepEqual(resultado.erros, []);
});

test('rejeita schema, checksum e campos obrigatórios inválidos', () => {
  const resultado = validarManifestoDataset(manifesto({
    schema: 'outro-schema',
    source: '',
    checksum: 'não-é-sha256',
    minimumAppVersion: 'v1',
    regions: null,
  }));
  assert.equal(resultado.valido, false);
  assert.deepEqual(
    resultado.erros.map(({ campo }) => campo),
    ['schema', 'source', 'checksum', 'minimumAppVersion', 'regions'],
  );
});

test('rejeita região duplicada, tamanho negativo e data invertida', () => {
  const resultado = validarManifestoDataset(manifesto({
    createdAt: '2026-08-21T00:00:00.000Z',
    regions: [
      { id: 'south-america', version: '2026.08.1', sizeBytes: -1, checksum: CHECKSUM },
      { id: 'south-america', version: '2026.08.1', sizeBytes: 10, checksum: CHECKSUM },
    ],
  }));
  assert.equal(resultado.valido, false);
  assert.ok(resultado.erros.some(({ campo }) => campo === 'updatedAt'));
  assert.ok(resultado.erros.some(({ campo, motivo }) => campo === 'regions[0].sizeBytes' && motivo.includes('não negativo')));
  assert.ok(resultado.erros.some(({ campo, motivo }) => campo === 'regions[1].id' && motivo.includes('repetir')));
});

test('normaliza checksum sem mutar o manifesto de entrada', () => {
  const entrada = manifesto();
  const resultado = normalizarManifestoDataset(entrada);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.manifesto.checksum, CHECKSUM.toLowerCase());
  assert.equal(resultado.manifesto.regions[0].checksum, CHECKSUM.toLowerCase());
  assert.equal(entrada.checksum, CHECKSUM);
  assert.notEqual(resultado.manifesto, entrada);
});

test('classifica frescor por versão, idade e data futura', () => {
  const atual = manifesto();
  const agora = Date.parse('2026-08-28T00:00:00.000Z');
  assert.equal(estadoFrescorDataset(atual, { versaoAtual: '2026.08.1' }), ESTADOS_DATASET.ATUAL);
  assert.equal(estadoFrescorDataset(atual, { versaoAtual: '2026.09.1' }), ESTADOS_DATASET.DESATUALIZADO);
  assert.equal(estadoFrescorDataset(atual, { agora, maxAgeMs: 7 * 24 * 60 * 60 * 1000 }), ESTADOS_DATASET.DESATUALIZADO);
  assert.equal(estadoFrescorDataset(atual, { agora, maxAgeMs: 10 * 24 * 60 * 60 * 1000 }), ESTADOS_DATASET.ATUAL);
  assert.equal(estadoFrescorDataset({ ...atual, updatedAt: '2026-09-01T00:00:00.000Z' }, { agora, maxAgeMs: 1 }), ESTADOS_DATASET.DESCONHECIDO);
  assert.equal(estadoFrescorDataset({ ...atual, checksum: 'x' }), ESTADOS_DATASET.DESCONHECIDO);
});
