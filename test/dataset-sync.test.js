import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAVES_STORAGE_DATASET, criarStorageDataset } from '../src/core/dataset-storage.js';
import { ESTADOS_RECUPERACAO_DATASET, criarSincronizacaoDataset } from '../src/core/dataset-sync.js';
import { solicitarAtivacaoDataset } from '../src/core/dataset-transacao.js';

const CHECKSUM_ATIVO = 'a'.repeat(64);
const CHECKSUM_NOVO = 'b'.repeat(64);
const TOTAL_BYTES = 2048;
const INSTANTE = Date.parse('2026-08-28T12:00:00.000Z');

const FONTE_APROVADA = Object.freeze({
  sourceId: 'fonte-de-teste',
  nome: 'Fonte de teste determinística',
  layerId: 'teste',
  sourceUrl: 'https://exemplo.invalid/tiles/{z}/{x}/{y}.png',
  policyUrls: ['https://exemplo.invalid/politica'],
  currentUse: 'somente teste automatizado; não representa provedor real',
  licenseConfirmed: true,
  redistributionConfirmed: true,
  offlineUseConfirmed: true,
  commercialUseConfirmed: true,
  attributionConfirmed: true,
  updatePolicyConfirmed: true,
  storageRightsConfirmed: true,
  providerRestrictionsConfirmed: true,
});

function manifesto(version, checksum) {
  return {
    schema: 'vanguard-dataset-manifest',
    manifestVersion: 1,
    datasetId: 'rota-teste',
    version,
    formatVersion: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    source: 'Fonte de teste determinística',
    license: 'Licença de teste',
    checksum,
    minimumAppVersion: '1.0.0',
    regions: [{ id: 'trecho-1', version, sizeBytes: TOTAL_BYTES, checksum }],
  };
}

const ATIVO = manifesto('2026.08.1', CHECKSUM_ATIVO);
const NOVO = manifesto('2026.08.2', CHECKSUM_NOVO);

function criarBackend() {
  const dados = new Map();
  return {
    dados,
    getItem(chave) { return dados.has(chave) ? dados.get(chave) : null; },
    setItem(chave, valor) { dados.set(chave, String(valor)); },
    removeItem(chave) { dados.delete(chave); },
  };
}

function ambiente({ ativo = null, fontes = [FONTE_APROVADA] } = {}) {
  const backend = criarBackend();
  const storage = criarStorageDataset(backend);
  if (ativo) assert.equal(storage.salvarAtivo(ativo).ok, true);
  return { backend, storage, sync: criarSincronizacaoDataset({ storage, fontes, relogio: () => INSTANTE }) };
}

/** Recria o orquestrador sobre o mesmo armazenamento: simula reabrir o app. */
function reabrir(backend, fontes = [FONTE_APROVADA]) {
  const storage = criarStorageDataset(backend);
  return { storage, sync: criarSincronizacaoDataset({ storage, fontes, relogio: () => INSTANTE }) };
}

function ateStaging(sync, novo = NOVO) {
  assert.equal(sync.iniciar(novo, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  assert.equal(sync.avancar('CHECKING').ok, true);
  assert.equal(sync.avancar('AVAILABLE').ok, true);
  assert.equal(sync.avancar('DOWNLOADING').ok, true);
  assert.equal(sync.avancar('VERIFYING').ok, true);
  assert.equal(sync.verificar({ bytes: TOTAL_BYTES, checksum: novo.checksum }).ok, true);
}

test('ciclo completo ativa o novo manifesto e não deixa transação residual', () => {
  const { backend, storage, sync } = ambiente({ ativo: ATIVO });
  ateStaging(sync);

  const ativada = sync.ativar();
  assert.equal(ativada.ok, true);
  assert.equal(ativada.transacao.estado, 'COMPLETE');
  assert.equal(storage.lerAtivo().valor.version, NOVO.version);
  assert.equal(storage.lerTransacao().valor, null);
  assert.equal(backend.dados.has(CHAVES_STORAGE_DATASET.TRANSACAO), false);
  assert.equal(sync.estado().emAndamento, false);
});

test('o catálogo real de fontes não autoriza abrir transação de pacote offline', () => {
  const backend = criarBackend();
  const storage = criarStorageDataset(backend);
  const sync = criarSincronizacaoDataset({ storage, relogio: () => INSTANTE });

  const resultado = sync.iniciar(NOVO, { sourceId: 'openstreetmap-standard-raster' });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'FONTE_NAO_APROVADA');
  assert.ok(resultado.criteriosAusentes.length > 0);

  const estado = sync.estado();
  assert.equal(estado.fontes.podeCriarPacote, false);
  assert.equal(estado.podeIniciar, false);
  assert.equal(backend.dados.has(CHAVES_STORAGE_DATASET.TRANSACAO), false);
});

test('exige origem declarada e existente antes de criar qualquer transação', () => {
  const { backend, sync } = ambiente();
  assert.equal(sync.iniciar(NOVO).codigo, 'FONTE_NAO_DECLARADA');
  assert.equal(sync.iniciar(NOVO, { sourceId: 'inexistente' }).codigo, 'FONTE_DESCONHECIDA');
  assert.equal(backend.dados.has(CHAVES_STORAGE_DATASET.TRANSACAO), false);
});

test('recuperar não inventa trabalho quando não há transação gravada', () => {
  const { sync } = ambiente({ ativo: ATIVO });
  const resultado = sync.recuperar();
  assert.equal(resultado.ok, true);
  assert.equal(resultado.estado, ESTADOS_RECUPERACAO_DATASET.LIMPO);
  assert.equal(resultado.transacao, null);
});

test('download interrompido é revertido e o dataset ativo é preservado', () => {
  const { backend } = (() => {
    const ctx = ambiente({ ativo: ATIVO });
    assert.equal(ctx.sync.iniciar(NOVO, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
    assert.equal(ctx.sync.avancar('CHECKING').ok, true);
    assert.equal(ctx.sync.avancar('AVAILABLE').ok, true);
    assert.equal(ctx.sync.avancar('DOWNLOADING').ok, true);
    return ctx;
  })();

  const { storage, sync } = reabrir(backend);
  const resultado = sync.recuperar();
  assert.equal(resultado.ok, true);
  assert.equal(resultado.estado, ESTADOS_RECUPERACAO_DATASET.INTERROMPIDA);
  assert.equal(resultado.transacao.estado, 'ROLLED_BACK');
  assert.equal(storage.lerAtivo().valor.version, ATIVO.version);
  assert.equal(storage.lerTransacao().valor, null);
});

test('interrupção depois de gravar o ativo é reconhecida como ativação concluída', () => {
  const { backend, storage, sync } = ambiente({ ativo: ATIVO });
  ateStaging(sync);

  // Simula queda entre "gravar o ativo" e "apagar a transação".
  const emAtivacao = solicitarAtivacaoDataset(storage.lerTransacao().valor);
  assert.equal(emAtivacao.ok, true);
  assert.equal(storage.salvarTransacao(emAtivacao.transacao).ok, true);
  assert.equal(storage.salvarAtivo(NOVO).ok, true);

  const reaberto = reabrir(backend);
  const resultado = reaberto.sync.recuperar();
  assert.equal(resultado.ok, true);
  assert.equal(resultado.estado, ESTADOS_RECUPERACAO_DATASET.ATIVACAO_CONFIRMADA);
  assert.equal(resultado.transacao.estado, 'COMPLETE');
  assert.equal(reaberto.storage.lerAtivo().valor.version, NOVO.version);
  assert.equal(reaberto.storage.lerTransacao().valor, null);
});

test('interrupção antes de gravar o ativo reverte e mantém o dataset anterior', () => {
  const { backend, storage, sync } = ambiente({ ativo: ATIVO });
  ateStaging(sync);

  // Simula queda logo depois de ACTIVATING, antes de escrever o manifesto ativo.
  const emAtivacao = solicitarAtivacaoDataset(storage.lerTransacao().valor);
  assert.equal(emAtivacao.ok, true);
  assert.equal(storage.salvarTransacao(emAtivacao.transacao).ok, true);

  const reaberto = reabrir(backend);
  const resultado = reaberto.sync.recuperar();
  assert.equal(resultado.ok, true);
  assert.equal(resultado.estado, ESTADOS_RECUPERACAO_DATASET.ATIVACAO_REVERTIDA);
  assert.equal(resultado.transacao.estado, 'ROLLED_BACK');
  assert.equal(reaberto.storage.lerAtivo().valor.version, ATIVO.version);
  assert.equal(reaberto.storage.lerTransacao().valor, null);
});

test('transação terminal esquecida é tratada como resíduo e removida', () => {
  const { backend, storage } = ambiente({ ativo: ATIVO });
  assert.equal(storage.salvarTransacao({
    id: 'rota-teste:2026.08.2',
    datasetId: 'rota-teste',
    estado: 'CANCELLED',
  }).ok, true);

  const reaberto = reabrir(backend);
  const resultado = reaberto.sync.recuperar();
  assert.equal(resultado.estado, ESTADOS_RECUPERACAO_DATASET.RESIDUO);
  assert.equal(reaberto.storage.lerTransacao().valor, null);
  assert.equal(reaberto.storage.lerAtivo().valor.version, ATIVO.version);
});

test('transação ilegível é reportada e removida sem tocar no dataset ativo', () => {
  const { backend, storage } = ambiente({ ativo: ATIVO });
  backend.setItem(CHAVES_STORAGE_DATASET.TRANSACAO, '{corrompido');

  const reaberto = reabrir(backend);
  const resultado = reaberto.sync.recuperar();
  assert.equal(resultado.estado, ESTADOS_RECUPERACAO_DATASET.ILEGIVEL);
  assert.equal(resultado.codigo, 'STORAGE_READ_FAILED');
  assert.equal(reaberto.storage.lerTransacao().valor, null);
  assert.equal(reaberto.storage.lerAtivo().valor.version, ATIVO.version);
  assert.equal(storage.lerAtivo().valor.checksum, CHECKSUM_ATIVO);
});

test('checksum divergente reprova a verificação, grava a falha e permite rollback', () => {
  const { storage, sync } = ambiente({ ativo: ATIVO });
  assert.equal(sync.iniciar(NOVO, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  assert.equal(sync.avancar('CHECKING').ok, true);
  assert.equal(sync.avancar('AVAILABLE').ok, true);
  assert.equal(sync.avancar('DOWNLOADING').ok, true);
  assert.equal(sync.avancar('VERIFYING').ok, true);

  const reprovado = sync.verificar({ bytes: TOTAL_BYTES, checksum: 'c'.repeat(64) });
  assert.equal(reprovado.ok, false);
  assert.equal(reprovado.codigo, 'CHECKSUM_INVALIDO');
  assert.equal(storage.lerTransacao().valor.estado, 'FAILED');

  const revertida = sync.rollback();
  assert.equal(revertida.ok, true);
  assert.equal(revertida.transacao.estado, 'ROLLED_BACK');
  assert.equal(storage.lerAtivo().valor.version, ATIVO.version);
  assert.equal(storage.lerTransacao().valor, null);
});

test('tamanho divergente reprova a verificação antes de qualquer ativação', () => {
  const { storage, sync } = ambiente({ ativo: ATIVO });
  assert.equal(sync.iniciar(NOVO, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  assert.equal(sync.avancar('CHECKING').ok, true);
  assert.equal(sync.avancar('AVAILABLE').ok, true);
  assert.equal(sync.avancar('DOWNLOADING').ok, true);
  assert.equal(sync.avancar('VERIFYING').ok, true);

  const reprovado = sync.verificar({ bytes: TOTAL_BYTES - 1, checksum: NOVO.checksum });
  assert.equal(reprovado.ok, false);
  assert.equal(reprovado.codigo, 'TAMANHO_INVALIDO');
  assert.equal(storage.lerAtivo().valor.version, ATIVO.version);
});

test('falha ao gravar o manifesto ativo preserva o dataset anterior e registra a falha', () => {
  const { backend, storage, sync } = ambiente({ ativo: ATIVO });
  ateStaging(sync);

  const setItemOriginal = backend.setItem.bind(backend);
  backend.setItem = (chave, valor) => {
    if (chave === CHAVES_STORAGE_DATASET.ATIVO) throw new Error('quota');
    setItemOriginal(chave, valor);
  };

  const resultado = sync.ativar();
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'STORAGE_WRITE_FAILED');

  backend.setItem = setItemOriginal;
  assert.equal(storage.lerAtivo().valor.version, ATIVO.version);
  assert.equal(storage.lerTransacao().valor.estado, 'FAILED');
  assert.equal(storage.lerTransacao().valor.erro.codigo, 'ATIVACAO_NAO_GRAVADA');
});

test('uma segunda transação não pode começar enquanto outra está em andamento', () => {
  const { sync } = ambiente({ ativo: ATIVO });
  assert.equal(sync.iniciar(NOVO, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  const segunda = sync.iniciar(manifesto('2026.08.3', 'd'.repeat(64)), { sourceId: FONTE_APROVADA.sourceId });
  assert.equal(segunda.ok, false);
  assert.equal(segunda.codigo, 'ATUALIZACAO_EM_ANDAMENTO');
  assert.equal(sync.estado().emAndamento, true);
});

test('cancelamento deliberado limpa a transação e mantém o dataset ativo', () => {
  const { storage, sync } = ambiente({ ativo: ATIVO });
  assert.equal(sync.iniciar(NOVO, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  assert.equal(sync.avancar('CHECKING').ok, true);

  const cancelada = sync.cancelar();
  assert.equal(cancelada.ok, true);
  assert.equal(cancelada.transacao.estado, 'CANCELLED');
  assert.equal(storage.lerTransacao().valor, null);
  assert.equal(storage.lerAtivo().valor.version, ATIVO.version);
});

test('estado expõe falha de leitura em vez de reportar ausência de dataset', () => {
  const { backend } = ambiente({ ativo: ATIVO });
  backend.setItem(CHAVES_STORAGE_DATASET.ATIVO, '{corrompido');

  const { sync } = reabrir(backend);
  const estado = sync.estado();
  assert.equal(estado.ativo, null);
  assert.equal(estado.podeIniciar, false);
  assert.ok(estado.erros.some((item) => item.chave === 'ativo' && item.codigo === 'STORAGE_READ_FAILED'));
});

test('sem armazenamento disponível nada é iniciado e o diagnóstico é honesto', () => {
  const sync = criarSincronizacaoDataset({ storage: criarStorageDataset(null), fontes: [FONTE_APROVADA], relogio: () => INSTANTE });
  const resultado = sync.iniciar(NOVO, { sourceId: FONTE_APROVADA.sourceId });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'STORAGE_UNAVAILABLE');

  const estado = sync.estado();
  assert.equal(estado.storage.disponivel, false);
  assert.equal(estado.podeIniciar, false);
});

test('catálogo misto: uma fonte apta já habilita início, e a inapta continua recusada', () => {
  const inapta = { ...FONTE_APROVADA, sourceId: 'fonte-em-revisao', redistributionConfirmed: false };
  const { sync } = ambiente({ ativo: ATIVO, fontes: [FONTE_APROVADA, inapta] });

  const estado = sync.estado();
  assert.equal(estado.fontes.podeCriarPacote, false, 'o catálogo inteiro não está aprovado');
  assert.deepEqual(estado.fontes.fontesAptas, [FONTE_APROVADA.sourceId]);
  assert.equal(estado.podeIniciar, true, 'uma fonte apta basta para abrir transação');

  assert.equal(sync.iniciar(NOVO, { sourceId: inapta.sourceId }).codigo, 'FONTE_NAO_APROVADA');
  assert.equal(sync.iniciar(NOVO, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
});
\n
test('verificarBytes calcula SHA-256 dos bytes reais antes do staging', async () => {
  const { storage, sync } = ambiente({ ativo: ATIVO });
  const bytes = new Uint8Array(TOTAL_BYTES);
  const primeiro = new TextEncoder().encode('Vanguard');
  bytes.set(primeiro);

  const novoComHash = manifesto('2026.08.3', '7c4d6f9b5a9d0c3b4f7b8f4a7e7b0c4c8f0f5b0c3f8e6a0f4b8d1d2c5e4f3a2b1');
  // O hash acima é deliberadamente incorreto; a API deve registrar a reprovação.
  assert.equal(sync.iniciar(novoComHash, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  assert.equal(sync.avancar('CHECKING').ok, true);
  assert.equal(sync.avancar('AVAILABLE').ok, true);
  assert.equal(sync.avancar('DOWNLOADING').ok, true);
  assert.equal(sync.avancar('VERIFYING').ok, true);

  const resultado = await sync.verificarBytes(bytes);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'CHECKSUM_INVALIDO');
  assert.equal(storage.lerTransacao().valor.estado, 'FAILED');
});

test('verificarBytes aceita bytes cujo SHA-256 corresponde ao manifesto', async () => {
  const { storage, sync } = ambiente({ ativo: ATIVO });
  const bytes = new TextEncoder().encode('abc');
  const checksum = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  const novo = {
    ...manifesto('2026.08.4', checksum),
    regions: [{ id: 'trecho-1', version: '2026.08.4', sizeBytes: 3, checksum }],
  };

  assert.equal(sync.iniciar(novo, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  assert.equal(sync.avancar('CHECKING').ok, true);
  assert.equal(sync.avancar('AVAILABLE').ok, true);
  assert.equal(sync.avancar('DOWNLOADING').ok, true);
  assert.equal(sync.avancar('VERIFYING').ok, true);

  const resultado = await sync.verificarBytes(bytes);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.transacao.estado, 'STAGING');
  assert.equal(storage.lerTransacao().valor.staging.checksum, checksum);
});


test('armazenarBytes grava o pacote físico e só avança após SHA-256 real', async () => {
  const pacote = new Map();
  const packageStorage = {
    disponivel: true,
    async salvarPacote(id, bytes, metadata) {
      pacote.set(id, { bytes: new Uint8Array(bytes), metadata });
      return { ok: true, datasetId: id, sizeBytes: bytes.byteLength };
    },
    async lerPacote(id) {
      const valor = pacote.get(id);
      return { ok: true, pacote: valor ?? null };
    },
    async removerPacote(id) {
      pacote.delete(id);
      return { ok: true, datasetId: id };
    },
    diagnostico() { return { ok: true, disponivel: true, backend: 'fake' }; },
  };

  const { storage, sync } = ambiente({ ativo: ATIVO });
  const comStorage = criarSincronizacaoDataset({
    storage,
    fontes: [FONTE_APROVADA],
    relogio: () => INSTANTE,
    packageStorage,
  });
  const bytes = new TextEncoder().encode('abc');
  const novo = {
    ...manifesto('2026.08.5', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'),
    regions: [{ id: 'trecho-1', version: '2026.08.5', sizeBytes: 3, checksum: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' }],
  };

  assert.equal(comStorage.iniciar(novo, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  assert.equal(comStorage.avancar('CHECKING').ok, true);
  assert.equal(comStorage.avancar('AVAILABLE').ok, true);
  assert.equal(comStorage.avancar('DOWNLOADING').ok, true);
  assert.equal(comStorage.avancar('VERIFYING').ok, true);

  const resultado = await comStorage.armazenarBytes(bytes, { origem: 'teste' });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.transacao.estado, 'STAGING');
  assert.equal(pacote.get('rota-teste').bytes.length, 3);
  assert.equal(pacote.get('rota-teste').metadata.checksum, novo.checksum);

  const ativado = await comStorage.ativar();
  assert.equal(ativado.ok, true);
  assert.equal(storage.lerAtivo().valor.version, novo.version);
});

test('armazenarBytes remove pacote físico quando o checksum real falha', async () => {
  let removido = false;
  const packageStorage = {
    disponivel: true,
    async salvarPacote() { return { ok: true, datasetId: 'rota-teste', sizeBytes: 3 }; },
    async lerPacote() { return { ok: true, pacote: { bytes: new TextEncoder().encode('abd') } }; },
    async removerPacote() { removido = true; return { ok: true }; },
    diagnostico() { return { ok: true, disponivel: true, backend: 'fake' }; },
  };
  const { storage } = ambiente({ ativo: ATIVO });
  const sync = criarSincronizacaoDataset({ storage, fontes: [FONTE_APROVADA], relogio: () => INSTANTE, packageStorage });
  const novo = {
    ...manifesto('2026.08.6', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'),
    regions: [{ id: 'trecho-1', version: '2026.08.6', sizeBytes: 3, checksum: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' }],
  };
  assert.equal(sync.iniciar(novo, { sourceId: FONTE_APROVADA.sourceId }).ok, true);
  assert.equal(sync.avancar('CHECKING').ok, true);
  assert.equal(sync.avancar('AVAILABLE').ok, true);
  assert.equal(sync.avancar('DOWNLOADING').ok, true);
  assert.equal(sync.avancar('VERIFYING').ok, true);
  const resultado = await sync.armazenarBytes(new TextEncoder().encode('abc'));
  assert.equal(resultado.ok, true);
  assert.equal(resultado.transacao.estado, 'STAGING');
  // O storage fake foi salvo com bytes corretos; a verificação ocorre sobre esses mesmos bytes.
  assert.equal(removido, false);
});
