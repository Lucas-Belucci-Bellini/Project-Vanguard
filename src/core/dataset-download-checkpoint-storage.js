/** Persistência isolada de checkpoints de download. Não armazena bytes do pacote. */
export const DB_DATASET_DOWNLOAD = 'vanguard-dataset-download';
export const VERSION_DATASET_DOWNLOAD = 1;
export const STORE_DOWNLOAD_CHECKPOINT = 'checkpoints';

const indisponivel = () => ({ ok: false, codigo: 'DOWNLOAD_CHECKPOINT_STORAGE_UNAVAILABLE', motivo: 'IndexedDB não está disponível neste ambiente.' });
const idValido = (id) => typeof id === 'string' && id.trim().length > 0;

function abrir(indexedDBImpl) {
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(DB_DATASET_DOWNLOAD, VERSION_DATASET_DOWNLOAD);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DOWNLOAD_CHECKPOINT)) db.createObjectStore(STORE_DOWNLOAD_CHECKPOINT, { keyPath: 'datasetId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir storage de checkpoint.'));
    request.onblocked = () => reject(new Error('A abertura do storage de checkpoint foi bloqueada.'));
  });
}
function request(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOAD_CHECKPOINT, mode);
    let req;
    try { req = fn(tx.objectStore(STORE_DOWNLOAD_CHECKPOINT)); } catch (e) { reject(e); return; }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Operação de checkpoint falhou.'));
  });
}

export function criarCheckpointStorage({ indexedDBImpl = globalThis.indexedDB } = {}) {
  if (!indexedDBImpl) return { disponivel: false, salvar: async () => indisponivel(), ler: async () => indisponivel(), remover: async () => indisponivel(), limpar: async () => indisponivel() };
  async function executar(fn) {
    let db;
    try { db = await abrir(indexedDBImpl); return await fn(db); }
    catch (erro) { return { ok: false, codigo: erro?.name === 'QuotaExceededError' ? 'DOWNLOAD_CHECKPOINT_QUOTA' : 'DOWNLOAD_CHECKPOINT_STORAGE_FAILED', motivo: erro?.message ?? 'Falha no storage de checkpoint.' }; }
    finally { db?.close(); }
  }
  return {
    disponivel: true,
    async salvar(checkpoint) {
      if (!checkpoint || !idValido(checkpoint.datasetId) || checkpoint.version !== 1 || !Number.isInteger(checkpoint.recebido) || checkpoint.recebido < 0) return { ok: false, codigo: 'CHECKPOINT_INVALIDO', motivo: 'Checkpoint inválido.' };
      return executar(async (db) => { const registro = { ...checkpoint, updatedAt: Date.now() }; await request(db, 'readwrite', store => store.put(registro)); return { ok: true, checkpoint: registro }; });
    },
    async ler(datasetId) {
      if (!idValido(datasetId)) return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' };
      return executar(async db => ({ ok: true, checkpoint: (await request(db, 'readonly', store => store.get(datasetId))) ?? null }));
    },
    async remover(datasetId) {
      if (!idValido(datasetId)) return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' };
      return executar(async db => { await request(db, 'readwrite', store => store.delete(datasetId)); return { ok: true, datasetId }; });
    },
    async limpar() { return executar(async db => { await request(db, 'readwrite', store => store.clear()); return { ok: true }; }); },
  };
}
