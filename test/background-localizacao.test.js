import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarControleBackground, ESTADOS_BACKGROUND } from '../src/core/background-localizacao.js';

function pluginFake() {
  let callbackAtual = null;
  let starts = 0;
  let stops = 0;
  return {
    start: async (_opcoes, callback) => {
      starts += 1;
      callbackAtual = callback;
    },
    stop: async () => {
      stops += 1;
      callbackAtual = null;
    },
    emitir(leitura, erro) {
      callbackAtual?.(leitura, erro);
    },
    iniciarContagem: () => starts,
    pararContagem: () => stops,
  };
}

const capacitorFake = { isNativePlatform: () => true };

function posicaoFake(overrides = {}) {
  return {
    latitude: -23.5505,
    longitude: -46.6333,
    accuracy: 8,
    time: 1_700_000_000_000,
    ...overrides,
  };
}

test('background: inicia uma sessão e normaliza a posição nativa', async () => {
  const plugin = pluginFake();
  const estados = [];
  const posicoes = [];
  const controle = criarControleBackground({
    plugin,
    capacitorApi: capacitorFake,
    onState: (estado) => estados.push(estado.status),
    onPosition: (posicao) => posicoes.push(posicao),
  });

  assert.equal(await controle.iniciar(), true);
  plugin.emitir(posicaoFake({ bearing: 125, speed: 1.5, simulated: true }));

  assert.equal(controle.estaAtivo(), true);
  assert.equal(posicoes[0].lat, -23.5505);
  assert.equal(posicoes[0].heading, 125);
  assert.equal(posicoes[0].simulated, true);
  assert.deepEqual(estados, [ESTADOS_BACKGROUND.STARTING, ESTADOS_BACKGROUND.ACTIVE, ESTADOS_BACKGROUND.ACTIVE]);
  assert.equal(plugin.iniciarContagem(), 1);
});

test('background: bloqueia reentrada enquanto a sessão está ativa', async () => {
  const plugin = pluginFake();
  const controle = criarControleBackground({ plugin, capacitorApi: capacitorFake });

  assert.equal(await controle.iniciar(), true);
  assert.equal(await controle.iniciar(), false);
  assert.equal(plugin.iniciarContagem(), 1);
});

test('background: ignora callback tardio depois do stop', async () => {
  const plugin = pluginFake();
  const posicoes = [];
  const controle = criarControleBackground({ plugin, capacitorApi: capacitorFake, onPosition: (posicao) => posicoes.push(posicao) });

  await controle.iniciar();
  plugin.emitir(posicaoFake());
  await controle.parar();
  plugin.emitir(posicaoFake({ latitude: -22.9 }));

  assert.equal(posicoes.length, 1);
  assert.equal(controle.estado(), ESTADOS_BACKGROUND.STOPPED);
  assert.equal(plugin.pararContagem(), 1);
});

test('background: erro do plugin vira estado observável sem posição falsa', async () => {
  const plugin = pluginFake();
  const estados = [];
  const erros = [];
  const controle = criarControleBackground({
    plugin,
    capacitorApi: capacitorFake,
    onState: (estado) => estados.push(estado),
    onError: (erro) => erros.push(erro),
  });

  await controle.iniciar();
  const erro = { code: 'NOT_AUTHORIZED', message: 'Permissão recusada' };
  plugin.emitir(null, erro);

  assert.equal(controle.estado(), ESTADOS_BACKGROUND.ERROR);
  assert.equal(controle.estaAtivo(), false);
  assert.equal(erros[0], erro);
  assert.equal(estados.at(-1).codigo, 'NOT_AUTHORIZED');
});

test('background: desmontagem invalida callbacks e solicita stop idempotente', async () => {
  const plugin = pluginFake();
  const posicoes = [];
  const estados = [];
  const controle = criarControleBackground({ plugin, capacitorApi: capacitorFake, onPosition: (posicao) => posicoes.push(posicao), onState: (estado) => estados.push(estado.status) });

  await controle.iniciar();
  controle.desmontar();
  plugin.emitir(posicaoFake());
  controle.desmontar();

  assert.equal(posicoes.length, 0);
  assert.equal(plugin.pararContagem(), 1);
  assert.equal(estados.at(-1), ESTADOS_BACKGROUND.ACTIVE);
});

test('background: navegador não nativo fica indisponível sem carregar plugin', async () => {
  let carregou = false;
  const estados = [];
  const controle = criarControleBackground({
    capacitorApi: { isNativePlatform: () => false },
    pluginLoader: async () => { carregou = true; return pluginFake(); },
    onState: (estado) => estados.push(estado),
  });

  assert.equal(await controle.iniciar(), false);
  assert.equal(carregou, false);
  assert.equal(controle.estado(), ESTADOS_BACKGROUND.UNAVAILABLE);
  assert.equal(estados[0].motivo, 'NATIVE_ONLY');
});
