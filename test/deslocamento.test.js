import test from 'node:test';
import assert from 'node:assert/strict';
import { haversine } from '../src/engine/geo.js';
import {
  CONFIANCA,
  LIMITES_DESLOCAMENTO,
  MODOS_DESLOCAMENTO,
  classificarDeslocamento,
  sugerirModoAtual,
} from '../src/core/deslocamento.js';

const INICIO = Date.parse('2026-09-12T09:00:00.000Z');
const LAT = -23.31;
const LON = -51.16;

/**
 * Gera pontos ao longo de um meridiano numa velocidade alvo. O passo em graus
 * é derivado da própria haversine do motor — não de uma constante digitada —,
 * então o teste mede o que o código mede.
 */
function trilha({ kmh, minutos, intervaloS = 30, inicio = INICIO, latInicial = LAT }) {
  const grauEmM = haversine({ lat: latInicial, lon: LON }, { lat: latInicial + 1, lon: LON });
  const metrosPorPasso = (kmh * 1000 / 3600) * intervaloS;
  const passoGraus = metrosPorPasso / grauEmM;
  const total = Math.round((minutos * 60) / intervaloS);
  return Array.from({ length: total + 1 }, (_, indice) => ({
    lat: latInicial + passoGraus * indice,
    lon: LON,
    createdAt: inicio + indice * intervaloS * 1000,
  }));
}

function kmhDe(analise, modo) {
  const segmento = analise.segmentos.find((s) => s.modo === modo);
  return segmento ? segmento.velocidadeMediaKmh : null;
}

test('caminhada constante é classificada inteira como a pé', () => {
  const analise = classificarDeslocamento(trilha({ kmh: 5, minutos: 30 }));
  assert.equal(analise.segmentos.length, 1);
  assert.equal(analise.segmentos[0].modo, MODOS_DESLOCAMENTO.A_PE);
  assert.equal(analise.distanciaVeiculoM, 0);
  assert.ok(Math.abs(kmhDe(analise, MODOS_DESLOCAMENTO.A_PE) - 5) < 0.1);
});

test('trecho longo de ônibus vira segmento de veículo com confiança alta', () => {
  const analise = classificarDeslocamento(trilha({ kmh: 55, minutos: 20 }));
  assert.equal(analise.segmentos[0].modo, MODOS_DESLOCAMENTO.VEICULO);
  assert.equal(analise.segmentos[0].confianca, CONFIANCA.ALTA);
  assert.equal(analise.distanciaAPeM, 0);
  assert.ok(analise.distanciaVeiculoM > 17_000);
});

test('caminhada, ônibus e caminhada viram três segmentos com distâncias separadas', () => {
  const aPe1 = trilha({ kmh: 5, minutos: 20 });
  const fim1 = aPe1[aPe1.length - 1];
  const onibus = trilha({ kmh: 60, minutos: 15, inicio: fim1.createdAt + 30_000, latInicial: fim1.lat });
  const fim2 = onibus[onibus.length - 1];
  const aPe2 = trilha({ kmh: 5, minutos: 20, inicio: fim2.createdAt + 30_000, latInicial: fim2.lat });

  const analise = classificarDeslocamento([...aPe1, ...onibus, ...aPe2]);
  assert.deepEqual(analise.segmentos.map((s) => s.modo), [
    MODOS_DESLOCAMENTO.A_PE, MODOS_DESLOCAMENTO.VEICULO, MODOS_DESLOCAMENTO.A_PE,
  ]);
  // ~1,7 km andados em cada ponta e ~15 km de ônibus: somar tudo apagaria a diferença.
  assert.ok(analise.distanciaAPeM > 3_000 && analise.distanciaAPeM < 4_000);
  assert.ok(analise.distanciaVeiculoM > 14_000);
});

test('pico curto de velocidade não vira trecho de veículo', () => {
  const aPe = trilha({ kmh: 5, minutos: 10 });
  const fim = aPe[aPe.length - 1];
  const pico = trilha({ kmh: 40, minutos: 0.5, inicio: fim.createdAt + 30_000, latInicial: fim.lat });
  const analise = classificarDeslocamento([...aPe, ...pico]);
  assert.equal(analise.segmentos.some((s) => s.modo === MODOS_DESLOCAMENTO.VEICULO), false);
  assert.equal(analise.distanciaVeiculoM, 0);
});

test('salto impossível de GPS é descartado em vez de virar deslocamento', () => {
  const pontos = [
    { lat: LAT, lon: LON, createdAt: INICIO },
    { lat: LAT + 5, lon: LON, createdAt: INICIO + 60_000 },
    { lat: LAT + 5.001, lon: LON, createdAt: INICIO + 120_000 },
  ];
  const analise = classificarDeslocamento(pontos);
  assert.equal(analise.saltosDescartados, 1);
  assert.equal(analise.distanciaVeiculoM, 0);
  assert.ok(analise.distanciaTotalM < 1_000);
});

test('velocidade entre os dois limites fica indefinida em vez de escolher um lado', () => {
  const kmh = (LIMITES_DESLOCAMENTO.velocidadeAPeMaxKmh + LIMITES_DESLOCAMENTO.velocidadeVeiculoMinKmh) / 2;
  const analise = classificarDeslocamento(trilha({ kmh, minutos: 20 }));
  assert.equal(analise.segmentos[0].modo, MODOS_DESLOCAMENTO.INDEFINIDO);
  assert.equal(analise.distanciaIndefinidaM > 0, true);
});

test('pontos fora de ordem são ordenados antes de classificar', () => {
  const pontos = trilha({ kmh: 5, minutos: 20 });
  const embaralhados = [...pontos].reverse();
  const analise = classificarDeslocamento(embaralhados);
  assert.equal(analise.segmentos[0].modo, MODOS_DESLOCAMENTO.A_PE);
  assert.ok(Math.abs(kmhDe(analise, MODOS_DESLOCAMENTO.A_PE) - 5) < 0.1);
});

test('pontos sem tempo ou sem coordenada não entram no cálculo', () => {
  const analise = classificarDeslocamento([
    { lat: LAT, lon: LON },
    { lat: LAT, lon: null, createdAt: INICIO },
    { lat: LAT + 0.001, lon: LON, createdAt: INICIO + 60_000 },
  ]);
  assert.equal(analise.pontosConsiderados, 1);
  assert.deepEqual(analise.segmentos, []);
});

test('trilha vazia ou com um ponto não inventa segmento', () => {
  assert.deepEqual(classificarDeslocamento([]).segmentos, []);
  assert.equal(classificarDeslocamento([{ lat: LAT, lon: LON, createdAt: INICIO }]).distanciaTotalM, 0);
  assert.deepEqual(classificarDeslocamento(null).segmentos, []);
});

test('a sugestão ao vivo aponta veículo quando a janela recente sustenta', () => {
  const pontos = trilha({ kmh: 60, minutos: 5 });
  const agora = pontos[pontos.length - 1].createdAt;
  const sugestao = sugerirModoAtual(pontos, { agora });
  assert.equal(sugestao.modo, MODOS_DESLOCAMENTO.VEICULO);
  assert.match(sugestao.motivo, /acima do que uma caminhada sustenta/);
});

test('a sugestão ao vivo aponta caminhada em ritmo de pedestre', () => {
  const pontos = trilha({ kmh: 4.5, minutos: 5 });
  const sugestao = sugerirModoAtual(pontos, { agora: pontos[pontos.length - 1].createdAt });
  assert.equal(sugestao.modo, MODOS_DESLOCAMENTO.A_PE);
});

test('a sugestão ignora o que está fora da janela recente', () => {
  const antigos = trilha({ kmh: 60, minutos: 10 });
  const agora = antigos[antigos.length - 1].createdAt + 60 * 60_000;
  const sugestao = sugerirModoAtual(antigos, { agora });
  assert.equal(sugestao.modo, MODOS_DESLOCAMENTO.INDEFINIDO);
  assert.match(sugestao.motivo, /fixos suficientes/);
});

test('a classificação não altera a lista recebida', () => {
  const pontos = trilha({ kmh: 5, minutos: 10 });
  const copia = JSON.parse(JSON.stringify(pontos));
  classificarDeslocamento(pontos);
  assert.deepEqual(pontos, copia);
});

test('confirmação da pessoa vence a inferência por velocidade', () => {
  // Ônibus parado no trânsito parece pedestre; quem estava lá sabe que é ônibus.
  const pontos = trilha({ kmh: 4, minutos: 10 }).map((ponto) => ({ ...ponto, modo: MODOS_DESLOCAMENTO.VEICULO }));
  const analise = classificarDeslocamento(pontos);
  assert.equal(analise.segmentos[0].modo, MODOS_DESLOCAMENTO.VEICULO);
  assert.equal(analise.segmentos[0].confirmado, true);
  assert.equal(analise.distanciaAPeM, 0);
});

test('trecho confirmado curto não é rebaixado como pico', () => {
  const pontos = trilha({ kmh: 50, minutos: 0.5 }).map((ponto) => ({ ...ponto, modo: MODOS_DESLOCAMENTO.VEICULO }));
  assert.equal(classificarDeslocamento(pontos).segmentos[0].modo, MODOS_DESLOCAMENTO.VEICULO);
});

test('modo desconhecido no ponto não confirma nada', () => {
  const pontos = trilha({ kmh: 5, minutos: 10 }).map((ponto) => ({ ...ponto, modo: 'HELICOPTERO' }));
  const analise = classificarDeslocamento(pontos);
  assert.equal(analise.segmentos[0].modo, MODOS_DESLOCAMENTO.A_PE);
  assert.equal(analise.segmentos[0].confirmado, false);
});
