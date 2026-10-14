import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RISCO, SEGUNDOS_ABRIGO, ESPERA_APOS_ULTIMO_TROVAO_MS, VELOCIDADE_SOM_20C,
  velocidadeDoSom, distanciaDoTrovao, tendencia, esperaRestante, descreverTempo,
} from '../src/engine/tempestade.js';

test('a velocidade do som segue a fórmula publicada, conferida em três pontos', () => {
  // c = 331,3 + 0,606·T. Valores de referência, não números de memória.
  assert.ok(Math.abs(velocidadeDoSom(0) - 331.3) < 0.05, `0 °C: ${velocidadeDoSom(0)}`);
  assert.ok(Math.abs(velocidadeDoSom(20) - 343.4) < 0.15, `20 °C: ${velocidadeDoSom(20)}`);
  assert.ok(Math.abs(velocidadeDoSom(30) - 349.5) < 0.15, `30 °C: ${velocidadeDoSom(30)}`);
  // A regra de bolso "divide por 3" assume ~343 m/s, que é a de 20 °C.
  assert.ok(Math.abs(velocidadeDoSom(20) - VELOCIDADE_SOM_20C) < 0.3);
});

test('temperatura ausente ou absurda cai no padrão declarado, não em NaN', () => {
  for (const t of [null, undefined, NaN, 'quente', -200, 300]) {
    assert.equal(velocidadeDoSom(t), VELOCIDADE_SOM_20C, `entrada: ${t}`);
  }
});

test('30 segundos dão os ~10 km da regra 30/30', () => {
  // Se esta conta divergir, a regra que a tela ensina deixa de bater com o
  // número que ela mostra — e é a regra que decide procurar abrigo.
  const d = distanciaDoTrovao(SEGUNDOS_ABRIGO, { temperaturaC: 20 });
  assert.ok(d.metros > 10_000 && d.metros < 10_500, `${d.metros} m`);
  assert.equal(d.risco, RISCO.ABRIGO_AGORA);
});

test('a regra de bolso "divide por 3" bate com a conta, dentro de 5 %', () => {
  for (const s of [3, 9, 15, 30]) {
    const km = distanciaDoTrovao(s, { temperaturaC: 20 }).metros / 1000;
    assert.ok(Math.abs(km - s / 3) / (s / 3) < 0.05, `${s} s: ${km.toFixed(2)} km vs ${(s / 3).toFixed(2)} km`);
  }
});

test('a distância vem SEMPRE com a incerteza, nunca sozinha', () => {
  const d = distanciaDoTrovao(10, { temperaturaC: 18 });
  assert.ok(d.incertezaM > 50 && d.incertezaM < 200, `${d.incertezaM} m`);
  assert.equal(typeof d.velocidadeSomMs, 'number');
});

test('a tela sabe se a temperatura foi MEDIDA ou suposta', () => {
  // Muda o que o número vale: com temperatura medida a conta é a do lugar;
  // sem ela é a de 20 °C, que numa noite de serra erra para mais.
  assert.equal(distanciaDoTrovao(10, { temperaturaC: 8 }).temperaturaMedida, true);
  assert.equal(distanciaDoTrovao(10).temperaturaMedida, false);
  assert.equal(distanciaDoTrovao(10, { temperaturaC: null }).temperaturaMedida, false);
});

test('o risco muda nos limiares certos, e nunca existe "seguro"', () => {
  assert.equal(distanciaDoTrovao(1).risco, RISCO.ABRIGO_AGORA);
  assert.equal(distanciaDoTrovao(30).risco, RISCO.ABRIGO_AGORA);
  assert.equal(distanciaDoTrovao(31).risco, RISCO.APROXIMANDO);
  assert.equal(distanciaDoTrovao(60).risco, RISCO.APROXIMANDO);
  assert.equal(distanciaDoTrovao(61).risco, RISCO.DISTANTE);
  // DISTANTE é o mais longe que a escala vai. Não há rótulo de segurança:
  // raio cai a 10–15 km da chuva, sob céu que parece limpo.
  assert.ok(!Object.values(RISCO).some((r) => /SEGUR/i.test(r)));
});

test('intervalo inválido não vira distância, e o motivo é dito', () => {
  for (const s of [null, undefined, NaN, -1, 'abc']) {
    const d = distanciaDoTrovao(s);
    assert.equal(d.valida, false, `entrada: ${s}`);
    assert.equal(d.risco, RISCO.DESCONHECIDO, 'sem medida NUNCA é ausência de risco');
  }
});

test('intervalo longo demais é recusado — não é o mesmo raio', () => {
  // Acima de ~25 km o trovão não chega audível: o som é refratado para cima.
  // "Ouvi um trovão de 40 km" quase sempre é um segundo raio.
  const d = distanciaDoTrovao(120);
  assert.equal(d.valida, false);
  assert.match(d.motivo, /LONGE_DEMAIS/);
});

test('a tendência responde vindo ou indo — e se cala com uma medida só', () => {
  assert.equal(tendencia([40, 30, 20, 12]).sentido, 'APROXIMANDO');
  assert.equal(tendencia([12, 20, 30, 40]).sentido, 'AFASTANDO');
  assert.equal(tendencia([20, 20, 21, 20]).sentido, 'ESTAVEL');
  assert.equal(tendencia([15]).conhecida, false);
  assert.equal(tendencia([]).conhecida, false);
});

test('um raio isolado mais perto não inverte a leitura de quem está indo embora', () => {
  // Média de metades, não último-contra-anterior: senão a tela mudaria de
  // "afastando" para "aproximando" a cada descarga fora do padrão.
  assert.equal(tendencia([10, 12, 20, 25, 8, 30]).sentido, 'AFASTANDO');
});

test('a espera dos 30 minutos conta a partir do ÚLTIMO trovão', () => {
  const T = 1_700_000_000_000;
  assert.equal(esperaRestante(T, T).restanteMs, ESPERA_APOS_ULTIMO_TROVAO_MS);
  assert.equal(esperaRestante(T, T + 10 * 60_000).restanteMs, 20 * 60_000);
  assert.equal(esperaRestante(T, T + 31 * 60_000).liberado, true);
  assert.equal(esperaRestante(null, T).conhecida, false);
  assert.equal(esperaRestante(null, T).liberado, false, 'sem dado NUNCA é liberado');
});

test('os códigos de trovoada são reconhecidos, com granizo separado', () => {
  assert.equal(descreverTempo(95).trovoada, true);
  assert.equal(descreverTempo(95).granizo, false);
  assert.equal(descreverTempo(96).granizo, true);
  assert.equal(descreverTempo(99).granizo, true);
  assert.equal(descreverTempo(3).trovoada, false);
  assert.equal(descreverTempo(65).chuva, true);
  assert.equal(descreverTempo(0).chuva, false);
  assert.equal(descreverTempo(null).texto, 'Condição não informada');
  assert.equal(descreverTempo(999).texto, 'Condição não informada');
});
