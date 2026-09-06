import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  ESTADOS_REGISTRO_DATASET,
  MOTIVOS_REGISTRO_DATASET,
  criarRegistroDatasets,
  inspecionarDatasetInstalado,
} from '../src/core/dataset-registry.js';
import { criarStorageDataset } from '../src/core/dataset-storage.js';
import { PACKAGE_STATES } from '../src/core/dataset-package-storage.js';

const BYTES = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

async function sha256(bytes) {
  const digest = await webcrypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (valor) => valor.toString(16).padStart(2, '0')).join('');
}

async function manifestoValido(extra = {}) {
  const checksum = await sha256(BYTES);
  return {
    schema: 'vanguard-dataset-manifest',
    manifestVersion: 1,
    datasetId: 'rio-serra',
    version: '1.0.0',
    formatVersion: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    source: 'fonte-de-teste',
    license: 'REVIEW_REQUIRED',
    checksum,
    minimumAppVersion: '1.0.0',
    regions: [{ id: 'serra', version: '1.0.0', sizeBytes: BYTES.byteLength, checksum }],
    ...extra,
  };
}

function storageFake(manifesto, { erro = null } = {}) {
  return { lerAtivo: () => (erro ? { ok: false, ...erro } : { ok: true, valor: manifesto }) };
}

function pacoteFake(pacote, { erro = null } = {}) {
  return { lerPacote: async () => (erro ? { ok: false, ...erro } : { ok: true, pacote }) };
}

function pacoteAtivo(bytes = BYTES) {
  return { datasetId: 'rio-serra', bytes, sizeBytes: bytes.byteLength, state: PACKAGE_STATES.ACTIVE };
}

function etapa(relatorio, nome) {
  return relatorio.etapas.find((item) => item.etapa === nome) ?? null;
}

test('sem manifesto o registro reporta ausência, não corrupção', async () => {
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(null),
    packageStorage: pacoteFake(null),
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.AUSENTE);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.SEM_DATASET);
  assert.equal(relatorio.valido, false);
  assert.equal(relatorio.datasetId, null);
  assert.equal(etapa(relatorio, 'PACKAGE_READ'), null);
});

test('manifesto ilegível é inválido e preserva o motivo do storage', async () => {
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(null, { erro: { codigo: 'STORAGE_CORRUPTED', motivo: 'envelope inválido' } }),
    packageStorage: pacoteFake(null),
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.INVALIDO);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.MANIFESTO_ILEGIVEL);
  assert.equal(relatorio.mensagem, 'envelope inválido');
  assert.equal(etapa(relatorio, 'MANIFEST_READ').detalhe, 'STORAGE_CORRUPTED');
});

test('manifesto ativo sem pacote físico é corrupção, não ausência', async () => {
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(await manifestoValido()),
    packageStorage: pacoteFake(null),
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.INVALIDO);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.PACOTE_AUSENTE);
  assert.equal(relatorio.datasetId, 'rio-serra');
});

test('pacote ilegível é inválido e não vira dataset ausente', async () => {
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(await manifestoValido()),
    packageStorage: pacoteFake(null, { erro: { codigo: 'PACKAGE_STORAGE_FAILED', motivo: 'IndexedDB falhou' } }),
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.INVALIDO);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.PACOTE_ILEGIVEL);
  assert.equal(relatorio.mensagem, 'IndexedDB falhou');
});

test('pacote ainda em staging não pode ser servido', async () => {
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(await manifestoValido()),
    packageStorage: pacoteFake({ ...pacoteAtivo(), state: PACKAGE_STATES.STAGING }),
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.INVALIDO);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.PACOTE_NAO_ATIVO);
  assert.equal(etapa(relatorio, 'PACKAGE_ACTIVE').detalhe, PACKAGE_STATES.STAGING);
});

test('tamanho divergente interrompe a escada antes do checksum', async () => {
  const curto = BYTES.slice(0, 4);
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(await manifestoValido()),
    packageStorage: pacoteFake(pacoteAtivo(curto)),
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.INVALIDO);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.TAMANHO_DIVERGENTE);
  assert.equal(relatorio.tamanhoReal, 4);
  assert.equal(relatorio.tamanhoEsperado, 8);
  assert.equal(etapa(relatorio, 'CHECKSUM'), null);
});

test('bytes trocados com o mesmo tamanho são reprovados pelo checksum', async () => {
  const adulterado = new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9]);
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(await manifestoValido()),
    packageStorage: pacoteFake(pacoteAtivo(adulterado)),
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.INVALIDO);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.CHECKSUM_INVALIDO);
  assert.equal(relatorio.checksumCalculado, await sha256(adulterado));
  assert.notEqual(relatorio.checksumCalculado, relatorio.checksumEsperado);
});

test('dataset íntegro percorre a escada inteira e fica válido', async () => {
  const manifesto = await manifestoValido();
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(manifesto),
    packageStorage: pacoteFake(pacoteAtivo()),
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.VALIDO);
  assert.equal(relatorio.valido, true);
  assert.equal(relatorio.motivo, null);
  assert.equal(relatorio.checksumCalculado, manifesto.checksum);
  assert.equal(relatorio.version, '1.0.0');
  assert.ok(relatorio.etapas.every((item) => item.ok));
  assert.deepEqual(
    relatorio.etapas.map((item) => item.etapa),
    ['MANIFEST_READ', 'MANIFEST_PRESENT', 'PACKAGE_READ', 'PACKAGE_PRESENT', 'PACKAGE_ACTIVE', 'SIZE', 'CHECKSUM'],
  );
});

test('inspeção sem checksum nunca declara o dataset válido', async () => {
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(await manifestoValido()),
    packageStorage: pacoteFake(pacoteAtivo()),
    verificarChecksum: false,
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.NAO_VERIFICADO);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.CHECKSUM_NAO_VERIFICADO);
  assert.equal(relatorio.valido, false);
  assert.equal(etapa(relatorio, 'CHECKSUM').detalhe, 'SKIPPED');
});

test('ambiente sem SHA-256 fica não verificado, não válido nem corrompido', async () => {
  const relatorio = await inspecionarDatasetInstalado({
    datasetStorage: storageFake(await manifestoValido()),
    packageStorage: pacoteFake(pacoteAtivo()),
    cryptoImpl: {},
  });
  assert.equal(relatorio.estado, ESTADOS_REGISTRO_DATASET.NAO_VERIFICADO);
  assert.equal(relatorio.motivo, MOTIVOS_REGISTRO_DATASET.CHECKSUM_INDISPONIVEL);
  assert.equal(relatorio.valido, false);
});

test('o registro compõe com o storage real e o manifesto persistido', async () => {
  const memoria = new Map();
  const backend = {
    getItem: (chave) => (memoria.has(chave) ? memoria.get(chave) : null),
    setItem: (chave, valor) => memoria.set(chave, String(valor)),
    removeItem: (chave) => memoria.delete(chave),
  };
  const datasetStorage = criarStorageDataset(backend);
  const manifesto = await manifestoValido();
  assert.equal(datasetStorage.salvarAtivo(manifesto).ok, true);

  const registro = criarRegistroDatasets({ datasetStorage, packageStorage: pacoteFake(pacoteAtivo()) });
  assert.equal(await registro.existeDatasetUsavel(), true);
  const valido = await registro.obterValido();
  assert.equal(valido.datasetId, 'rio-serra');
  assert.equal((await registro.listar()).length, 1);
});

test('sem dataset instalado o registro lista vazio e não entrega dataset válido', async () => {
  const registro = criarRegistroDatasets({
    datasetStorage: storageFake(null),
    packageStorage: pacoteFake(null),
  });
  assert.deepEqual(await registro.listar(), []);
  assert.equal(await registro.obterValido(), null);
  assert.equal(await registro.existeDatasetUsavel(), false);
});

test('um dataset corrompido continua listado para que a falha apareça', async () => {
  const registro = criarRegistroDatasets({
    datasetStorage: storageFake(await manifestoValido()),
    packageStorage: pacoteFake(null),
  });
  const lista = await registro.listar();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].motivo, MOTIVOS_REGISTRO_DATASET.PACOTE_AUSENTE);
  assert.equal(await registro.obterValido(), null);
});
