import test from 'node:test';
import assert from 'node:assert/strict';

import {
  criarGravadorDeTrilha,
  deveRegistrar,
  DISTANCIA_MINIMA_M,
  INTERVALO_MAXIMO_MS,
  LIMITE_ESPELHO_LOCAL,
  RECUSA,
} from '../src/core/trilha-gravador.js';

const CHAVES = { TRILHA: 'trilha', ROTA_ATIVA: 'rotaAtiva', ROTA_PAUSADA: 'rotaPausada' };
const T0 = 1_700_000_000_000;

/** Estado falso em memória, com a mesma assinatura de `core/estado.js`. */
function estadoFalso(inicial = {}) {
  const dados = { ...inicial };
  const escritas = [];
  return {
    get: (chave, padrao = null) => (chave in dados ? dados[chave] : padrao),
    set: (chave, valor) => { dados[chave] = valor; escritas.push(chave); },
    dados,
    escritas,
  };
}

/** Ponto a `metros` ao norte da origem, `segundos` depois. */
const ponto = (metros, segundos, extras = {}) => ({
  lat: -23.3103 + metros / 111_320,
  lon: -51.1628,
  timestamp: T0 + segundos * 1000,
  accuracy: 5,
  ...extras,
});

const gravando = (extras = {}) => estadoFalso({ rotaAtiva: true, rotaPausada: false, ...extras });

test('sem anterior, o primeiro ponto sempre entra', () => {
  assert.equal(deveRegistrar(null, ponto(0, 0)), true);
});

test('o portão abre por distância 3D, não pela horizontal', () => {
  // Escada de ~45°: 1,5 m no plano e 1,5 m de subida. No plano não alcança os
  // 2 m; com o desnível, alcança (hipotenusa de 2,12 m). Era assim que uma
  // caminhada real virava "quase no mesmo lugar".
  const base = { lat: -23.3103, lon: -51.1628, altitude: 700, timestamp: T0 };
  const escada = { lat: -23.3103 + 1.5 / 111_320, lon: -51.1628, altitude: 701.5, timestamp: T0 + 4000 };
  assert.equal(deveRegistrar(base, escada), true);
  // E a prova de que foi o desnível que abriu: sem ele, o mesmo par é recusado.
  assert.equal(deveRegistrar({ ...base, altitude: null }, { ...escada, altitude: null }), false);
});

test('o portão também abre pelo tempo, para o traçado não ter buraco parado', () => {
  const parado = ponto(0, 0);
  assert.equal(deveRegistrar(parado, ponto(0.2, 5)), false);
  assert.equal(deveRegistrar(parado, ponto(0.2, INTERVALO_MAXIMO_MS / 1000)), true);
});

test('rota parada recusa com motivo — nunca em silêncio', () => {
  const g = criarGravadorDeTrilha({ estado: estadoFalso(), chaves: CHAVES });
  const r = g.registrar(ponto(0, 0));
  assert.equal(r.gravado, false);
  assert.equal(r.motivo, RECUSA.ROTA_PARADA);
  assert.equal(g.total(), 0);
});

test('rota pausada recusa com motivo próprio, distinto de parada', () => {
  const g = criarGravadorDeTrilha({ estado: gravando({ rotaPausada: true }), chaves: CHAVES });
  assert.equal(g.registrar(ponto(0, 0)).motivo, RECUSA.ROTA_PAUSADA);
});

test('gravando, o ponto entra e é persistido na mesma chave de sempre', () => {
  const estado = gravando();
  const g = criarGravadorDeTrilha({ estado, chaves: CHAVES });
  assert.equal(g.registrar(ponto(0, 0)).gravado, true);
  assert.equal(g.registrar(ponto(DISTANCIA_MINIMA_M + 1, 5)).gravado, true);
  assert.equal(estado.dados.trilha.length, 2);
  assert.equal(g.total(), 2);
});

test('ponto perto demais e cedo demais é recusado, com motivo', () => {
  const g = criarGravadorDeTrilha({ estado: gravando(), chaves: CHAVES });
  g.registrar(ponto(0, 0));
  assert.equal(g.registrar(ponto(0.3, 1)).motivo, RECUSA.MUITO_PERTO);
  assert.equal(g.total(), 1);
});

test('o modo confirmado viaja junto com o ponto', () => {
  const g = criarGravadorDeTrilha({ estado: gravando(), chaves: CHAVES });
  g.definirModo('veiculo');
  const r = g.registrar(ponto(0, 0));
  assert.equal(r.ponto.modo, 'veiculo');
});

test('o corte da janela local é CONTADO, não silencioso', () => {
  // Este é o defeito que o `.slice(-12000)` da página escondia: a partir de
  // ≈24 km de caminhada os pontos mais antigos sumiam sem contagem e sem aviso.
  const estado = gravando();
  const g = criarGravadorDeTrilha({ estado, chaves: CHAVES, limite: 5 });
  for (let i = 0; i < 8; i += 1) g.registrar(ponto(i * 10, i * 5));
  assert.equal(g.total(), 5, 'a janela local respeita o teto');
  assert.equal(g.saidosDaJanela(), 3, 'e diz quantos pontos saíram dela');
  // O ponto mais antigo que sobrou é o quarto — os três primeiros saíram.
  assert.equal(g.trilha()[0].timestamp, T0 + 3 * 5 * 1000);
});

test('quem está abaixo do teto não vê diferença nenhuma', () => {
  const g = criarGravadorDeTrilha({ estado: gravando(), chaves: CHAVES, limite: 5 });
  for (let i = 0; i < 5; i += 1) g.registrar(ponto(i * 10, i * 5));
  assert.equal(g.saidosDaJanela(), 0);
  assert.equal(g.total(), 5);
});

test('o teto padrão é o mesmo número que a página usava', () => {
  assert.equal(LIMITE_ESPELHO_LOCAL, 12_000);
});

test('parar a rota NÃO apaga a trilha', () => {
  const estado = gravando();
  const g = criarGravadorDeTrilha({ estado, chaves: CHAVES });
  g.registrar(ponto(0, 0));
  g.registrar(ponto(10, 5));
  g.definirRota({ ativa: false });
  assert.equal(g.total(), 2, 'os pontos continuam');
  assert.equal(estado.dados.trilha.length, 2, 'e continuam no armazenamento');
  assert.equal(estado.dados.rotaAtiva, false);
});

test('limpar é a única coisa que apaga, e apaga tudo de uma vez', () => {
  const estado = gravando();
  const g = criarGravadorDeTrilha({ estado, chaves: CHAVES });
  g.registrar(ponto(0, 0));
  g.limpar();
  assert.equal(g.total(), 0);
  assert.equal(estado.dados.rotaAtiva, false);
  assert.equal(estado.dados.rotaPausada, false);
});

test('semear só planta em trilha vazia — não sobrescreve registro existente', () => {
  const g = criarGravadorDeTrilha({ estado: gravando(), chaves: CHAVES });
  assert.equal(g.semear(ponto(0, 0)), true);
  assert.equal(g.semear(ponto(999, 99)), false, 'a segunda semeadura é recusada');
  assert.equal(g.total(), 1);
});

test('pausar e retomar não destrói a distância já registrada', () => {
  const g = criarGravadorDeTrilha({ estado: gravando(), chaves: CHAVES });
  g.registrar(ponto(0, 0));
  g.registrar(ponto(50, 20));
  g.definirRota({ ativa: true, pausada: true });
  g.registrar(ponto(100, 40));
  assert.equal(g.total(), 2, 'pausado não grava');
  g.definirRota({ ativa: true, pausada: false });
  g.registrar(ponto(150, 60));
  assert.equal(g.total(), 3, 'e o que havia antes continua lá');
});

test('pausada só vale com rota ativa — estado impossível não é guardado', () => {
  const estado = estadoFalso();
  const g = criarGravadorDeTrilha({ estado, chaves: CHAVES });
  g.definirRota({ ativa: false, pausada: true });
  assert.equal(g.rota().rotaPausada, false);
  assert.equal(estado.dados.rotaPausada, false);
});

test('substituir troca a janela e zera a contagem de corte', () => {
  const g = criarGravadorDeTrilha({ estado: gravando(), chaves: CHAVES, limite: 2 });
  for (let i = 0; i < 5; i += 1) g.registrar(ponto(i * 10, i * 5));
  assert.ok(g.saidosDaJanela() > 0);
  g.substituir([ponto(0, 0), ponto(10, 5), ponto(20, 10)]);
  assert.equal(g.total(), 3);
  assert.equal(g.saidosDaJanela(), 0);
});

test('observador que explode não derruba a gravação', () => {
  const g = criarGravadorDeTrilha({ estado: gravando(), chaves: CHAVES });
  g.observar(() => { throw new Error('tela quebrou ao desenhar'); });
  let visto = 0;
  g.observar(() => { visto += 1; });
  assert.equal(g.registrar(ponto(0, 0)).gravado, true);
  assert.equal(visto, 1, 'o segundo observador ainda foi avisado');
});

test('deixar de observar não para a gravação', () => {
  const g = criarGravadorDeTrilha({ estado: gravando(), chaves: CHAVES });
  const parar = g.observar(() => {});
  parar();
  assert.equal(g.observadores(), 0);
  assert.equal(g.registrar(ponto(0, 0)).gravado, true, 'sem plateia, continua gravando');
});

test('o gravador nasce do que já estava guardado — recarregar não recomeça', () => {
  const estado = estadoFalso({ trilha: [ponto(0, 0), ponto(10, 5)], rotaAtiva: true, rotaPausada: false });
  const g = criarGravadorDeTrilha({ estado, chaves: CHAVES });
  assert.equal(g.total(), 2);
  assert.equal(g.rota().rotaAtiva, true);
  assert.equal(g.ultimo().timestamp, T0 + 5000);
});
