import test from 'node:test';
import assert from 'node:assert/strict';

import { criarTrackStore, persistenciaEmMemoria } from '../src/core/dados/track-store.js';
import {
  ESTADO_RASTREAMENTO,
  FONTE_POSICAO,
  SILENCIO_ATE_SEM_SINAL_MS,
  criarRastreamento,
} from '../src/core/rastreamento.js';

const T0 = 1_700_000_000_000;
const p = (i) => ({ lat: -23.3103 + (i * 14) / 111_320, lon: -51.1628, timestamp: T0 + i * 10_000, accuracy: 6 });

/** Provedor falso: guarda os callbacks e conta quantas vezes foi cancelado. */
function provedorFalso() {
  const estado = { ativo: false, cancelamentos: 0, onPosition: null, onError: null, modos: [] };
  const provedor = ({ onPosition, onError, modo }) => {
    estado.ativo = true;
    estado.onPosition = onPosition;
    estado.onError = onError;
    estado.modos.push(modo);
    return () => { estado.ativo = false; estado.cancelamentos += 1; };
  };
  return { provedor, estado };
}

function backgroundFalso() {
  const estado = { inicios: 0, paradas: 0, ativo: false };
  return {
    estado,
    controle: {
      iniciar: async () => { estado.inicios += 1; estado.ativo = true; return true; },
      parar: async () => { estado.paradas += 1; estado.ativo = false; },
    },
  };
}

function montar() {
  const persistencia = persistenciaEmMemoria();
  let agora = T0;
  const store = criarTrackStore({ persistencia, relogio: () => agora });
  const { provedor, estado: fg } = provedorFalso();
  const { controle, estado: bg } = backgroundFalso();
  const servico = criarRastreamento({
    store,
    provedorPrimeiroPlano: provedor,
    controleSegundoPlano: controle,
    relogio: () => agora,
  });
  return { servico, store, persistencia, fg, bg, avancar: (ms) => { agora += ms; } };
}

test('deixar de observar NÃO para a gravação — é o defeito da 1.6.0 em teste', async () => {
  // Antes, o gravador era da página do mapa: `desmontar()` derrubava o watcher
  // e o background. Sair de #/mapa para #/bussola encerrava o rastreamento sem
  // aviso, e a trilha parava de crescer com a pessoa ainda andando.
  const { servico, store, fg } = montar();
  await servico.iniciar();

  const vistos = [];
  const pararDeObservar = servico.observar((e) => vistos.push(e.tipo));

  fg.onPosition(p(0));
  await new Promise(setImmediate);
  assert.equal(await store.contar(), 1);

  // A "página" é desmontada: ela só deixa de observar.
  pararDeObservar();
  assert.equal(servico.observadores(), 0);

  fg.onPosition(p(1));
  fg.onPosition(p(2));
  await new Promise(setImmediate);

  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.GRAVANDO, 'continua gravando sem ninguém olhando');
  assert.equal(fg.ativo, true, 'o watcher não foi cancelado');
  assert.equal(await store.contar(), 3, 'e os pontos continuaram entrando');
});

test('só parar() encerra, e ele é decisão explícita', async () => {
  const { servico, store, fg, bg } = montar();
  await servico.iniciar();
  fg.onPosition(p(0));
  await new Promise(setImmediate);

  const fim = await servico.parar();
  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.PARADO);
  assert.equal(fg.ativo, false, 'aí sim o watcher é cancelado');
  assert.equal(bg.paradas, 1);
  assert.ok(fim.sessao, 'a sessão encerrada volta para quem pediu');
  assert.equal(await store.contar(fim.sessao.id), 1, 'e os pontos continuam guardados');
});

test('primeiro e segundo plano alimentam o MESMO gravador', async () => {
  const { servico, store, fg, bg } = montar();
  await servico.iniciar();
  assert.equal(bg.inicios, 1, 'o segundo plano é tentado ao iniciar');

  fg.onPosition(p(0));
  await new Promise(setImmediate);
  // O controle de background entrega pela mesma porta do serviço.
  await servico.observar(() => {}) && null;
  fg.onPosition(p(1));
  await new Promise(setImmediate);

  assert.equal(await store.contar(), 2);
  const situacao = servico.situacao();
  assert.equal(situacao.contadores.porFonte[FONTE_POSICAO.PRIMEIRO_PLANO], 2);
});

test('erro do provedor não joga fora o que já foi gravado', async () => {
  // Perder sinal, ter a permissão revogada por um instante ou o plugin falhar
  // acontecem no meio de uma caminhada. Nenhum deles é motivo para encerrar.
  const { servico, store, fg } = montar();
  await servico.iniciar();
  fg.onPosition(p(0));
  fg.onPosition(p(1));
  await new Promise(setImmediate);

  fg.onError(new Error('POSITION_UNAVAILABLE'));

  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.GRAVANDO);
  assert.equal(await store.contar(), 2, 'os pontos anteriores continuam lá');
  assert.equal(servico.situacao().contadores.erros, 1, 'e o erro é contado, não escondido');

  fg.onPosition(p(2));
  await new Promise(setImmediate);
  assert.equal(await store.contar(), 3, 'a gravação retoma sozinha quando o fixo volta');
});

test('observador que explode não derruba a gravação', async () => {
  const { servico, store, fg } = montar();
  await servico.iniciar();
  servico.observar(() => { throw new Error('a tela quebrou ao desenhar'); });

  fg.onPosition(p(0));
  fg.onPosition(p(1));
  await new Promise(setImmediate);

  assert.equal(await store.contar(), 2, 'quem está andando não perde a trilha porque uma tela falhou');
  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.GRAVANDO);
});

test('pausar solta os sensores e retomar não reinicia a trilha', async () => {
  const { servico, store, fg, bg } = montar();
  await servico.iniciar();
  for (let i = 0; i < 5; i += 1) fg.onPosition(p(i));
  await new Promise(setImmediate);

  await servico.pausar();
  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.PAUSADO);
  assert.equal(fg.ativo, false, 'pausado não consome GPS');
  assert.equal(bg.paradas, 1);

  await servico.retomar();
  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.GRAVANDO);
  assert.equal(fg.ativo, true);
  for (let i = 5; i < 8; i += 1) fg.onPosition(p(i));
  await new Promise(setImmediate);

  assert.equal(await store.contar(), 8, 'os 5 de antes da pausa continuam contando');
});

test('silêncio prolongado vira SEM_SINAL — a tela pode dizer em vez de parecer viva', async () => {
  const { servico, fg, avancar } = montar();
  await servico.iniciar();
  fg.onPosition(p(0));
  await new Promise(setImmediate);

  servico.verificarSilencio();
  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.GRAVANDO, 'fixo recente não é silêncio');

  avancar(SILENCIO_ATE_SEM_SINAL_MS + 1000);
  servico.verificarSilencio();
  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.SEM_SINAL);

  // E o fixo que volta reabilita a gravação sozinho.
  fg.onPosition(p(1));
  await new Promise(setImmediate);
  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.GRAVANDO);
});

test('recuperar volta a sessão aberta e religa os sensores', async () => {
  const persistencia = persistenciaEmMemoria();
  let agora = T0;
  const store = criarTrackStore({ persistencia, relogio: () => agora });
  const { provedor, estado: fg } = provedorFalso();
  const { controle, estado: bg } = backgroundFalso();

  const antes = criarRastreamento({ store, provedorPrimeiroPlano: provedor, controleSegundoPlano: controle, relogio: () => agora });
  await antes.iniciar({ nome: 'Peregrinação' });
  for (let i = 0; i < 12; i += 1) fg.onPosition(p(i));
  await new Promise(setImmediate);
  // Nenhum parar(): o sistema matou o aplicativo.

  const store2 = criarTrackStore({ persistencia, relogio: () => agora });
  const depois = criarRastreamento({ store: store2, provedorPrimeiroPlano: provedor, controleSegundoPlano: controle, relogio: () => agora });
  assert.equal(depois.estado(), ESTADO_RASTREAMENTO.PARADO);

  const sessao = await depois.recuperar();
  assert.ok(sessao);
  assert.equal(sessao.nome, 'Peregrinação');
  assert.equal(depois.estado(), ESTADO_RASTREAMENTO.GRAVANDO);
  assert.equal(fg.ativo, true, 'os sensores voltam a ser ouvidos');
  assert.ok(bg.inicios >= 2);
  assert.equal(await store2.contar(sessao.id), 12, 'com os 12 pontos que já existiam');
});

test('sem sessão anterior, recuperar não inventa uma', async () => {
  const { servico } = montar();
  assert.equal(await servico.recuperar(), null);
  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.PARADO);
});

test('sem provedor de segundo plano o serviço continua gravando em primeiro', async () => {
  // É o caso da web: o §10 manda não fingir que existe background onde a
  // plataforma não dá. O que não pode é a ausência dele parar a gravação.
  const persistencia = persistenciaEmMemoria();
  const store = criarTrackStore({ persistencia, relogio: () => T0 });
  const { provedor, estado: fg } = provedorFalso();
  const servico = criarRastreamento({ store, provedorPrimeiroPlano: provedor, controleSegundoPlano: null, relogio: () => T0 });

  await servico.iniciar();
  fg.onPosition(p(0));
  fg.onPosition(p(1));
  await new Promise(setImmediate);

  assert.equal(servico.estado(), ESTADO_RASTREAMENTO.GRAVANDO);
  assert.equal(await store.contar(), 2);
});
