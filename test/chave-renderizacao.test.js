import test from 'node:test';
import assert from 'node:assert/strict';
import { chaveDesenhoGrade } from '../src/core/chave-renderizacao.js';

test('chaveDesenhoGrade permanece estável para o mesmo estado visual', () => {
  const estado = { center: { lng: -51.2, lat: -23.5 }, zoom: 14, bearing: 0, pitch: 0, largura: 390, altura: 720, dpr: 2, versaoGrade: 3 };
  assert.equal(chaveDesenhoGrade(estado), chaveDesenhoGrade({ ...estado, center: { ...estado.center } }));
});

test('chaveDesenhoGrade muda quando câmera, viewport, DPR ou grade mudam', () => {
  const base = { center: { lng: -51.2, lat: -23.5 }, zoom: 14, bearing: 0, pitch: 0, largura: 390, altura: 720, dpr: 2, versaoGrade: 3 };
  const baseKey = chaveDesenhoGrade(base);
  for (const alteracao of [
    { zoom: 14.1 },
    { bearing: 12 },
    { pitch: 8 },
    { largura: 391 },
    { altura: 721 },
    { dpr: 3 },
    { versaoGrade: 4 },
    { center: { lng: -51.200001, lat: -23.5 } },
  ]) {
    assert.notEqual(chaveDesenhoGrade({ ...base, ...alteracao }), baseKey);
  }
});

test('chaveDesenhoGrade rotula valores ausentes sem gerar chave ambígua', () => {
  assert.equal(chaveDesenhoGrade({}), 'INDISPONÍVEL|INDISPONÍVEL|INDISPONÍVEL|0.000000000|0.000000000|INDISPONÍVEL|INDISPONÍVEL|1.000000000|0');
});
