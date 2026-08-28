/**
 * Storage físico assíncrono para bytes de pacotes de dataset.
 *
 * IndexedDB é usado apenas para o artefato do dataset. Manifesto/transação
 * continuam no adapter legado e dados do usuário permanecem fora deste store.
 *
 * A API não promete atomicidade de disco nem resistência a power loss: isso
 * precisa ser validado no aparelho.
 */

export const DB_DATASET_PACKAGE = 'vanguard-dataset-package';
export const VERSION_DATASET_PACKAGE = 1;
export const STORE_DATASET_PACKAGE = 'packages';
export const PACKAGE_STATES = Object.freeze({ STAGING: 'STAGING', ACTIVE: 'ACTIVE' });

function indisponivel() {
  return { ok: false, codigo: 'PACKAGE_STORAGE_UNAVAILABLE', motivo: 'IndexedDB não está disponível neste ambiente.' };
}
function idValido(datasetId) { return typeof datasetId === 'string' && datasetId.trim().length > 0; }
function normalizarBytes(bytes) {
  if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes) && !(bytes instanceof Uint8Array)) return null;
  return bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
function abrirIndexedDB(indexedDBImpl) {
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(DB_DATASET_PACKAGE, VERSION_DATASET_PACKAGE);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DATASET_PACKAGE)) db.createObjectStore(STORE_DATASET_PACKAGE, { keyPath: 'datasetId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir IndexedDB.'));
    request.onblocked = () => reject(new Error('A abertura do banco IndexedDB foi bloqueada.'));
  });
}
function transacao(db, modo, operacao) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATASET_PACKAGE, modo);
    const store = tx.objectStore(STORE_DATASET_PACKAGE);
    let resultado;
    try { resultado = operacao(store); } catch (erro) { reject(erro); return; }
    resultado.onsuccess = () => resolve(resultado.result);
    resultado.onerror = () => reject(resultado.error ?? new Error('Operação IndexedDB falhou.'));
  });
}

export function criarPackageStorage({ indexedDBImpl = globalThis.indexedDB } = {}) {
  if (!indexedDBImpl) return {
    disponivel: false, diagnostico: () => indisponivel(), salvarPacote: async () => indisponivel(),
    lerPacote: async () => indisponivel(), anexarPacoteStaging: async () => indisponivel(),
    promoverPacote: async () => indisponivel(), removerPacote: async () => indisponivel(), limparTudo: async () => indisponivel(),
  };

  async function executar(fn) {
    let db;
    try { db = await abrirIndexedDB(indexedDBImpl); return await fn(db); }
    catch (erro) { return { ok: false, codigo: erro?.name === 'QuotaExceededError' ? 'PACKAGE_STORAGE_QUOTA' : 'PACKAGE_STORAGE_FAILED', motivo: erro?.message ?? 'Falha no storage físico do pacote.' }; }
    finally { db?.close(); }
  }

  const api = {
    disponivel: true,
    diagnostico: () => ({ ok: true, disponivel: true, backend: 'indexedDB', database: DB_DATASET_PACKAGE, version: VERSION_DATASET_PACKAGE, store: STORE_DATASET_PACKAGE }),
    async salvarPacote(datasetId, bytes, metadata = {}) {
      if (!idValido(datasetId)) return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' };
      const dados = normalizarBytes(bytes);
      if (!dados) return { ok: false, codigo: 'BYTES_INVALIDOS', motivo: 'bytes precisa ser ArrayBuffer ou uma visão de buffer.' };
      const copia = new Uint8Array(dados);
      return executar(async (db) => {
        await transacao(db, 'readwrite', (store) => store.put({ datasetId, bytes: copia, sizeBytes: copia.byteLength, state: PACKAGE_STATES.STAGING, metadata: typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone(metadata) : metadata, updatedAt: Date.now() }));
        return { ok: true, datasetId, sizeBytes: copia.byteLength, state: PACKAGE_STATES.STAGING };
      });
    },
    async lerPacote(datasetId) {
      if (!idValido(datasetId)) return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' };
      return executar(async (db) => { const registro = await transacao(db, 'readonly', (store) => store.get(datasetId)); return !registro ? { ok: true, pacote: null } : { ok: true, pacote: { ...registro, bytes: new Uint8Array(registro.bytes) } }; });
    },
    async anexarPacoteStaging(datasetId, sufixo, metadata = {}) {
      if (!idValido(datasetId)) return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' };
      const dados = normalizarBytes(sufixo);
      if (!dados) return { ok: false, codigo: 'BYTES_INVALIDOS', motivo: 'sufixo precisa ser bytes válidos.' };
      const copia = new Uint8Array(dados);
      return executar(async (db) => {
        const atual = await transacao(db, 'readonly', (store) => store.get(datasetId));
        if (!atual) return { ok: false, codigo: 'PACKAGE_NOT_FOUND', motivo: 'Não existe staging físico para anexar.' };
        if (atual.state !== PACKAGE_STATES.STAGING) return { ok: false, codigo: 'PACKAGE_NOT_STAGING', motivo: 'Somente pacotes em STAGING podem receber continuação.' };
        const prefixo = new Uint8Array(atual.bytes);
        const completo = new Uint8Array(prefixo.byteLength + copia.byteLength);
        completo.set(prefixo); completo.set(copia, prefixo.byteLength);
        atual.bytes = completo; atual.sizeBytes = completo.byteLength; atual.metadata = { ...atual.metadata, ...metadata }; atual.updatedAt = Date.now();
        await transacao(db, 'readwrite', (store) => store.put(atual));
        return { ok: true, datasetId, sizeBytes: completo.byteLength, state: PACKAGE_STATES.STAGING };
      });
    },
    async promoverPacote(datasetId) {
      if (!idValido(datasetId)) return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' };
      return executar(async (db) => { const registro = await transacao(db, 'readonly', (store) => store.get(datasetId)); if (!registro) return { ok: false, codigo: 'PACKAGE_NOT_FOUND', motivo: 'O pacote físico não existe.' }; registro.state = PACKAGE_STATES.ACTIVE; await transacao(db, 'readwrite', (store) => store.put(registro)); return { ok: true, datasetId, state: registro.state }; });
    },
    async removerPacote(datasetId) { if (!idValido(datasetId)) return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' }; return executar(async (db) => { await transacao(db, 'readwrite', (store) => store.delete(datasetId)); return { ok: true, datasetId }; }); },
    async limparTudo() { return executar(async (db) => { await transacao(db, 'readwrite', (store) => store.clear()); return { ok: true }; }); },
  };
  return api;
}
