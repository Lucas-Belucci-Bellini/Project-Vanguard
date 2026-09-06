/**
 * Armazenamento local das fotos de parada.
 *
 * Fica em IndexedDB porque imagem não cabe em `localStorage` — e num banco
 * próprio, separado do storage de dataset: foto é dado da pessoa, dataset é
 * material distribuído. Apagar um nunca pode apagar o outro.
 *
 * Metadado e bytes moram em stores diferentes de propósito. `listar()` precisa
 * responder "quantas paradas eu tenho e onde" sem trazer dezenas de megabytes
 * de imagem para a memória; só `lerImagem()` toca nos bytes.
 *
 * Nada aqui sai do aparelho: não há URL, endpoint, credencial ou envio.
 */

export const DB_FOTOS_PARADA = 'vanguard-fotos-parada';
export const VERSAO_FOTOS_PARADA = 1;
export const STORE_METADADOS = 'metadados';
export const STORE_IMAGENS = 'imagens';

function indisponivel() {
  return { ok: false, codigo: 'FOTO_STORAGE_UNAVAILABLE', motivo: 'O armazenamento local de fotos não está disponível neste ambiente.' };
}

function validarId(id) {
  return typeof id === 'string' && id.trim().length > 0
    ? null
    : { ok: false, codigo: 'FOTO_ID_INVALIDO', motivo: 'A foto precisa de um identificador.' };
}

function normalizarBytes(bytes) {
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (ArrayBuffer.isView(bytes)) return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return null;
}

function validarBytes(bytes) {
  const dados = normalizarBytes(bytes);
  if (!dados || dados.byteLength === 0) {
    return { ok: false, codigo: 'FOTO_BYTES_INVALIDOS', motivo: 'A imagem precisa de bytes válidos e não vazios.' };
  }
  return null;
}

function validarRegistro(registro) {
  if (!registro || typeof registro !== 'object' || Array.isArray(registro)) {
    return { ok: false, codigo: 'FOTO_REGISTRO_INVALIDO', motivo: 'O registro da foto deve ser um objeto.' };
  }
  return validarId(registro.id)
    ? { ok: false, codigo: 'FOTO_ID_INVALIDO', motivo: 'O registro da foto precisa de um identificador.' }
    : null;
}

function abrir(indexedDBImpl) {
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(DB_FOTOS_PARADA, VERSAO_FOTOS_PARADA);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_METADADOS)) db.createObjectStore(STORE_METADADOS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_IMAGENS)) db.createObjectStore(STORE_IMAGENS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir o banco de fotos.'));
    request.onblocked = () => reject(new Error('A abertura do banco de fotos foi bloqueada.'));
  });
}

function pedido(store, operacao) {
  return new Promise((resolve, reject) => {
    let requisicao;
    try { requisicao = operacao(store); } catch (erro) { reject(erro); return; }
    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () => reject(requisicao.error ?? new Error('Operação IndexedDB falhou.'));
  });
}

function copiar(valor) {
  return typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone(valor) : JSON.parse(JSON.stringify(valor));
}

export function criarStorageFotos({ indexedDBImpl = globalThis.indexedDB } = {}) {
  if (!indexedDBImpl) {
    return {
      disponivel: false,
      diagnostico: () => indisponivel(),
      salvarFoto: async (registro, bytes) => validarRegistro(registro) ?? validarBytes(bytes) ?? indisponivel(),
      lerMetadados: async (id) => validarId(id) ?? indisponivel(),
      lerImagem: async (id) => validarId(id) ?? indisponivel(),
      listar: async () => indisponivel(),
      remover: async (id) => validarId(id) ?? indisponivel(),
      limparTudo: async () => indisponivel(),
      uso: async () => indisponivel(),
    };
  }

  async function executar(fn) {
    let db;
    try {
      db = await abrir(indexedDBImpl);
      return await fn(db);
    } catch (erro) {
      return {
        ok: false,
        codigo: erro?.name === 'QuotaExceededError' ? 'FOTO_STORAGE_QUOTA' : 'FOTO_STORAGE_FAILED',
        motivo: erro?.message ?? 'Falha no armazenamento local de fotos.',
      };
    } finally {
      db?.close();
    }
  }

  function comStores(db, modo, nomes, trabalho) {
    const tx = db.transaction(nomes, modo);
    return trabalho(...nomes.map((nome) => tx.objectStore(nome)));
  }

  return {
    disponivel: true,

    diagnostico: () => ({
      ok: true,
      disponivel: true,
      backend: 'indexedDB',
      database: DB_FOTOS_PARADA,
      version: VERSAO_FOTOS_PARADA,
      stores: [STORE_METADADOS, STORE_IMAGENS],
    }),

    /** Grava metadado e imagem. Um sem o outro seria parada sem foto ou foto sem lugar. */
    async salvarFoto(registro, bytes) {
      const invalido = validarRegistro(registro) ?? validarBytes(bytes);
      if (invalido) return invalido;
      const dados = new Uint8Array(normalizarBytes(bytes));
      const metadado = { ...copiar(registro), sizeBytes: dados.byteLength, salvaEm: Date.now() };
      return executar(async (db) => {
        await comStores(db, 'readwrite', [STORE_METADADOS, STORE_IMAGENS], (meta, imagens) =>
          Promise.all([
            pedido(meta, (store) => store.put(metadado)),
            pedido(imagens, (store) => store.put({ id: registro.id, bytes: dados })),
          ]));
        return { ok: true, id: registro.id, sizeBytes: dados.byteLength };
      });
    },

    async lerMetadados(id) {
      const invalido = validarId(id);
      if (invalido) return invalido;
      return executar(async (db) => {
        const registro = await comStores(db, 'readonly', [STORE_METADADOS], (meta) => pedido(meta, (store) => store.get(id)));
        return { ok: true, metadados: registro ?? null };
      });
    },

    async lerImagem(id) {
      const invalido = validarId(id);
      if (invalido) return invalido;
      return executar(async (db) => {
        const registro = await comStores(db, 'readonly', [STORE_IMAGENS], (imagens) => pedido(imagens, (store) => store.get(id)));
        return registro?.bytes
          ? { ok: true, id, bytes: new Uint8Array(registro.bytes) }
          : { ok: false, codigo: 'FOTO_NAO_ENCONTRADA', motivo: 'A imagem desta parada não está no aparelho.' };
      });
    },

    /** Só metadados: listar não pode custar o tamanho de todas as fotos em RAM. */
    async listar() {
      return executar(async (db) => {
        const registros = await comStores(db, 'readonly', [STORE_METADADOS], (meta) => pedido(meta, (store) => store.getAll()));
        const lista = Array.isArray(registros) ? registros : [];
        lista.sort((a, b) => String(a?.capturadaEm ?? '').localeCompare(String(b?.capturadaEm ?? '')));
        return { ok: true, fotos: lista };
      });
    },

    async remover(id) {
      const invalido = validarId(id);
      if (invalido) return invalido;
      return executar(async (db) => {
        await comStores(db, 'readwrite', [STORE_METADADOS, STORE_IMAGENS], (meta, imagens) =>
          Promise.all([
            pedido(meta, (store) => store.delete(id)),
            pedido(imagens, (store) => store.delete(id)),
          ]));
        return { ok: true, id };
      });
    },

    async limparTudo() {
      return executar(async (db) => {
        await comStores(db, 'readwrite', [STORE_METADADOS, STORE_IMAGENS], (meta, imagens) =>
          Promise.all([
            pedido(meta, (store) => store.clear()),
            pedido(imagens, (store) => store.clear()),
          ]));
        return { ok: true };
      });
    },

    /** Ocupação declarada pelos metadados; o navegador é quem decide a quota real. */
    async uso() {
      const resultado = await this.listar();
      if (!resultado.ok) return resultado;
      const totalBytes = resultado.fotos.reduce((total, foto) => total + (Number(foto?.sizeBytes) || 0), 0);
      return { ok: true, fotos: resultado.fotos.length, totalBytes };
    },
  };
}
