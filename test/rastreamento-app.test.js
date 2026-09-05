import test from 'node:test';
import assert from 'node:assert/strict';

import { ESTADOS_BACKGROUND } from '../src/core/background-localizacao.js';
import { ESPELHO_V3, criarRastreamentoDoAplicativo } from '../src/core/rastreamento-app.js';
import { persistenciaEmMemoria } from '../src/core/dados/track-store.js';

const CHAVES = { TRILHA: 'trilha', ROTA_ATIVA: 'rotaAtiva', ROTA_PAUSADA: 'rotaPausada', LOCAL: 'local' };
const T0 = 1_700_000_000_000;

const ponto = (metros, segundos) => ({
  lat: -23.3103 + metros / 111_320,
  lon: -51.1628,
  timestamp: T0 + segundos * 1000,
  accuracy: 5,
});

function estadoFalso(inicial = {}) {
  const dados = { ...inicial };
  return { get: (k, p = null) => (k in dados ? dados[k] : p), set: (k, v) => { dados[k] = v; }, dados };
}

/** Watcher falso com a mesma superfície de `iniciarAcompanhamento`. */
function acompanhamentoFalso() {
  const registro = { criados: 0, cancelados: 0, modos: [], pausas: [], onPosition: null, onError: null };
  const acompanhar = ({ mode, onPosition, onError }) => {
    registro.criados += 1;
    registro.modos.push(mode);
    registro.onPosition = onPosition;
    registro.onError = onError;
    const parar = () => { registro.cancelados += 1; };
    parar.setMode = (m) => registro.modos.push(m);
    parar.setPaused = (p) => registro.pausas.push(p);
    return parar;
  };
  return { acompanhar, registro };
}

/** Controle de segundo plano falso, no formato de `background-localizacao.js`. */
function backgroundFalso({ nativo = true } = {}) {
  const registro = { iniciou: 0, parou: 0, onState: null, onPosition: null };
  const criar = ({ onState, onPosition }) => {
    registro.onState = onState;
    registro.onPosition = onPosition;
    return {
      podeIniciar: () => nativo,
      iniciar: async () => { registro.iniciou += 1; onState({ status: ESTADOS_BACKGROUND.ACTIVE }); return true; },
      parar: async () => { registro.parou += 1; onState({ status: ESTADOS_BACKGROUND.STOPPED }); return true; },
      desmontar: () => {},
      estado: () => ESTADOS_BACKGROUND.IDLE,
      estaAtivo: () => false,
    };
  };
  return { criar, registro };
}

function montar({ inicial = {}, nativo = true, espelho = null } = {}) {
  const gps = acompanhamentoFalso();
  const bg = backgroundFalso({ nativo });
  const estado = estadoFalso(inicial);
  const app = criarRastreamentoDoAplicativo({
    estado,
    chaves: CHAVES,
    acompanhar: gps.acompanhar,
    criarBackground: bg.criar,
    espelho,
  });
  return { app, gps, bg, estado };
}

test('sem plateia e sem rota, nenhum GPS é aberto', () => {
  const { app, gps } = montar();
  assert.equal(gps.registro.criados, 0);
  assert.equal(app.ativo(), false);
});

test('a primeira tela que observa acende o watcher', () => {
  const { app, gps } = montar();
  app.observar(() => {});
  assert.equal(gps.registro.criados, 1);
  assert.equal(app.ativo(), true);
});

test('duas telas observando compartilham UM watcher', () => {
  const { app, gps } = montar();
  app.observar(() => {});
  app.observar(() => {});
  assert.equal(gps.registro.criados, 1, 'nunca dois watchers de GPS ao mesmo tempo');
});

test('DEFEITO CORRIGIDO: sair da tela NÃO encerra a gravação', () => {
  // Este é o teste que existe por causa do defeito medido na 1.6.0: o
  // `desmontar()` de `mapa.js` chamava `pararGps()`, então ir para `#/bussola`
  // no meio de uma caminhada parava a trilha em silêncio.
  const { app, gps } = montar({ inicial: { rotaAtiva: true } });
  const inscricao = app.observar(() => {});
  gps.registro.onPosition(ponto(0, 0));
  assert.equal(app.gravador.total(), 1);

  inscricao.parar(); // a pessoa foi para a bússola

  assert.equal(app.ativo(), true, 'o GPS continua ligado');
  assert.equal(gps.registro.cancelados, 0, 'o watcher não foi cancelado');
  gps.registro.onPosition(ponto(50, 20));
  gps.registro.onPosition(ponto(100, 40));
  assert.equal(app.gravador.total(), 3, 'e a trilha continuou crescendo sem ninguém olhando');
});

test('sem plateia e sem rota ativa, o watcher desliga — não é para gastar bateria à toa', () => {
  const { app, gps } = montar();
  const inscricao = app.observar(() => {});
  inscricao.parar();
  assert.equal(app.ativo(), false);
  assert.equal(gps.registro.cancelados, 1);
});

test('ligar a rota acende o GPS mesmo sem tela na frente', () => {
  const { app, gps } = montar();
  assert.equal(app.ativo(), false);
  app.definirRota({ ativa: true });
  assert.equal(app.ativo(), true);
  assert.equal(app.modo(), 'trilha');
});

test('parar a rota sem plateia desliga o GPS, sem apagar a trilha', () => {
  const { app, gps } = montar({ inicial: { rotaAtiva: true } });
  app.definirRota({ ativa: true });
  gps.registro.onPosition(ponto(0, 0));
  app.definirRota({ ativa: false });
  assert.equal(app.ativo(), false);
  assert.equal(app.gravador.total(), 1, 'parar não é apagar');
  assert.equal(app.modo(), 'cidade');
});

test('a tela oculta pausa o primeiro plano; a tela morta não', () => {
  const { app, gps } = montar({ inicial: { rotaAtiva: true } });
  const inscricao = app.observar(() => {});
  inscricao.visibilidade(true);
  assert.equal(app.pausado(), true, 'aba escondida com tela viva: pausa');

  inscricao.parar();
  assert.equal(app.pausado(), false, 'sem tela viva, "oculto" não significa nada');
  gps.registro.onPosition(ponto(0, 0));
  assert.equal(app.gravador.total(), 1, 'e o ponto entra');
});

test('com duas telas, basta uma visível para não pausar', () => {
  const { app } = montar();
  const a = app.observar(() => {});
  const b = app.observar(() => {});
  a.visibilidade(true);
  assert.equal(app.pausado(), false);
  b.visibilidade(true);
  assert.equal(app.pausado(), true);
});

test('segundo plano ativo pausa o primeiro plano — um gravador, não dois', () => {
  const { app, bg } = montar();
  app.observar(() => {});
  assert.equal(app.pausado(), false);
  bg.registro.onState({ status: ESTADOS_BACKGROUND.ACTIVE });
  assert.equal(app.pausado(), true);
  bg.registro.onState({ status: ESTADOS_BACKGROUND.STOPPED });
  assert.equal(app.pausado(), false);
});

test('a posição do segundo plano entra na MESMA trilha', () => {
  const { app, bg } = montar({ inicial: { rotaAtiva: true } });
  app.observar(() => {});
  bg.registro.onPosition(ponto(0, 0));
  bg.registro.onPosition(ponto(50, 20));
  assert.equal(app.gravador.total(), 2);
});

test('quem observa recebe posição, erro e estado do GPS', () => {
  const { app, gps } = montar({ inicial: { rotaAtiva: true } });
  const vistos = [];
  app.observar((e) => vistos.push(e.tipo));
  gps.registro.onPosition(ponto(0, 0));
  gps.registro.onError({ code: 1 });
  assert.deepEqual(vistos, ['POSICAO', 'ERRO']);
});

test('a tela recebe TODO fixo, inclusive o que não entrou na trilha', () => {
  // O mapa precisa seguir a pessoa mesmo quando o ponto é perto demais para
  // ser gravado — senão o mapa "trava" enquanto o GPS está funcionando.
  const { app, gps } = montar({ inicial: { rotaAtiva: true } });
  const resultados = [];
  app.observar((e) => { if (e.tipo === 'POSICAO') resultados.push(e.resultado.gravado); });
  gps.registro.onPosition(ponto(0, 0));
  gps.registro.onPosition(ponto(0.2, 1));
  assert.deepEqual(resultados, [true, false]);
  assert.equal(app.gravador.total(), 1);
});

test('observador que explode não derruba a gravação nem os outros', () => {
  const { app, gps } = montar({ inicial: { rotaAtiva: true } });
  app.observar(() => { throw new Error('tela quebrou'); });
  let outro = 0;
  app.observar(() => { outro += 1; });
  gps.registro.onPosition(ponto(0, 0));
  assert.equal(app.gravador.total(), 1);
  assert.equal(outro, 1);
});

test('o espelho da V3 é declarado, nunca suposto', () => {
  const { app } = montar();
  assert.equal(app.espelho().tipo, ESPELHO_V3.DESLIGADO);
  assert.equal(app.espelho().ligado, false);
});

test('com espelho ligado, o fixo vai para os DOIS destinos', async () => {
  const { app, gps } = montar({
    inicial: { rotaAtiva: true },
    espelho: { persistencia: persistenciaEmMemoria(), tipo: ESPELHO_V3.MEMORIA },
  });
  assert.equal(app.espelho().ligado, true);
  await app.iniciarEspelhoV3({ nome: 'teste' });
  app.observar(() => {});
  gps.registro.onPosition(ponto(0, 0));
  gps.registro.onPosition(ponto(50, 20));
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(app.gravador.total(), 2, 'a trilha v1 continua sendo escrita');
  const sessao = await app.sessaoEspelho();
  assert.ok(sessao?.pontos >= 1, 'e o registro completo da V3 também');
});

test('o modo do watcher acompanha a rota', () => {
  const { app, gps } = montar();
  app.observar(() => {});
  app.definirRota({ ativa: true });
  assert.ok(gps.registro.modos.includes('trilha'));
  app.definirRota({ ativa: false });
  assert.equal(app.modo(), 'cidade');
});

test('podeIniciar do segundo plano é a capacidade real da plataforma', () => {
  assert.equal(montar({ nativo: true }).app.background.podeIniciar(), true);
  assert.equal(montar({ nativo: false }).app.background.podeIniciar(), false);
});

test('parar a rota também encerra o segundo plano', async () => {
  const { app, bg } = montar();
  app.definirRota({ ativa: true });
  await app.background.iniciar();
  assert.equal(bg.registro.iniciou, 1);
  app.definirRota({ ativa: false });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(bg.registro.parou, 1);
});

test('o singleton nasce do que já estava guardado', () => {
  const { app } = montar({ inicial: { rotaAtiva: true, trilha: [ponto(0, 0)] } });
  assert.equal(app.gravador.total(), 1);
  assert.equal(app.modo(), 'trilha');
});
