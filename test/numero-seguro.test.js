import test from 'node:test';
import assert from 'node:assert/strict';
import { coordenadaValida, numeroFinito, numeroNoIntervalo } from '../src/core/numero-seguro.js';

test('os valores que o JavaScript converte para 0 viram null', () => {
  for (const valor of [null, undefined, '', '   ', false, true, [], [5], {}, NaN, Infinity, -Infinity]) {
    assert.equal(numeroFinito(valor), null, `${JSON.stringify(valor)} não deveria virar número`);
  }
});

test('número e string numérica passam, inclusive zero e negativo', () => {
  assert.equal(numeroFinito(0), 0);
  assert.equal(numeroFinito(-23.31), -23.31);
  assert.equal(numeroFinito('-51.16'), -51.16);
  assert.equal(numeroFinito(' 12 '), 12);
});

test('o intervalo é fechado nas duas pontas', () => {
  assert.equal(numeroNoIntervalo(90, -90, 90), 90);
  assert.equal(numeroNoIntervalo(-90, -90, 90), -90);
  assert.equal(numeroNoIntervalo(90.1, -90, 90), null);
});

test('coordenada só existe quando as duas metades existem', () => {
  assert.deepEqual(coordenadaValida({ lat: -23.31, lon: -51.16 }), { lat: -23.31, lon: -51.16 });
  assert.equal(coordenadaValida({ lat: -23.31, lon: null }), null);
  assert.equal(coordenadaValida({ lat: null, lon: -51.16 }), null);
  assert.equal(coordenadaValida({ lat: 91, lon: 0 }), null);
  assert.equal(coordenadaValida(null), null);
});

test('o par 0,0 continua sendo uma coordenada legítima', () => {
  assert.deepEqual(coordenadaValida({ lat: 0, lon: 0 }), { lat: 0, lon: 0 });
});
