import { normalizarManifestoDataset } from './dataset-manifest.js';
import { ESTADOS_SYNC_DATASET } from './dataset-transacao.js';

export const ESQUEMA_STORAGE_DATASET = 'vanguard-dataset-storage';
export const VERSAO_STORAGE_DATASET = 1;
export const CHAVES_STORAGE_DATASET = Object.freeze({
  ATIVO: 'vanguard:maps:dataset:active',
  TRANSACAO: 'vanguard:maps:dataset:transaction',
});

function envelope(tipo, valor) {
  return {
    schema: ESQUEMA_STORAGE_DATASET,
    version: VERSAO_STORAGE_DATASET,
    type: tipo,
    value: valor,
  };
}

function copiar(valor) {
  if (valor == null || typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) return valor.map(copiar);
  return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, copiar(item)]));
}

function backendNativo() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function envelopeAtual(valor, tipo) {
  return Boolean(
    valor &&
      typeof valor === 'object' &&
      !Array.isArray(valor) &&
      valor.schema === ESQUEMA_STORAGE_DATASET &&
      valor.version === VERSAO_STORAGE_DATASET &&
      valor.type === tipo &&
      Object.hasOwn(valor, 'value')
  );
}

function resultadoErro(codigo, motivo) {
  return { ok: false, codigo, motivo };
}

function escrever(backend, chave, tipo, valor) {
  try {
    const serializado = JSON.stringify(envelope(tipo, valor));
    if (serializado === undefined) return resultadoErro('VALOR_NAO_SERIALIZAVEL', 'O valor não pode ser representado em JSON.');
    backend.setItem(chave, serializado);
    return { ok: true };
  } catch (erro) {
    return resultadoErro(
      'STORAGE_WRITE_FAILED',
      typeof erro?.name === 'string' && erro.name ? erro.name : 'ERRO_DE_ARMAZENAMENTO',
    );
  }
}

function ler(backend, chave, tipo) {
  try {
    const bruto = backend.getItem(chave);
    if (bruto == null) return { ok: true, valor: null };
    const valor = JSON.parse(bruto);
    if (!envelopeAtual(valor, tipo)) return resultadoErro('STORAGE_CORRUPTED', 'O envelope do dataset é inválido ou incompatível.');
    return { ok: true, valor: copiar(valor.value) };
  } catch (erro) {
    return resultadoErro(
      'STORAGE_READ_FAILED',
      typeof erro?.name === 'string' && erro.name ? erro.name : 'ERRO_DE_LEITURA',
    );
  }
}

function remover(backend, chave) {
  try {
    backend.removeItem(chave);
    return { ok: true };
  } catch (erro) {
    return resultadoErro(
      'STORAGE_REMOVE_FAILED',
      typeof erro?.name === 'string' && erro.name ? erro.name : 'ERRO_DE_REMOCAO',
    );
  }
}

function validarTransacao(transacao) {
  if (!transacao || typeof transacao !== 'object' || Array.isArray(transacao)) {
    return resultadoErro('TRANSACAO_INVALIDA', 'A transação deve ser um objeto.');
  }
  if (!Object.values(ESTADOS_SYNC_DATASET).includes(transacao.estado)) {
    return resultadoErro('ESTADO_INVALIDO', 'A transação possui estado desconhecido.');
  }
  if (typeof transacao.datasetId !== 'string' || transacao.datasetId.length === 0) {
    return resultadoErro('DATASET_ID_INVALIDO', 'A transação deve identificar o dataset.');
  }
  return { ok: true };
}

export function criarStorageDataset(backend = backendNativo()) {
  if (!backend || typeof backend.getItem !== 'function' || typeof backend.setItem !== 'function' || typeof backend.removeItem !== 'function') {
    return {
      lerAtivo: () => resultadoErro('STORAGE_UNAVAILABLE', 'O armazenamento local não está disponível.'),
      salvarAtivo: () => resultadoErro('STORAGE_UNAVAILABLE', 'O armazenamento local não está disponível.'),
      lerTransacao: () => resultadoErro('STORAGE_UNAVAILABLE', 'O armazenamento local não está disponível.'),
      salvarTransacao: () => resultadoErro('STORAGE_UNAVAILABLE', 'O armazenamento local não está disponível.'),
      limparTransacao: () => resultadoErro('STORAGE_UNAVAILABLE', 'O armazenamento local não está disponível.'),
      diagnostico: () => ({ schema: ESQUEMA_STORAGE_DATASET, version: VERSAO_STORAGE_DATASET, disponivel: false, chaves: { ...CHAVES_STORAGE_DATASET } }),
    };
  }

  return {
    lerAtivo() {
      const leitura = ler(backend, CHAVES_STORAGE_DATASET.ATIVO, 'active');
      if (!leitura.ok || leitura.valor == null) return leitura;
      const manifesto = normalizarManifestoDataset(leitura.valor);
      return manifesto.valido
        ? { ok: true, valor: manifesto.manifesto }
        : resultadoErro('MANIFESTO_INVALIDO', 'O manifesto ativo armazenado não passou na validação.');
    },
    salvarAtivo(manifesto) {
      const normalizado = normalizarManifestoDataset(manifesto);
      if (!normalizado.valido) return resultadoErro('MANIFESTO_INVALIDO', 'O manifesto ativo não passou na validação.');
      return escrever(backend, CHAVES_STORAGE_DATASET.ATIVO, 'active', normalizado.manifesto);
    },
    lerTransacao() {
      const leitura = ler(backend, CHAVES_STORAGE_DATASET.TRANSACAO, 'transaction');
      if (!leitura.ok || leitura.valor == null) return leitura;
      const validacao = validarTransacao(leitura.valor);
      return validacao.ok ? leitura : resultadoErro('TRANSACAO_INVALIDA', 'A transação armazenada não passou na validação.');
    },
    salvarTransacao(transacao) {
      const validacao = validarTransacao(transacao);
      if (!validacao.ok) return validacao;
      return escrever(backend, CHAVES_STORAGE_DATASET.TRANSACAO, 'transaction', copiar(transacao));
    },
    limparTransacao() {
      return remover(backend, CHAVES_STORAGE_DATASET.TRANSACAO);
    },
    diagnostico() {
      return {
        schema: ESQUEMA_STORAGE_DATASET,
        version: VERSAO_STORAGE_DATASET,
        disponivel: true,
        chaves: { ...CHAVES_STORAGE_DATASET },
      };
    },
  };
}
