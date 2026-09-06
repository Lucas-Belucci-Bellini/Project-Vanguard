import test from 'node:test';
import assert from 'node:assert/strict';
import { convergenciaMeridianos } from '../src/engine/mgrs.js';
import { normDeg } from '../src/engine/angles.js';
import { posicaoSolar } from '../src/engine/sol.js';
import {
  LADOS,
  REFERENCIAS_RUMO,
  FONTES_CORRECAO,
  TOLERANCIA_EM_ROTA_DEG,
  calibrarPeloSol,
  cardeal,
  lerBussola,
} from '../src/core/bussola-leitura.js';

const LONDRINA = { lat: -23.3103, lon: -51.1628 };
// Manhã: Sol a leste, alto o bastante para servir de referência.
const MANHA = Date.parse('2026-09-12T13:00:00.000Z');
const NOITE = Date.parse('2026-09-12T04:00:00.000Z');

test('sem correção medida o app não afirma norte verdadeiro nem de grade', () => {
  const leitura = lerBussola({ rumoSensorDeg: 90, posicao: LONDRINA, agora: MANHA });
  assert.equal(leitura.rumoCruDeg, 90);
  assert.equal(leitura.referencia, REFERENCIAS_RUMO.DESCONHECIDA);
  assert.equal(leitura.azimuteVerdadeiroDeg, null);
  assert.equal(leitura.azimuteGradeDeg, null);
  assert.match(leitura.avisos.join(' '), /referência dela \(magnética ou verdadeira\) depende do modelo/);
});

test('com correção a leitura vira azimute verdadeiro e de grade', () => {
  const leitura = lerBussola({ rumoSensorDeg: 100, correcaoSensorDeg: -20, posicao: LONDRINA, agora: MANHA });
  assert.equal(leitura.referencia, REFERENCIAS_RUMO.CORRIGIDA);
  assert.equal(leitura.azimuteVerdadeiroDeg, 80);
  // grade = verdadeiro − convergência, a mesma convenção do motor de tiro.
  const convergencia = convergenciaMeridianos(LONDRINA.lat, LONDRINA.lon);
  assert.equal(leitura.convergenciaDeg, convergencia);
  assert.ok(Math.abs(leitura.azimuteGradeDeg - (80 - convergencia)) < 1e-9);
  assert.equal(leitura.avisos.length, 0);
});

test('o rumo de retorno é o recíproco do rumo atual', () => {
  const leitura = lerBussola({ rumoSensorDeg: 350, correcaoSensorDeg: 0, posicao: LONDRINA, agora: MANHA });
  assert.equal(leitura.azimuteRetornoDeg, 170);
});

test('a calibração pelo Sol mede o quanto somar à leitura crua', () => {
  const sol = posicaoSolar({ ...LONDRINA, instanteMs: MANHA });
  // Aparelho apontado para o Sol lendo 30° a menos do que o azimute real dele.
  const calibracao = calibrarPeloSol({ rumoSensorDeg: sol.azimuteDeg - 30, posicao: LONDRINA, agora: MANHA });
  assert.equal(calibracao.ok, true);
  assert.ok(Math.abs(calibracao.correcaoDeg - 30) < 1e-6);

  // Aplicada, a leitura crua passa a bater com o azimute verdadeiro do Sol.
  const leitura = lerBussola({
    rumoSensorDeg: sol.azimuteDeg - 30,
    correcaoSensorDeg: calibracao.correcaoDeg,
    posicao: LONDRINA,
    agora: MANHA,
  });
  assert.ok(Math.abs(leitura.azimuteVerdadeiroDeg - sol.azimuteDeg) < 1e-6);
});

test('Sol abaixo do horizonte ou a pino não serve de referência', () => {
  const noite = calibrarPeloSol({ rumoSensorDeg: 10, posicao: LONDRINA, agora: NOITE });
  assert.equal(noite.ok, false);
  assert.equal(noite.codigo, 'SOL_BAIXO');

  // Meio-dia no equador em equinócio: Sol quase no zênite.
  const zenite = calibrarPeloSol({ rumoSensorDeg: 10, posicao: { lat: 0, lon: 0 }, agora: Date.parse('2026-03-20T12:00:00Z') });
  assert.equal(zenite.ok, false);
  assert.equal(zenite.codigo, 'SOL_A_PINO');
});

test('calibrar sem rumo ou sem posição é recusado com o motivo', () => {
  assert.equal(calibrarPeloSol({ posicao: LONDRINA, agora: MANHA }).codigo, 'SEM_RUMO');
  assert.equal(calibrarPeloSol({ rumoSensorDeg: 10, posicao: { lat: -23.3, lon: null }, agora: MANHA }).codigo, 'SEM_POSICAO');
});

test('o destino traz azimute, distância e para que lado corrigir', () => {
  // Destino ao norte da posição atual.
  const destino = { lat: LONDRINA.lat + 0.05, lon: LONDRINA.lon, nome: 'Santuário' };
  const leitura = lerBussola({ rumoSensorDeg: 30, correcaoSensorDeg: 0, posicao: LONDRINA, destino, agora: MANHA });
  assert.ok(Math.abs(leitura.destino.azimuteVerdadeiroDeg) < 1 || Math.abs(leitura.destino.azimuteVerdadeiroDeg - 360) < 1);
  assert.ok(leitura.destino.distanciaM > 5000 && leitura.destino.distanciaM < 6000);
  // Apontando para 30° com o destino a 0°: o destino está à esquerda.
  assert.equal(leitura.destino.lado, LADOS.ESQUERDA);
  assert.ok(leitura.destino.desvioDeg < 0);
  assert.equal(leitura.destino.nome, 'Santuário');
  assert.equal(leitura.destino.azimuteRetornoDeg, 180);
});

test('dentro da tolerância o destino é dado como em rota', () => {
  const destino = { lat: LONDRINA.lat + 0.05, lon: LONDRINA.lon };
  const leitura = lerBussola({
    rumoSensorDeg: TOLERANCIA_EM_ROTA_DEG - 1,
    correcaoSensorDeg: 0,
    posicao: LONDRINA,
    destino,
    agora: MANHA,
  });
  assert.equal(leitura.destino.lado, LADOS.EM_ROTA);
});

test('sem correção o destino ainda mostra azimute, mas sem desvio inventado', () => {
  const destino = { lat: LONDRINA.lat + 0.05, lon: LONDRINA.lon };
  const leitura = lerBussola({ rumoSensorDeg: 30, posicao: LONDRINA, destino, agora: MANHA });
  assert.ok(Number.isFinite(leitura.destino.azimuteVerdadeiroDeg));
  assert.equal(leitura.destino.desvioDeg, null);
  assert.equal(leitura.destino.lado, null);
});

test('o Sol aparece como referência independente do sensor', () => {
  const leitura = lerBussola({ rumoSensorDeg: 0, posicao: LONDRINA, agora: MANHA });
  const sol = posicaoSolar({ ...LONDRINA, instanteMs: MANHA });
  assert.equal(leitura.sol.azimuteDeg, sol.azimuteDeg);
  assert.equal(leitura.sol.serveParaCalibrar, true);
  assert.equal(leitura.sol.desvioDaLeituraDeg, sol.azimuteDeg > 180 ? sol.azimuteDeg - 360 : sol.azimuteDeg);

  const deNoite = lerBussola({ rumoSensorDeg: 0, posicao: LONDRINA, agora: NOITE });
  assert.equal(deNoite.sol.acimaDoHorizonte, false);
  assert.equal(deNoite.sol.serveParaCalibrar, false);
});

test('o rumo travado guia mesmo sem correção, porque o erro do sensor se cancela', () => {
  const leitura = lerBussola({ rumoSensorDeg: 100, rumoTravadoDeg: 80, posicao: LONDRINA, agora: MANHA });
  assert.equal(leitura.rumoTravado.azimuteDeg, 80);
  assert.equal(leitura.rumoTravado.desvioDeg, -20);
  assert.equal(leitura.rumoTravado.lado, LADOS.ESQUERDA);
  assert.equal(leitura.rumoTravado.relativoAoSensor, true, 'sem correção o desvio é entre leituras do mesmo sensor');
  assert.equal(leitura.rumoTravado.azimuteRetornoDeg, 260);
});

test('sem posição o módulo diz o que deixa de existir, sem inventar', () => {
  const leitura = lerBussola({ rumoSensorDeg: 45, correcaoSensorDeg: 0, agora: MANHA });
  assert.equal(leitura.convergenciaDeg, null);
  assert.equal(leitura.azimuteGradeDeg, null);
  assert.equal(leitura.sol, null);
  assert.equal(leitura.destino, null);
  assert.match(leitura.avisos.join(' '), /Sem posição/);
});

test('sem sensor nenhum a leitura não vira zero', () => {
  const leitura = lerBussola({ posicao: LONDRINA, agora: MANHA });
  assert.equal(leitura.rumoCruDeg, null);
  assert.equal(leitura.cardealCru, null);
  assert.equal(leitura.azimuteVerdadeiroDeg, null);
});

test('os cardeais acompanham o azimute e dão a volta no 360', () => {
  assert.equal(cardeal(0), 'N');
  assert.equal(cardeal(90), 'L');
  assert.equal(cardeal(180), 'S');
  assert.equal(cardeal(270), 'O');
  assert.equal(cardeal(359), 'N');
  assert.equal(cardeal(null), null);
});

test('sem correção medida e sem pedir o modelo, a referência continua DESCONHECIDA', () => {
  // O opt-in existe para que ninguém receba azimute previsto sem ter pedido.
  const leitura = lerBussola({ rumoSensorDeg: 90, posicao: LONDRINA, agora: MANHA });
  assert.equal(leitura.referencia, REFERENCIAS_RUMO.DESCONHECIDA);
  assert.equal(leitura.azimuteVerdadeiroDeg, null);
  assert.equal(leitura.fonteCorrecao, null);
  // Mas o modelo é consultado assim mesmo: a declinação do lugar é informação.
  assert.equal(leitura.modeloMagnetico.ok, true);
  assert.ok(Number.isFinite(leitura.modeloMagnetico.declinacaoDeg));
});

test('com o modelo ligado o azimute sai PREVISTO, e o aviso diz sob que hipótese', () => {
  const leitura = lerBussola({
    rumoSensorDeg: 90, posicao: LONDRINA, usarModeloMagnetico: true, agora: MANHA,
  });
  assert.equal(leitura.referencia, REFERENCIAS_RUMO.PREVISTA);
  assert.equal(leitura.fonteCorrecao, FONTES_CORRECAO.MODELO);
  assert.equal(leitura.correcaoSensorDeg, leitura.modeloMagnetico.declinacaoDeg);
  assert.equal(leitura.azimuteVerdadeiroDeg, normDeg(90 + leitura.modeloMagnetico.declinacaoDeg));
  // O azimute de grade também passa a existir, porque depende do verdadeiro.
  assert.ok(Number.isFinite(leitura.azimuteGradeDeg));
  assert.ok(
    leitura.avisos.some((a) => a.includes('PREVISTO') && a.includes('norte magnético')),
    leitura.avisos.join(' | ')
  );
});

test('medida ganha de prevista: com o Sol calibrado o modelo não entra', () => {
  const leitura = lerBussola({
    rumoSensorDeg: 100,
    correcaoSensorDeg: -20,
    correcaoFonte: FONTES_CORRECAO.SOL,
    posicao: LONDRINA,
    usarModeloMagnetico: true,
    agora: MANHA,
  });
  assert.equal(leitura.referencia, REFERENCIAS_RUMO.CORRIGIDA);
  assert.equal(leitura.fonteCorrecao, FONTES_CORRECAO.SOL);
  assert.equal(leitura.correcaoSensorDeg, -20);
  // O modelo continua visível para conferência, mas não corrigiu nada.
  assert.notEqual(leitura.correcaoSensorDeg, leitura.modeloMagnetico.declinacaoDeg);
  assert.ok(!leitura.avisos.some((a) => a.includes('PREVISTO')));
});

test('correção medida sem fonte declarada conta como informada à mão', () => {
  const leitura = lerBussola({ rumoSensorDeg: 10, correcaoSensorDeg: -21, posicao: LONDRINA, agora: MANHA });
  assert.equal(leitura.fonteCorrecao, FONTES_CORRECAO.MANUAL);
  assert.equal(leitura.referencia, REFERENCIAS_RUMO.CORRIGIDA);
});

test('sem posição o modelo não inventa: fica DESCONHECIDA mesmo pedido', () => {
  const leitura = lerBussola({ rumoSensorDeg: 45, usarModeloMagnetico: true, agora: MANHA });
  assert.equal(leitura.modeloMagnetico, null);
  assert.equal(leitura.referencia, REFERENCIAS_RUMO.DESCONHECIDA);
  assert.equal(leitura.azimuteVerdadeiroDeg, null);
});
