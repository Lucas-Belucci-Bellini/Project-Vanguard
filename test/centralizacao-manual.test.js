import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarControleCentralizacao, ESTADOS_CENTRALIZACAO } from '../src/core/centralizacao-manual.js';

function criarRelogioFake() {
  let proximoId = 1;
  const agendados = new Map();
  const cancelados = [];
  return {
    definir(callback, atraso) {
      const id = proximoId++;
      agendados.set(id, { callback, atraso });
      return id;
    },
    limpar(id) {
      cancelados.push(id);
      agendados.delete(id);
    },
    executar(id) {
      const tarefa = agendados.get(id);
      if (!tarefa) return false;
      agendados.delete(id);
      tarefa.callback();
      return true;
    },
    primeiroId() {
      return agendados.keys().next().value;
    },
    atraso(id) {
      return agendados.get(id)?.atraso;
    },
    cancelados,
  };
}

test('centralização manual usa janela temporizada e bloqueia reentrada', () => {
  const relogio = criarRelogioFake();
  let callbacks;
  const eventos = [];
  const controle = criarControleCentralizacao({
    solicitar: (opcoes) => { callbacks = opcoes; },
    definirTemporizador: relogio.definir,
    limparTemporizador: relogio.limpar,
    onInicio: () => eventos.push('inicio'),
    onPosition: () => eventos.push('posicao'),
    onError: () => eventos.push('erro'),
    onFim: () => eventos.push('fim'),
  });

  assert.equal(controle.iniciar(), true);
  assert.equal(controle.estado, ESTADOS_CENTRALIZACAO.BUSCANDO);
  assert.deepEqual(eventos, ['inicio']);
  assert.equal(relogio.atraso(relogio.primeiroId()), 21_000);
  assert.equal(controle.iniciar(), false);

  callbacks.onPosition({ lat: -23.5, lon: -46.6 });
  callbacks.onError(new Error('teste'));
  assert.deepEqual(eventos, ['inicio', 'posicao', 'erro']);

  assert.equal(relogio.executar(relogio.primeiroId()), true);
  assert.equal(controle.estado, ESTADOS_CENTRALIZACAO.LIVRE);
  assert.deepEqual(eventos, ['inicio', 'posicao', 'erro', 'fim']);
});

test('desmontagem cancela o timer e ignora callbacks tardios', () => {
  const relogio = criarRelogioFake();
  let callbacks;
  const eventos = [];
  const controle = criarControleCentralizacao({
    solicitar: (opcoes) => { callbacks = opcoes; },
    definirTemporizador: relogio.definir,
    limparTemporizador: relogio.limpar,
    onInicio: () => eventos.push('inicio'),
    onPosition: () => eventos.push('posicao'),
    onError: () => eventos.push('erro'),
    onFim: () => eventos.push('fim'),
  });

  controle.iniciar();
  const timerId = relogio.primeiroId();
  controle.desmontar();

  assert.equal(controle.estado, ESTADOS_CENTRALIZACAO.ENCERRADA);
  assert.deepEqual(relogio.cancelados, [timerId]);
  callbacks.onPosition({ lat: -23.5, lon: -46.6 });
  callbacks.onError(new Error('tarde demais'));
  assert.deepEqual(eventos, ['inicio']);
  assert.equal(controle.iniciar(), false);
  assert.equal(relogio.executar(timerId), false);
});

test('cancelamento manual libera a janela sem disparar finalização', () => {
  const relogio = criarRelogioFake();
  const eventos = [];
  const controle = criarControleCentralizacao({
    solicitar: () => {},
    definirTemporizador: relogio.definir,
    limparTemporizador: relogio.limpar,
    onInicio: () => eventos.push('inicio'),
    onFim: () => eventos.push('fim'),
  });

  controle.iniciar();
  assert.equal(controle.cancelar(), true);
  assert.equal(controle.estado, ESTADOS_CENTRALIZACAO.LIVRE);
  assert.deepEqual(eventos, ['inicio']);
  assert.equal(controle.cancelar(), false);
  assert.equal(controle.iniciar(), true);
});
