import test from 'node:test';
import assert from 'node:assert/strict';
import { criarControleAtualizacao } from '../src/core/atualizacao-ui.js';

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }

  removeEventListener(name, callback) {
    if (this.listeners.get(name) === callback) this.listeners.delete(name);
  }

  append(...children) {
    this.children.push(...children);
  }

  click() {
    this.onclick?.({ preventDefault() {} });
  }
}

function instalarAmbienteFake() {
  const globais = ['document', 'navigator', 'window', 'fetch', 'Node', 'setTimeout', 'clearTimeout', 'addEventListener', 'removeEventListener'];
  const anteriores = new Map(globais.map((nome) => [nome, Object.getOwnPropertyDescriptor(globalThis, nome)]));
  const eventos = new Map();
  const eventosDocumento = new Map();
  const eventosServiceWorker = new Map();
  const registro = {
    waiting: { postMessage: () => {} },
    installing: null,
    addEventListener(nome, callback) { eventos.set(`registro:${nome}`, callback); },
  };
  let confirmacao = false;
  let recarregamentos = 0;
  let urlAtribuida = null;
  const mensagens = [];
  const timers = [];
  let proximoTimer = 1;
  const setTimeoutFake = (callback, delay) => {
    const timer = { id: proximoTimer++, callback, delay, cancelado: false };
    timers.push(timer);
    return timer.id;
  };
  const clearTimeoutFake = (id) => {
    const timer = timers.find((item) => item.id === id);
    if (timer) timer.cancelado = true;
  };

  const adicionar = (colecao, nome, callback) => {
    if (!colecao.has(nome)) colecao.set(nome, new Set());
    colecao.get(nome).add(callback);
  };
  const remover = (colecao, nome, callback) => colecao.get(nome)?.delete(callback);
  const criarAlvo = (colecao) => ({
    addEventListener(nome, callback) { adicionar(colecao, nome, callback); },
    removeEventListener(nome, callback) { remover(colecao, nome, callback); },
  });

  const documento = {
    hidden: false,
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (text) => ({ textContent: String(text) }),
    ...criarAlvo(eventosDocumento),
  };
  const serviceWorker = {
    controller: {},
    ready: Promise.resolve(registro),
    ...criarAlvo(eventosServiceWorker),
  };
  const janela = {
    confirm: () => confirmacao,
    open: () => null,
    location: {
      assign: (url) => { urlAtribuida = url; },
      reload: () => { recarregamentos += 1; },
    },
  };
  const navegador = { onLine: true, serviceWorker };

  Object.defineProperty(globalThis, 'document', { configurable: true, value: documento });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: navegador });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: janela });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => ({ ok: false }) });
  Object.defineProperty(globalThis, 'Node', { configurable: true, value: FakeElement });
  Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value: setTimeoutFake });
  Object.defineProperty(globalThis, 'clearTimeout', { configurable: true, value: clearTimeoutFake });
  Object.defineProperty(globalThis, 'addEventListener', { configurable: true, value: (nome, callback) => adicionar(eventos, nome, callback) });
  Object.defineProperty(globalThis, 'removeEventListener', { configurable: true, value: (nome, callback) => remover(eventos, nome, callback) });

  registro.waiting.postMessage = (mensagem) => mensagens.push(mensagem);
  return {
    documento,
    eventos,
    eventosDocumento,
    eventosServiceWorker,
    registro,
    mensagens,
    timers,
    get confirmacao() { return confirmacao; },
    set confirmacao(valor) { confirmacao = valor; },
    get recarregamentos() { return recarregamentos; },
    get urlAtribuida() { return urlAtribuida; },
    dispatch(nome, evento) { for (const callback of eventos.get(nome) || []) callback(evento); },
    restaurar() {
      for (const nome of globais) {
        const anterior = anteriores.get(nome);
        if (anterior) Object.defineProperty(globalThis, nome, anterior);
        else delete globalThis[nome];
      }
    },
  };
}

test('controle PWA detecta waiting, respeita negar/confirmar e remove listeners', () => {
  const ambiente = instalarAmbienteFake();
  try {
    const controle = criarControleAtualizacao();
    ambiente.dispatch('vanguard:sw-ready', { detail: { registration: ambiente.registro } });

    assert.equal(controle.elemento.hidden, false);
    assert.equal(controle.elemento.textContent, 'ATUALIZAÇÃO PRONTA');

    ambiente.confirmacao = false;
    controle.elemento.click();
    assert.equal(ambiente.mensagens.length, 0);
    assert.equal(controle.elemento.disabled, false);

    ambiente.confirmacao = true;
    controle.elemento.click();
    assert.deepEqual(ambiente.mensagens, [{ type: 'SKIP_WAITING' }]);
    assert.equal(controle.elemento.disabled, true);
    assert.equal(controle.elemento.textContent, 'ATUALIZANDO…');

    const controllerChange = ambiente.eventosServiceWorker.get('controllerchange');
    for (const callback of controllerChange || []) callback();
    assert.equal(ambiente.recarregamentos, 1);

    const timerVerificacao = ambiente.timers.find((timer) => timer.delay === 2500);
    assert.ok(timerVerificacao);
    controle.desmontar();
    assert.equal(timerVerificacao.cancelado, true);
    assert.equal(ambiente.eventos.get('vanguard:sw-ready')?.size || 0, 0);
    assert.equal(ambiente.eventosDocumento.get('visibilitychange')?.size || 0, 0);
  } finally {
    ambiente.restaurar();
  }
});
