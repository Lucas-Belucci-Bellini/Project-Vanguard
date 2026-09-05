import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ESTADO_SESSAO,
  RESULTADO_PONTO,
  VERSAO_TRILHA,
  criarTrackStore,
  persistenciaEmMemoria,
} from '../src/core/dados/track-store.js';
import { QUALIDADE_PONTO } from '../src/engine/trilha-ponto.js';

const T0 = 1_700_000_000_000;
/** Caminhada a ~1,4 m/s: 14 m a cada 10 s. */
const passo = (i, extra = {}) => ({
  lat: -23.3103 + (i * 14) / 111_320,
  lon: -51.1628,
  timestamp: T0 + i * 10_000,
  accuracy: 6,
  altitude: 550 + i * 0.1,
  speed: 1.4,
  provider: 'GPS',
  ...extra,
});

function novoStore() {
  const persistencia = persistenciaEmMemoria();
  let agora = T0;
  const store = criarTrackStore({ persistencia, relogio: () => agora });
  return { store, persistencia, avancar: (ms) => { agora += ms; } };
}

test('acrescentar não reescreve: 5 000 pontos custam 5 000 escritas de 1 ponto', async () => {
  // Este é o teste que separa a V3 da V1. Antes, cada ponto reescrevia o array
  // inteiro — 12 000 pontos eram 1,53 MB de JSON por fixo aceito. Aqui o custo
  // do 5 000º ponto é o mesmo do primeiro.
  const { store, persistencia } = novoStore();
  await store.iniciar();
  for (let i = 0; i < 5000; i += 1) await store.registrar(passo(i));

  const { escritasDePonto, bytesReescritos } = persistencia.__metricas();
  assert.equal(escritasDePonto, 5000, 'uma escrita por ponto, nunca N por ponto');
  assert.equal(await store.contar(), 5000);

  // Se reescrevesse o array, os bytes seriam da ordem de N²/2 — dezenas de MB.
  const bytesPorPonto = bytesReescritos / 5000;
  assert.ok(bytesPorPonto < 400, `${bytesPorPonto.toFixed(0)} bytes por ponto: houve reescrita`);
});

test('NÃO existe teto: 20 000 pontos são 20 000 pontos', async () => {
  // O `.slice(-12000)` da 1.6.0 apagava os mais antigos em silêncio a partir de
  // ~24 km de caminhada. O primeiro ponto tem de continuar lá.
  const { store } = novoStore();
  await store.iniciar();
  for (let i = 0; i < 20_000; i += 1) await store.registrar(passo(i));

  assert.equal(await store.contar(), 20_000);
  const todos = await store.pontos();
  assert.equal(todos[0].seq, 0, 'o primeiro ponto da caminhada continua gravado');
  assert.equal(todos[0].timestamp, T0);
  assert.equal(todos.at(-1).seq, 19_999);
});

test('ponto suspeito é gravado COM a marca; só o que não é posição fica de fora', async () => {
  const { store } = novoStore();
  await store.iniciar();
  await store.registrar(passo(0));

  const ruim = await store.registrar(passo(1, { accuracy: 300 }));
  assert.equal(ruim.resultado, RESULTADO_PONTO.GRAVADO);
  assert.equal(ruim.qualidade, QUALIDADE_PONTO.BAIXA_PRECISAO);

  const semCoordenada = await store.registrar({ lat: null, lon: null, timestamp: T0 + 30_000 });
  assert.equal(semCoordenada.resultado, RESULTADO_PONTO.RECUSADO);
  assert.equal(semCoordenada.qualidade, QUALIDADE_PONTO.INVALIDO);

  const pontos = await store.pontos();
  assert.equal(pontos.length, 2, 'o de baixa precisão entrou; o sem coordenada não');
  assert.equal(pontos[1].qualidade, QUALIDADE_PONTO.BAIXA_PRECISAO);
  assert.match(pontos[1].motivoQualidade, /Raio de 300 m/);

  const sessao = await store.sessao();
  assert.equal(sessao.porQualidade[QUALIDADE_PONTO.BAIXA_PRECISAO], 1);
});

test('perda de sinal é gravada como VÃO no ponto que a fecha', async () => {
  const { store } = novoStore();
  await store.iniciar();
  await store.registrar(passo(0));

  // Dez minutos e 3 km depois: ninguém observou o meio do caminho.
  const depois = await store.registrar({
    lat: -23.3103 + 3000 / 111_320, lon: -51.1628, timestamp: T0 + 600_000, accuracy: 6,
  });
  assert.equal(depois.resultado, RESULTADO_PONTO.GRAVADO);
  assert.ok(depois.vao, 'o vão precisa vir no resultado');

  const pontos = await store.pontos();
  assert.ok(pontos[1].vao, 'e precisa ficar gravado no ponto');
  assert.equal(pontos[1].vao.dtMs, 600_000);
  assert.match(pontos[1].vao.motivo, /sem ponto registrado/);
  assert.equal((await store.sessao()).vaos, 1);
});

test('pausar não destrói nada: 10 pontos, pausa, mais 5, total 15', async () => {
  // O §25 em forma de teste: retomar NUNCA reinicia.
  const { store } = novoStore();
  await store.iniciar();
  for (let i = 0; i < 10; i += 1) await store.registrar(passo(i));

  await store.pausar();
  const durantePausa = await store.registrar(passo(10));
  assert.equal(durantePausa.resultado, RESULTADO_PONTO.SEM_SESSAO, 'pausado não grava');
  assert.equal(await store.contar(), 10, 'e não apaga o que já havia');

  await store.retomar();
  for (let i = 11; i < 16; i += 1) await store.registrar(passo(i));

  assert.equal(await store.contar(), 15);
  const pontos = await store.pontos();
  assert.equal(pontos[0].seq, 0, 'o primeiro ponto antes da pausa continua lá');
  assert.equal(pontos.at(-1).seq, 14);
});

test('o aplicativo pode morrer no meio: recuperar devolve a sessão com os pontos', async () => {
  // Recuperação (§12): sistema matou o app, aparelho reiniciou, ou a pessoa
  // trocou de tela. A trilha não recomeça do zero.
  const persistencia = persistenciaEmMemoria();
  let agora = T0;

  const antes = criarTrackStore({ persistencia, relogio: () => agora });
  const sessao = await antes.iniciar({ nome: 'Peregrinação' });
  for (let i = 0; i < 40; i += 1) { await antes.registrar(passo(i)); agora += 10_000; }
  // Nenhum encerrar(): é exatamente o caso de morte inesperada.

  const depois = criarTrackStore({ persistencia, relogio: () => agora });
  assert.equal(await depois.sessao(), null, 'store novo nasce sem sessão em memória');

  const recuperada = await depois.recuperar();
  assert.ok(recuperada, 'a sessão aberta tem de ser encontrada');
  assert.equal(recuperada.id, sessao.id);
  assert.equal(recuperada.nome, 'Peregrinação');
  assert.equal(recuperada.estado, ESTADO_SESSAO.GRAVANDO);
  assert.equal(await depois.contar(recuperada.id), 40);

  // E a gravação continua de onde parou, sem colidir com o que já existe.
  agora += 10_000;
  const seguinte = await depois.registrar(passo(40));
  assert.equal(seguinte.resultado, RESULTADO_PONTO.GRAVADO);
  assert.equal(seguinte.seq, 40, 'a sequência continua, não reinicia');
  assert.equal(await depois.contar(recuperada.id), 41);
});

test('encerrar guarda a sessão no histórico em vez de apagá-la', async () => {
  const { store } = novoStore();
  const aberta = await store.iniciar({ nome: 'Dia 1' });
  for (let i = 0; i < 5; i += 1) await store.registrar(passo(i));
  const encerrada = await store.encerrar();

  assert.equal(encerrada.estado, ESTADO_SESSAO.ENCERRADA);
  assert.equal(await store.sessao(), null);
  assert.equal(await store.contar(aberta.id), 5, 'os pontos continuam depois de encerrar');

  const historico = await store.sessoes();
  assert.equal(historico.length, 1);
  assert.equal(historico[0].nome, 'Dia 1');

  // Uma sessão nova não toca na anterior.
  const nova = await store.iniciar({ nome: 'Dia 2' });
  await store.registrar(passo(0));
  assert.equal((await store.sessoes()).length, 2);
  assert.equal(await store.contar(aberta.id), 5, 'Dia 1 intacto');
  assert.equal(await store.contar(nova.id), 1);
});

test('a sessão declara esquema e versão — migração futura não vai adivinhar', async () => {
  const { store } = novoStore();
  const sessao = await store.iniciar();
  assert.equal(sessao.esquema, 'vanguard-trilha');
  assert.equal(sessao.versao, VERSAO_TRILHA);
  assert.ok(VERSAO_TRILHA >= 2, 'v1 era o array cru em localStorage, sem versão');
});

test('sem sessão aberta, o ponto não some em silêncio: o motivo é dito', async () => {
  const { store } = novoStore();
  const r = await store.registrar(passo(0));
  assert.equal(r.resultado, RESULTADO_PONTO.SEM_SESSAO);
  assert.match(r.motivo, /Nenhuma sessão/);
});
