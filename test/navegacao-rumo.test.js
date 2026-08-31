import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarGraus,
  diferencaAngular,
  rumoGeodesico,
  distanciaGeodesica,
  backBearing,
  cardinalDeGraus,
  direcaoRelativa,
  resumoSegmentos,
} from '../src/core/navegacao-rumo.js';

test('normalizarGraus mantém 0–360 e rejeita entrada inválida', () => {
  assert.equal(normalizarGraus(-10), 350);
  assert.equal(normalizarGraus(370), 10);
  assert.equal(normalizarGraus('x'), null);
});

test('cardinalDeGraus cobre cardinais e intercardinais', () => {
  assert.equal(cardinalDeGraus(0), 'N');
  assert.equal(cardinalDeGraus(45), 'NE');
  assert.equal(cardinalDeGraus(90), 'E');
  assert.equal(cardinalDeGraus(180), 'S');
  assert.equal(cardinalDeGraus(270), 'W');
  assert.equal(cardinalDeGraus(359), 'N');
});

test('diferencaAngular cruza 0/360 pelo menor caminho', () => {
  assert.equal(diferencaAngular(350, 10), 20);
  assert.equal(diferencaAngular(10, 350), -20);
  assert.equal(diferencaAngular(null, 10), null);
});

test('rumo, back bearing e distância usam o motor geográfico', () => {
  const origem = { lat: 0, lon: 0 };
  const destino = { lat: 0, lon: 1 };
  assert.ok(Math.abs(rumoGeodesico(origem, destino) - 90) < 0.01);
  assert.ok(Math.abs(backBearing(origem, destino) - 270) < 0.01);
  assert.ok(distanciaGeodesica(origem, destino) > 110000);
});

test('direção relativa não inventa resultado sem heading ou rumo', () => {
  assert.equal(direcaoRelativa(null, 90), null);
  assert.equal(direcaoRelativa(350, 10), 'À direita');
  assert.equal(direcaoRelativa(10, 350), 'À esquerda');
  assert.equal(direcaoRelativa(0, 180), 'Atrás');
});

test('resumoSegmentos calcula distância, rumo e total', () => {
  const resultado = resumoSegmentos([{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 1 }]);
  assert.equal(resultado.segmentos.length, 2);
  assert.equal(resultado.segmentos[0].cardinal, 'E');
  assert.equal(resultado.segmentos[1].cardinal, 'N');
  assert.equal(resultado.distanciaTotalM, resultado.segmentos.reduce((t, s) => t + s.distanciaM, 0));
});
