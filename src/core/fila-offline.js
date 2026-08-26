/*
 * Fila offline-first para eventos não críticos e sincronizáveis.
 *
 * A fila não tenta enviar pagamentos ou SOS por conta própria. Ela guarda um
 * evento local até existir um canal online e um processador autorizado.
 */

const CHAVE = 'vanguard:fila-offline';
const LIMITE = 250;
const ouvintes = new Set();

function ler() {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(valor) ? valor : [];
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

export function listarFila() {
  return ler().sort((a, b) => a.createdAt - b.createdAt);
}

export function enfileirar(tipo, payload, meta = {}) {
  const item = {
    id: `${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo: String(tipo).slice(0, 60),
    payload: payload ?? {},
    meta: meta ?? {},
    estado: 'pendente',
    tentativas: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    ? { ...item, estado: 'pendente', tentativas: item.tentativas + 1, erro: String(erro || 'falha desconhecida').slice(0, 300), updatedAt: agora }
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
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { enviados: 0, pendentes: listarFila().length, offline: true };
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
