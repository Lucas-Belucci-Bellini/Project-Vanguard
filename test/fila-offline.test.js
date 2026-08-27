import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drenarFila,
  enfileirar,
  listarFila,
  marcarFalha,
  tipoPodeAguardar,
} from '../src/core/fila-offline.js';

class MemStorage {
  constructor() { this.data = new Map(); }
  getItem(chave) { return this.data.has(chave) ? this.data.get(chave) : null; }
  setItem(chave, valor) { this.data.set(chave, String(valor)); }
  removeItem(chave) { this.data.delete(chave); }
  clear() { this.data.clear(); }
}

globalThis.localStorage = new MemStorage();
Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: { onLine: true } });

test.beforeEach(() => {
  globalThis.localStorage.clear();
  globalThis.navigator.onLine = true;
});

test('fila aceita apenas eventos sem efeito financeiro ou de emergência', () => {
  assert.equal(tipoPodeAguardar('recibo'), true);
  assert.equal(tipoPodeAguardar('pagamento'), false);
  assert.equal(tipoPodeAguardar('sos'), false);
  assert.equal(enfileirar('pagamento', { valor: 50 }), null);
  assert.equal(enfileirar('sos', { latitude: -22.9 }), null);
  assert.deepEqual(listarFila(), []);
});

test('fila preserva evento permitido e registra falha sem perder o histórico', () => {
  const item = enfileirar('recibo', { transacao: 'asaas-test' }, { origem: 'doar' });
  assert.equal(item.estado, 'pendente');
  assert.equal(listarFila()[0].payload.transacao, 'asaas-test');
  marcarFalha(item.id, 'rede indisponível');
  const falho = listarFila()[0];
  assert.equal(falho.estado, 'pendente');
  assert.equal(falho.tentativas, 1);
  assert.equal(falho.erro, 'rede indisponível');
});

test('drenarFila não processa nada offline e marca evento como enviado online', async () => {
  const item = enfileirar('email-notificacao', { assunto: 'Doação' });
  globalThis.navigator.onLine = false;
  const resultadoOffline = await drenarFila(async () => { throw new Error('não deveria executar'); });
  assert.equal(resultadoOffline.offline, true);
  assert.equal(resultadoOffline.enviados, 0);
  assert.equal(listarFila()[0].estado, 'pendente');

  globalThis.navigator.onLine = true;
  const resultadoOnline = await drenarFila(async (entrada) => {
    assert.equal(entrada.id, item.id);
  });
  assert.equal(resultadoOnline.enviados, 1);
  assert.equal(listarFila()[0].estado, 'enviado');
});
