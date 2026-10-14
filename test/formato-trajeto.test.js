import test from 'node:test';
import assert from 'node:assert/strict';

import { formatarDistancia, formatarDuracao, formatarRitmo } from '../src/ui/formato-trajeto.js';

test('metros viram km a partir de 1 000, com a unidade separada do número', () => {
  assert.deepEqual(formatarDistancia(0), { valor: '0', unidade: 'm' });
  assert.deepEqual(formatarDistancia(999), { valor: '999', unidade: 'm' });
  assert.deepEqual(formatarDistancia(1000), { valor: '1.00', unidade: 'km' });
  assert.deepEqual(formatarDistancia(4238), { valor: '4.24', unidade: 'km' });
  // Acima de 10 km duas casas viram ruído numa tela lida de relance.
  assert.deepEqual(formatarDistancia(12_400), { valor: '12.4', unidade: 'km' });
});

test('distância inválida ou negativa vira zero, nunca NaN na tela', () => {
  for (const entrada of [NaN, null, undefined, -50, 'abc']) {
    assert.deepEqual(formatarDistancia(entrada), { valor: '0', unidade: 'm' });
  }
});

test('duração aparece como tempo, não como segundos crus', () => {
  assert.equal(formatarDuracao(0), '0:00');
  assert.equal(formatarDuracao(65_000), '1:05');
  assert.equal(formatarDuracao(3_600_000), '1:00:00');
  assert.equal(formatarDuracao(5_425_000), '1:30:25');
  assert.equal(formatarDuracao(-1), '—');
  assert.equal(formatarDuracao(NaN), '—');
});

test('ritmo é min/km e se cala quando ainda não há distância para dividir', () => {
  // 1 km em 10 min = 10:00 /km
  assert.equal(formatarRitmo(1000, 600_000), '10:00 /km');
  // 500 m em 5 min = 10:00 /km também
  assert.equal(formatarRitmo(500, 300_000), '10:00 /km');
  assert.equal(formatarRitmo(1000, 555_000), '9:15 /km');
});

test('ritmo NÃO é calculado sobre distância curta demais para significar algo', () => {
  // Com 20 m andados, o ruído do GPS domina e o ritmo seria uma invenção.
  assert.equal(formatarRitmo(20, 60_000), '—');
  assert.equal(formatarRitmo(0, 60_000), '—');
  assert.equal(formatarRitmo(1000, 0), '—');
  // Parado quase o tempo todo: ritmo absurdo não é mostrado como se fosse dado.
  assert.equal(formatarRitmo(60, 7_200_000), '—');
});
