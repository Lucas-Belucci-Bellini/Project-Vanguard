/*
 * Fila offline-first para eventos não críticos e sincronizáveis.
 *
 * A fila não tenta enviar pagamentos ou SOS por conta própria. Ela guarda um
 * evento local até existir um canal online e um processador autorizado.
 */

const CHAVE = 'vanguard:fila-offline';
const LIMITE = 250;
const ouvintes = new Set();

/** Somente eventos sem efeito financeiro ou de emergência podem aguardar sync. */
export const TIPOS_SINCRONIZAVEIS = new Set([
  'email-notificacao',
  'recibo',
  'auditoria',
  'preferencias',
  'relatorio',
  'telemetria-consentida',
]);

export const TIPOS_BLOQUEADOS_OFFLINE = new Set([
  'pagamento',
  'cobranca',
  'asaas-payment',
  'asaas-webhook',
  'sos',
  'emergencia',
  'resgate',
  'radio',
  'satellite-message',
]);

function ler() {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    if (!Array.isArray(valor)) return [];
    return valor.filter((item) => item && typeof item.id === 'string' && typeof item.tipo === 'string');
  } catch {
    return [];
  }
}

function gravar(itens) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens.slice(-LIMITE)));
    ouvintes.forEach((ouvinte) => ouvinte(listarFila()));
    return true;
  } catch {
    return false;
  }
}

function idSeguro(tipo) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${tipo}-${uuid}` : `${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function tipoPodeAguardar(tipo) {
  const normalizado = String(tipo || '').trim().slice(0, 60);
  return TIPOS_SINCRONIZAVEIS.has(normalizado) && !TIPOS_BLOQUEADOS_OFFLINE.has(normalizado);
}

export function listarFila() {
  return ler().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function enfileirar(tipo, payload, meta = {}) {
  const tipoNormalizado = String(tipo || '').trim().slice(0, 60);
  if (!tipoPodeAguardar(tipoNormalizado)) return null;
  const agora = new Date().toISOString();
  const item = {
    id: idSeguro(tipoNormalizado),
    tipo: tipoNormalizado,
    payload: payload && typeof payload === 'object' ? payload : {},
    meta: meta && typeof meta === 'object' ? meta : {},
    estado: 'pendente',
    tentativas: 0,
    createdAt: agora,
    updatedAt: agora,
  };
  const ok = gravar([...ler(), item]);
  return ok ? item : null;
}

export function removerDaFila(id) {
  return gravar(ler().filter((item) => item.id !== id));
}

export function marcarFalha(id, erro) {
  const agora = new Date().toISOString();
  const itens = ler().map((item) => item.id === id
    ? { ...item, estado: 'pendente', tentativas: Number(item.tentativas || 0) + 1, erro: String(erro || 'falha desconhecida').slice(0, 300), updatedAt: agora }
    : item);
  return gravar(itens);
}

export function marcarEnviado(id) {
  const agora = new Date().toISOString();
  const itens = ler().map((item) => item.id === id
    ? { ...item, estado: 'enviado', sentAt: agora, updatedAt: agora }
    : item);
  return gravar(itens);
}

export function observarFila(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export async function drenarFila(processador) {
  if (typeof processador !== 'function') throw new TypeError('Um processador de fila é obrigatório.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { enviados: 0, pendentes: listarFila().filter((item) => item.estado === 'pendente').length, offline: true };
  }
  let enviados = 0;
  for (const item of listarFila().filter((entrada) => entrada.estado === 'pendente')) {
    try {
      await processador(item);
      marcarEnviado(item.id);
      enviados += 1;
    } catch (erro) {
      marcarFalha(item.id, erro?.message || erro);
    }
  }
  return { enviados, pendentes: listarFila().filter((item) => item.estado === 'pendente').length, offline: false };
}
