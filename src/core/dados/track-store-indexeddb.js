/**
 * A persistência real do Track Store: IndexedDB, com acréscimo de verdade.
 *
 * ## Por que IndexedDB e não localStorage
 *
 * `localStorage` é síncrono, guarda texto e tem cota de ~5 MB por origem. Uma
 * trilha longa em localStorage obriga a serializar o array inteiro a cada
 * ponto — foi exatamente assim que a 1.6.0 chegou a 1,53 MB de
 * `JSON.stringify` por fixo aceito, e a precisar de um teto de 12 000 pontos
 * que descartava o começo da caminhada em silêncio.
 *
 * Aqui cada ponto é um registro próprio. Gravar o 20 000º custa o mesmo que
 * gravar o primeiro, e não toca em nenhum dos anteriores.
 *
 * ## A chave composta é o que faz a leitura por sessão ser barata
 *
 * `pontos` tem `keyPath: ['sessaoId', 'seq']`. Como o IndexedDB mantém a ordem
 * da chave, ler uma sessão inteira é varrer um intervalo contíguo
 * (`IDBKeyRange.bound([id, 0], [id, Infinity])`) — sem índice secundário e sem
 * carregar o que é de outra sessão.
 *
 * ## `onupgradeneeded` NUNCA apaga
 *
 * Ele só cria o que falta. Um `deleteObjectStore` aqui levaria junto toda a
 * trilha do operador, e a política deste repositório
 * (`docs/DATA_MIGRATION_POLICY.md`) proíbe migração destrutiva sem backup,
 * motivo escrito e contagem conferida. Há teste de navegador cobrando que
 * reabrir o banco com dado dentro não perde nada.
 */

export const DB_TRILHAS = 'vanguard-trilhas';
export const VERSAO_DB_TRILHAS = 1;
export const STORE_SESSOES = 'sessoes';
export const STORE_PONTOS = 'pontos';

function promessa(pedido) {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

function transacaoConcluida(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('transação abortada'));
  });
}

/**
 * Abre o banco, criando o que faltar e **sem remover nada**.
 *
 * Exportada para o teste de navegador poder abrir o mesmo banco e conferir que
 * uma reabertura preserva o conteúdo.
 */
export function abrirBancoDeTrilhas({ indexedDBImpl = globalThis.indexedDB } = {}) {
  if (!indexedDBImpl) return Promise.reject(new Error('IndexedDB indisponível nesta plataforma.'));
  return new Promise((resolve, reject) => {
    const pedido = indexedDBImpl.open(DB_TRILHAS, VERSAO_DB_TRILHAS);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      // Só cria. Nunca `deleteObjectStore`: isso levaria a trilha do operador
      // junto, e a política do repositório proíbe destruir sem backup.
      if (!db.objectStoreNames.contains(STORE_SESSOES)) {
        db.createObjectStore(STORE_SESSOES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PONTOS)) {
        const pontos = db.createObjectStore(STORE_PONTOS, { keyPath: ['sessaoId', 'seq'] });
        pontos.createIndex('porSessao', 'sessaoId', { unique: false });
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
    pedido.onblocked = () => reject(new Error('O banco de trilhas está aberto em outra aba e bloqueou a atualização.'));
  });
}

/**
 * Implementa a porta `persistencia` que `criarTrackStore` consome.
 *
 * O store é a regra e não sabe que existe IndexedDB; isto é a única peça que
 * sabe, e é por isso que a regra pôde ser testada inteira sem navegador.
 */
export function persistenciaIndexedDB({ indexedDBImpl = globalThis.indexedDB } = {}) {
  let conexao = null;

  async function db() {
    if (!conexao) conexao = await abrirBancoDeTrilhas({ indexedDBImpl });
    return conexao;
  }

  return {
    async lerSessao(id) {
      const banco = await db();
      const tx = banco.transaction(STORE_SESSOES, 'readonly');
      return (await promessa(tx.objectStore(STORE_SESSOES).get(id))) ?? null;
    },

    async gravarSessao(sessao) {
      const banco = await db();
      const tx = banco.transaction(STORE_SESSOES, 'readwrite');
      tx.objectStore(STORE_SESSOES).put({ ...sessao });
      await transacaoConcluida(tx);
    },

    async listarSessoes() {
      const banco = await db();
      const tx = banco.transaction(STORE_SESSOES, 'readonly');
      return (await promessa(tx.objectStore(STORE_SESSOES).getAll())) ?? [];
    },

    /**
     * Acrescenta. Uma transação para o lote inteiro — atômica, e sem tocar em
     * ponto nenhum que já esteja gravado.
     */
    async anexarPontos(sessaoId, novos) {
      if (!novos?.length) return;
      const banco = await db();
      const tx = banco.transaction(STORE_PONTOS, 'readwrite');
      const store = tx.objectStore(STORE_PONTOS);
      for (const ponto of novos) store.put({ ...ponto, sessaoId });
      await transacaoConcluida(tx);
    },

    async contarPontos(sessaoId) {
      const banco = await db();
      const tx = banco.transaction(STORE_PONTOS, 'readonly');
      const faixa = IDBKeyRange.bound([sessaoId, -Infinity], [sessaoId, Infinity]);
      return promessa(tx.objectStore(STORE_PONTOS).count(faixa));
    },

    async lerPontos(sessaoId, { desde = 0, ate = Infinity } = {}) {
      const banco = await db();
      const tx = banco.transaction(STORE_PONTOS, 'readonly');
      // A chave composta mantém a ordem, então isto é uma varredura contígua:
      // ler uma sessão não custa carregar as outras.
      const faixa = IDBKeyRange.bound([sessaoId, desde], [sessaoId, ate === Infinity ? Infinity : ate]);
      return (await promessa(tx.objectStore(STORE_PONTOS).getAll(faixa))) ?? [];
    },

    /** Fecha a conexão. Não apaga nada — fechar não é limpar. */
    fechar() {
      try { conexao?.close?.(); } catch { /* já pode estar fechada */ }
      conexao = null;
    },
  };
}
