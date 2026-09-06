/**
 * Inventário do que está guardado NESTE aparelho, agora.
 *
 * O catálogo (`catalogo.js`) diz o que o Vanguard *declara* guardar. Este
 * módulo abre o aparelho e diz o que ele *tem*: quantos registros, quantos
 * bytes, e o resumo criptográfico de cada chave.
 *
 * ## Só lê
 *
 * Nenhuma função daqui escreve, apaga ou normaliza nada. É de propósito: o
 * inventário é o passo que roda **antes** de qualquer migração e **depois**
 * dela, e um inventário que altera o que mede não serve para comparar os dois
 * lados. Se este módulo puder escrever, ele deixa de ser prova.
 *
 * ## O achado que ele existe para produzir
 *
 * A parte que interessa não é contar o que já se conhece — é a chave
 * `DESCONHECIDA`: presente no aparelho e ausente do catálogo. Ela é o dado de
 * uma versão antiga, ou de um recurso removido cujo valor ficou para trás.
 * É exatamente esse dado que uma "limpeza" apaga sem ninguém notar, e por isso
 * ele aparece no relatório em vez de ser ignorado.
 *
 * Efeitos são injetáveis (`localStorageImpl`, `indexedDBImpl`, `cachesImpl`)
 * para que o inventário rode no Node, dentro de teste, sem navegador.
 */

import {
  BACKENDS,
  BANCOS_INDEXED_DB,
  CACHES_SERVICE_WORKER,
  CLASSES_DADO,
  CHAVES_LOCAIS,
  PREFIXO_LOCAL_STORAGE,
  descreverChaveLocal,
} from './catalogo.js';

/** Como o inventário terminou. `PARCIAL` nunca é tratado como sucesso. */
export const RESULTADO_INVENTARIO = Object.freeze({
  COMPLETO: 'COMPLETO',
  PARCIAL: 'PARCIAL',
  INDISPONIVEL: 'INDISPONIVEL',
});

const textoBytes = (texto) => new TextEncoder().encode(texto).length;

/** SHA-256 do conteúdo, para comparar antes e depois de uma migração. */
async function resumo(texto, cryptoImpl) {
  const subtle = cryptoImpl?.subtle;
  if (!subtle?.digest) return null;
  const bytes = new TextEncoder().encode(texto);
  const hash = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Quantos registros a chave guarda.
 *
 * `null` significa "não é uma coleção", que é diferente de zero. Um objeto de
 * preferências não tem contagem; uma trilha vazia tem contagem 0. Confundir os
 * dois faria a comparação antes/depois de uma migração acusar perda onde não
 * houve — ou pior, deixar de acusar onde houve.
 */
function contarRegistros(valor) {
  if (Array.isArray(valor)) return valor.length;
  return null;
}

/** Lê e descreve uma chave, sem julgar o conteúdo. */
async function inspecionarChave(chave, bruto, cryptoImpl) {
  const declarada = descreverChaveLocal(chave);
  const item = {
    id: `${BACKENDS.LOCAL_STORAGE}:${PREFIXO_LOCAL_STORAGE}${chave}`,
    backend: BACKENDS.LOCAL_STORAGE,
    caminho: `${PREFIXO_LOCAL_STORAGE}${chave}`,
    chave,
    titulo: declarada?.titulo ?? `Chave não catalogada: ${chave}`,
    classe: declarada?.classe ?? CLASSES_DADO.DESCONHECIDO,
    formato: declarada?.formato ?? null,
    escritoPor: declarada?.escritoPor ?? null,
    versaoEsquema: declarada?.versaoEsquema ?? null,
    legado: declarada?.legado === true,
    catalogada: Boolean(declarada),
    bytes: textoBytes(bruto),
    registros: null,
    lido: true,
    ilegivel: false,
    checksum: await resumo(bruto, cryptoImpl),
  };

  try {
    item.registros = contarRegistros(JSON.parse(bruto));
  } catch {
    // Conteúdo que não é JSON válido continua no inventário, marcado. Ele é
    // justamente o candidato a se perder numa migração automática — e a única
    // reação correta é preservar o original, não descartar.
    item.ilegivel = true;
  }

  if (!declarada) {
    item.observacao = 'Presente no aparelho e ausente do catálogo. Nunca apagar sem investigar: pode ser dado de uma versão anterior.';
  } else if (declarada.observacao) {
    item.observacao = declarada.observacao;
  }

  return item;
}

/** Todas as chaves `vanguard:` que existem no aparelho, catalogadas ou não. */
export async function inventariarLocalStorage({
  localStorageImpl = globalThis.localStorage,
  cryptoImpl = globalThis.crypto,
} = {}) {
  if (!localStorageImpl) {
    return { resultado: RESULTADO_INVENTARIO.INDISPONIVEL, motivo: 'localStorage indisponível neste ambiente.', itens: [] };
  }

  const itens = [];
  const falhas = [];
  let chaves;
  try {
    chaves = Object.keys(localStorageImpl).filter((k) => k.startsWith(PREFIXO_LOCAL_STORAGE));
  } catch (erro) {
    return { resultado: RESULTADO_INVENTARIO.INDISPONIVEL, motivo: `Não foi possível listar as chaves: ${erro?.message ?? erro}`, itens: [] };
  }

  for (const completa of chaves.sort()) {
    const chave = completa.slice(PREFIXO_LOCAL_STORAGE.length);
    try {
      const bruto = localStorageImpl.getItem(completa);
      if (bruto == null) continue;
      itens.push(await inspecionarChave(chave, bruto, cryptoImpl));
    } catch (erro) {
      falhas.push({ chave, erro: erro?.message ?? String(erro) });
      itens.push({
        id: `${BACKENDS.LOCAL_STORAGE}:${completa}`,
        backend: BACKENDS.LOCAL_STORAGE,
        caminho: completa,
        chave,
        titulo: `Chave ilegível: ${chave}`,
        classe: descreverChaveLocal(chave)?.classe ?? CLASSES_DADO.DESCONHECIDO,
        catalogada: Boolean(descreverChaveLocal(chave)),
        bytes: null, registros: null, checksum: null,
        lido: false, ilegivel: true,
        observacao: 'A leitura falhou. O valor continua no aparelho e não pode ser considerado ausente.',
      });
    }
  }

  return {
    resultado: falhas.length ? RESULTADO_INVENTARIO.PARCIAL : RESULTADO_INVENTARIO.COMPLETO,
    itens,
    falhas,
  };
}

/**
 * Os bancos IndexedDB declarados, com contagem por store.
 *
 * Abre **somente com a versão declarada** e nunca cria: abrir sem versão
 * levaria o navegador a criar o banco se ele não existisse, e um inventário que
 * cria o que foi medir não mede nada.
 */
export async function inventariarIndexedDB({ indexedDBImpl = globalThis.indexedDB } = {}) {
  if (!indexedDBImpl) {
    return { resultado: RESULTADO_INVENTARIO.INDISPONIVEL, motivo: 'IndexedDB indisponível neste ambiente.', itens: [] };
  }

  const itens = [];
  const falhas = [];

  for (const banco of BANCOS_INDEXED_DB) {
    try {
      const db = await abrirSemCriar(indexedDBImpl, banco.banco, banco.versao);
      if (!db) {
        itens.push({
          id: `${BACKENDS.INDEXED_DB}:${banco.banco}`,
          backend: BACKENDS.INDEXED_DB,
          caminho: banco.banco,
          titulo: banco.titulo,
          classe: banco.classe,
          catalogada: true,
          existe: false,
          registros: null,
          stores: {},
          observacao: 'Banco declarado que ainda não existe neste aparelho. Ausência não é perda.',
        });
        continue;
      }

      const stores = {};
      let total = 0;
      for (const store of banco.stores) {
        if (!db.objectStoreNames.contains(store)) { stores[store] = null; continue; }
        const quantos = await contarStore(db, store);
        stores[store] = quantos;
        if (Number.isFinite(quantos)) total += quantos;
      }
      db.close?.();

      itens.push({
        id: `${BACKENDS.INDEXED_DB}:${banco.banco}`,
        backend: BACKENDS.INDEXED_DB,
        caminho: banco.banco,
        titulo: banco.titulo,
        classe: banco.classe,
        escritoPor: banco.escritoPor,
        versaoEsquema: banco.versao,
        catalogada: true,
        existe: true,
        registros: total,
        stores,
        observacao: banco.observacao ?? null,
      });
    } catch (erro) {
      falhas.push({ banco: banco.banco, erro: erro?.message ?? String(erro) });
    }
  }

  return {
    resultado: falhas.length ? RESULTADO_INVENTARIO.PARCIAL : RESULTADO_INVENTARIO.COMPLETO,
    itens,
    falhas,
  };
}

function abrirSemCriar(indexedDBImpl, nome, versao) {
  return new Promise((resolve, reject) => {
    let criando = false;
    const pedido = indexedDBImpl.open(nome, versao);
    pedido.onupgradeneeded = () => {
      // Chegar aqui significa que o banco não existia (ou é mais antigo). O
      // inventário aborta em vez de criar: medir não pode alterar.
      criando = true;
      pedido.transaction?.abort?.();
    };
    pedido.onsuccess = () => resolve(criando ? null : pedido.result);
    pedido.onerror = () => (criando ? resolve(null) : reject(pedido.error));
    pedido.onblocked = () => resolve(null);
  });
}

function contarStore(db, store) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(store, 'readonly');
      const pedido = tx.objectStore(store).count();
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error);
    } catch (erro) {
      reject(erro);
    }
  });
}

/** Os caches do service worker presentes. São CACHE: contam, mas não pesam. */
export async function inventariarCaches({ cachesImpl = globalThis.caches } = {}) {
  if (!cachesImpl?.keys) {
    return { resultado: RESULTADO_INVENTARIO.INDISPONIVEL, motivo: 'Cache Storage indisponível neste ambiente.', itens: [] };
  }
  try {
    const nomes = await cachesImpl.keys();
    const itens = nomes.map((nome) => {
      const declarado = CACHES_SERVICE_WORKER.find((c) => nome.startsWith(c.prefixo));
      return {
        id: `${BACKENDS.CACHE_STORAGE}:${nome}`,
        backend: BACKENDS.CACHE_STORAGE,
        caminho: nome,
        titulo: declarado?.titulo ?? `Cache não catalogado: ${nome}`,
        classe: CLASSES_DADO.CACHE,
        catalogada: Boolean(declarado),
        registros: null,
      };
    });
    return { resultado: RESULTADO_INVENTARIO.COMPLETO, itens };
  } catch (erro) {
    return { resultado: RESULTADO_INVENTARIO.INDISPONIVEL, motivo: erro?.message ?? String(erro), itens: [] };
  }
}

/**
 * O inventário completo do aparelho, com o resumo que decide se uma migração
 * pode começar.
 */
export async function inventariarTudo(opcoes = {}) {
  const [local, bancos, caches] = await Promise.all([
    inventariarLocalStorage(opcoes),
    inventariarIndexedDB(opcoes),
    inventariarCaches(opcoes),
  ]);

  const itens = [...local.itens, ...bancos.itens, ...caches.itens];
  const partes = [local, bancos, caches];
  // INDISPONIVEL não vira PARCIAL: um ambiente sem IndexedDB não é uma leitura
  // incompleta, é um ambiente diferente. PARCIAL fica reservado para falha ao
  // ler algo que existe — que é o caso em que migrar seria perigoso.
  const resultado = partes.some((p) => p.resultado === RESULTADO_INVENTARIO.PARCIAL)
    ? RESULTADO_INVENTARIO.PARCIAL
    : RESULTADO_INVENTARIO.COMPLETO;

  const porClasse = {};
  for (const classe of Object.values(CLASSES_DADO)) porClasse[classe] = 0;
  for (const item of itens) porClasse[item.classe] = (porClasse[item.classe] ?? 0) + 1;

  const desconhecidas = itens.filter((i) => i.classe === CLASSES_DADO.DESCONHECIDO);
  const ilegiveis = itens.filter((i) => i.ilegivel === true);
  const criticos = itens.filter((i) => i.classe === CLASSES_DADO.CRITICO);

  return {
    resultado,
    geradoEm: new Date(opcoes.agora ?? Date.now()).toISOString(),
    backends: {
      [BACKENDS.LOCAL_STORAGE]: local.resultado,
      [BACKENDS.INDEXED_DB]: bancos.resultado,
      [BACKENDS.CACHE_STORAGE]: caches.resultado,
    },
    itens,
    porClasse,
    totais: {
      itens: itens.length,
      bytesLocalStorage: local.itens.reduce((soma, i) => soma + (i.bytes ?? 0), 0),
      registrosCriticos: criticos.reduce((soma, i) => soma + (i.registros ?? 0), 0),
    },
    desconhecidas,
    ilegiveis,
    falhas: [...(local.falhas ?? []), ...(bancos.falhas ?? [])],
    /**
     * Migrar exige leitura confiável. Parcial, ilegível ou desconhecido são os
     * três casos em que a resposta é "não comece" — e o motivo vai junto, para
     * não virar um "não" sem explicação.
     */
    seguroParaMigrar: resultado === RESULTADO_INVENTARIO.COMPLETO && ilegiveis.length === 0,
    motivosDeBloqueio: [
      ...(resultado === RESULTADO_INVENTARIO.PARCIAL ? ['O inventário ficou incompleto: há dado que existe e não pôde ser lido.'] : []),
      ...(ilegiveis.length ? [`${ilegiveis.length} chave(s) com conteúdo ilegível: preserve o original antes de qualquer conversão.`] : []),
      ...(desconhecidas.length ? [`${desconhecidas.length} chave(s) fora do catálogo: investigue antes de migrar, e nunca apague.`] : []),
    ],
  };
}

/** Quantas chaves o catálogo declara mas o aparelho não tem. Ausência não é perda. */
export function chavesDeclaradasAusentes(inventario) {
  const presentes = new Set(inventario.itens.filter((i) => i.backend === BACKENDS.LOCAL_STORAGE).map((i) => i.chave));
  return CHAVES_LOCAIS.filter((entrada) => !presentes.has(entrada.chave)).map((entrada) => entrada.chave);
}
