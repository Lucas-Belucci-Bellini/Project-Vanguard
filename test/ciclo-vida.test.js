import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoCicloVidaAtual, formatarCicloVida, observarCicloVida } from '../src/core/ciclo-vida.js';

test('formatarCicloVida distingue foreground, background e estado indisponível', () => {
  assert.equal(formatarCicloVida('FOREGROUND', 'CAPACITOR APP'), 'FOREGROUND · CAPACITOR APP');
  assert.equal(formatarCicloVida('BACKGROUND', 'VISIBILITY API'), 'BACKGROUND · VISIBILITY API');
  assert.equal(formatarCicloVida('qualquer', 'INDISPONÍVEL'), 'UNAVAILABLE · INDISPONÍVEL');
});

test('ciclo de vida em Node não inventa estado de aplicativo', () => {
  assert.deepEqual(estadoCicloVidaAtual(), {
    estado: 'UNAVAILABLE',
    fonte: 'INDISPONÍVEL',
    rotulo: 'UNAVAILABLE · INDISPONÍVEL',
  });
});

test('observador fora do navegador reporta indisponibilidade e permite limpeza', () => {
  const estados = [];
  const remover = observarCicloVida({ onState: (estado) => estados.push(estado) });
  assert.deepEqual(estados.at(-1), {
    estado: 'UNAVAILABLE',
    fonte: 'INDISPONÍVEL',
    rotulo: 'UNAVAILABLE · INDISPONÍVEL',
  });
  remover();
});
