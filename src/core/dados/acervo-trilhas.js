/**
 * Acervo de trilhas — várias caminhadas guardadas lado a lado.
 *
 * ## Por que um banco separado
 *
 * `vanguard:trilha` é a caminhada em andamento, e o Track Store da V3 é o
 * registro completo dela. Nenhum dos dois foi feito para guardar **a trilha de
 * outra pessoa**, importada de um GPX, para comparar depois.
 *
 * O acervo é um banco próprio (`vanguard-acervo`) justamente para que
 * importar a trilha de dez peregrinos **não encoste** no que o aparelho está
 * gravando agora. Aditivo, isolado, e sem migração nenhuma sobre o que já
 * existe — a regra de `docs/v3/DATA_MIGRATION_POLICY.md`.
 *
 * ## O que cada entrada guarda
 *
 * Os pontos, o nome, de onde veio (gravado aqui? importado de qual arquivo?) e
 * quando entrou. A **origem** importa: comparar a caminhada de hoje com um GPX
 * de 2019 é legítimo, mas quem lê o número precisa saber que é isso.
 *
 * Tudo é injetável: o `indexedDB` entra por parâmetro para a regra ser testada
 * sem navegador.
 */

export const DB_ACERVO = 'vanguard-acervo';
export const VERSAO_DB_ACERVO = 1;
export const STORE_TRILHAS = 'trilhas';

export const ORIGEM_TRILHA = Object.freeze({
  /** Gravada por este aparelho. */
  GRAVADA: 'GRAVADA',
  /** Importada de arquivo — GPX, KML ou o JSON do próprio app. */
  IMPORTADA: 'IMPORTADA',
  /** Traçado de referência, que pode estar velho. */
  REFERENCIA: 'REFERENCIA',
});

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
    tx.onabort = () => reject(tx.error ?? new Error('Transação abortada.'));
  });
}

export function abrirAcervo({ indexedDBImpl = globalThis.indexedDB } = {}) {
  if (!indexedDBImpl) return Promise.reject(new Error('IndexedDB indisponível nesta plataforma.'));
  return new Promise((resolve, reject) => {
    const pedido = indexedDBImpl.open(DB_ACERVO, VERSAO_DB_ACERVO);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      // Só cria. `deleteObjectStore` levaria as trilhas guardadas junto.
      if (!db.objectStoreNames.contains(STORE_TRILHAS)) {
        db.createObjectStore(STORE_TRILHAS, { keyPath: 'id' });
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
    pedido.onblocked = () => reject(new Error('O acervo está aberto em outra aba e bloqueou a atualização.'));
  });
}

/** Guarda em memória — para teste, e para quando não há IndexedDB. */
export function acervoEmMemoria() {
  const mapa = new Map();
  return {
    async salvar(t) { mapa.set(t.id, { ...t }); },
    async listar() { return [...mapa.values()]; },
    async ler(id) { return mapa.has(id) ? { ...mapa.get(id) } : null; },
    async remover(id) { mapa.delete(id); },
  };
}

export function acervoIndexedDB({ indexedDBImpl = globalThis.indexedDB } = {}) {
  let conexao = null;
  const db = async () => (conexao ??= await abrirAcervo({ indexedDBImpl }));
  return {
    async salvar(trilha) {
      const banco = await db();
      const tx = banco.transaction(STORE_TRILHAS, 'readwrite');
      tx.objectStore(STORE_TRILHAS).put({ ...trilha });
      await transacaoConcluida(tx);
    },
    async listar() {
      const banco = await db();
      const tx = banco.transaction(STORE_TRILHAS, 'readonly');
      return (await promessa(tx.objectStore(STORE_TRILHAS).getAll())) ?? [];
    },
    async ler(id) {
      const banco = await db();
      const tx = banco.transaction(STORE_TRILHAS, 'readonly');
      return (await promessa(tx.objectStore(STORE_TRILHAS).get(id))) ?? null;
    },
    async remover(id) {
      const banco = await db();
      const tx = banco.transaction(STORE_TRILHAS, 'readwrite');
      tx.objectStore(STORE_TRILHAS).delete(id);
      await transacaoConcluida(tx);
    },
  };
}

/**
 * O acervo como regra, sobre uma guarda injetada.
 *
 * `remover` exige o nome exato como confirmação: apagar a caminhada de alguém
 * por toque errado numa lista é o tipo de perda que não volta, e a política do
 * repositório manda parar antes de qualquer `delete`.
 */
export function criarAcervo({ guarda = acervoEmMemoria(), relogio = () => Date.now() } = {}) {
  return {
    async guardar({ nome, pontos, origem = ORIGEM_TRILHA.IMPORTADA, arquivo = null, id = null }) {
      const lista = Array.isArray(pontos) ? pontos : [];
      if (!lista.length) return { guardada: false, motivo: 'TRILHA_VAZIA' };
      const rotulo = String(nome ?? '').trim();
      if (!rotulo) return { guardada: false, motivo: 'SEM_NOME' };

      const trilha = {
        id: id ?? `t-${relogio()}-${Math.random().toString(36).slice(2, 8)}`,
        nome: rotulo,
        origem,
        arquivo,
        guardadaEm: relogio(),
        pontos: lista,
        // Contagem gravada junto: a lista mostra o tamanho sem carregar todos
        // os pontos de todas as trilhas para a memória.
        totalPontos: lista.length,
      };
      await guarda.salvar(trilha);
      return { guardada: true, trilha };
    },

    async listar() {
      const todas = await guarda.listar();
      return todas.sort((a, b) => (b.guardadaEm ?? 0) - (a.guardadaEm ?? 0));
    },

    ler: (id) => guarda.ler(id),

    /** Apagar exige o nome exato — lista é fácil de tocar por engano. */
    async remover(id, nomeConfirmado) {
      const trilha = await guarda.ler(id);
      if (!trilha) return { removida: false, motivo: 'NAO_ENCONTRADA' };
      if (String(nomeConfirmado ?? '').trim() !== trilha.nome) {
        return { removida: false, motivo: 'NOME_NAO_CONFERE', esperado: trilha.nome };
      }
      await guarda.remover(id);
      return { removida: true, trilha };
    },
  };
}
