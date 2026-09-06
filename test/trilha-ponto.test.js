import test from 'node:test';
import assert from 'node:assert/strict';

import {
  QUALIDADE_PONTO,
  VELOCIDADE_MAXIMA_MS,
  PRECISAO_RUIM_M,
  classificarPonto,
  contaParaDistancia,
  detectarVao,
  deveGuardar,
  normalizarPontoTrilha,
} from '../src/engine/trilha-ponto.js';

const BASE = { lat: -23.3103, lon: -51.1628, timestamp: 1_700_000_000_000 };
/** ~1,11 m por 1e-5 de latitude, o suficiente para deslocar sem virar salto. */
const desloca = (metros, segundos, extra = {}) => ({
  lat: BASE.lat + metros / 111_320,
  lon: BASE.lon,
  timestamp: BASE.timestamp + segundos * 1000,
  ...extra,
});

test('normalizar preserva tudo que a leitura trouxe, e não inventa o que falta', () => {
  const completo = normalizarPontoTrilha({
    lat: -23.3, lon: -51.1, timestamp: 1_700_000_000_000,
    accuracy: 4.5, altitude: 552.3, altitudeAccuracy: 3, speed: 1.4, heading: 275.2,
    provider: 'BACKGROUND_GEOLOCATION', modo: 'PE',
  }, { seq: 42 });

  assert.deepEqual(completo, {
    lat: -23.3, lon: -51.1, timestamp: 1_700_000_000_000,
    accuracy: 4.5, altitude: 552.3, altitudeAccuracy: 3, speed: 1.4, heading: 275.2,
    provider: 'BACKGROUND_GEOLOCATION', modo: 'PE', seq: 42,
  });

  // Campo ausente fica AUSENTE. `Number(null)` é 0, e uma altitude 0 inventada
  // é indistinguível do nível do mar; uma accuracy 0 inventada mente dizendo
  // "fixo perfeito" — e envenena toda decisão adiante.
  const magro = normalizarPontoTrilha({ lat: -23.3, lon: -51.1 });
  assert.deepEqual(magro, { lat: -23.3, lon: -51.1 });
  assert.equal('accuracy' in magro, false);
  assert.equal('altitude' in magro, false);
  assert.equal('speed' in magro, false);

  // Valor impossível é descartado em vez de virar zero.
  const sujo = normalizarPontoTrilha({ lat: -23.3, lon: -51.1, accuracy: -5, speed: -2, altitude: null });
  assert.equal('accuracy' in sujo, false);
  assert.equal('speed' in sujo, false);
  assert.equal('altitude' in sujo, false);

  assert.equal(normalizarPontoTrilha({ lat: null, lon: -51.1 }), null);
  assert.equal(normalizarPontoTrilha({ lat: '', lon: '' }), null, "Number('') é 0 e 0 é coordenada válida");
});

test('o primeiro ponto não vira outlier por falta de comparação', () => {
  const r = classificarPonto(BASE, null);
  assert.equal(r.qualidade, QUALIDADE_PONTO.VALIDO);
  assert.match(r.motivo, /[Pp]rimeiro ponto/);
});

test('caminhada normal é VÁLIDA; salto impossível é OUTLIER', () => {
  // 1,4 m/s por 10 s = 14 m: uma caminhada.
  const andando = classificarPonto(desloca(14, 10, { accuracy: 5 }), { ...BASE, accuracy: 5 });
  assert.equal(andando.qualidade, QUALIDADE_PONTO.VALIDO);

  // 2 km em 1 s: nenhum meio de transporte faz isso.
  const salto = classificarPonto(desloca(2000, 1, { accuracy: 5 }), { ...BASE, accuracy: 5 });
  assert.equal(salto.qualidade, QUALIDADE_PONTO.OUTLIER);
  assert.match(salto.motivo, /km\/h/, 'o motivo tem de dizer o número que reprovou');
});

test('o teto de velocidade é por modo — 30 m/s é salto a pé e normal de carro', () => {
  const ponto = desloca(300, 10, { accuracy: 3 });   // 30 m/s = 108 km/h
  const anterior = { ...BASE, accuracy: 3 };

  assert.equal(classificarPonto(ponto, anterior, { velocidadeMaximaMs: VELOCIDADE_MAXIMA_MS.PE }).qualidade, QUALIDADE_PONTO.OUTLIER);
  assert.equal(classificarPonto(ponto, anterior, { velocidadeMaximaMs: VELOCIDADE_MAXIMA_MS.VEICULO }).qualidade, QUALIDADE_PONTO.VALIDO);
});

test('a folga vem da incerteza dos DOIS fixos, não de um limiar em metros', () => {
  // A MESMA distância no MESMO tempo, com verdicts opostos por causa da
  // incerteza — é isto que um limiar em metros não consegue fazer.
  //
  // 300 m em 2 s com fixos bons: (300 − 6) / 2 = 147 m/s. Passa dos 90 m/s do
  // modo desconhecido, e é salto.
  const bom = classificarPonto(desloca(300, 2, { accuracy: 3 }), { ...BASE, accuracy: 3 });
  assert.equal(bom.qualidade, QUALIDADE_PONTO.OUTLIER);

  // Os mesmos 300 m em 2 s com 100 m de raio em cada fixo: 200 m dos 300 podem
  // ser só o ruído dos dois se somando, então sobram (300 − 200) / 2 = 50 m/s.
  // Suspeito, mas não impossível — e marcar de menos é melhor que marcar de
  // mais, porque a marcação errada tira um trecho real da distância.
  const ruidoso = classificarPonto(desloca(300, 2, { accuracy: 100 }), { ...BASE, accuracy: 100 });
  assert.notEqual(ruidoso.qualidade, QUALIDADE_PONTO.OUTLIER, 'ruído somado não é salto');
  assert.equal(ruidoso.qualidade, QUALIDADE_PONTO.BAIXA_PRECISAO, 'mas a incerteza alta é dita');
});

test('precisão ruim é marcada, e a marcação não apaga o ponto', () => {
  const r = classificarPonto(desloca(10, 10, { accuracy: PRECISAO_RUIM_M + 30 }), { ...BASE, accuracy: 5 });
  assert.equal(r.qualidade, QUALIDADE_PONTO.BAIXA_PRECISAO);
  assert.equal(contaParaDistancia(r.qualidade), false, 'não sustenta medição');
  assert.equal(deveGuardar(r.qualidade), true, 'mas continua guardado — marcar não é apagar');
});

test('ponto fora de ordem é ANTIGO, não silenciosamente aceito', () => {
  const r = classificarPonto({ ...BASE, timestamp: BASE.timestamp - 30_000 }, BASE);
  assert.equal(r.qualidade, QUALIDADE_PONTO.ANTIGO);
  assert.match(r.motivo, /antes do último/);
  assert.equal(deveGuardar(r.qualidade), true);
});

test('mesmo lugar e mesmo instante é DUPLICADO', () => {
  assert.equal(classificarPonto({ ...BASE, timestamp: BASE.timestamp + 200 }, BASE).qualidade, QUALIDADE_PONTO.DUPLICADO);
  // Parado por 30 s não é duplicado: é informação (a pessoa ficou ali).
  assert.notEqual(classificarPonto({ ...BASE, timestamp: BASE.timestamp + 30_000 }, BASE).qualidade, QUALIDADE_PONTO.DUPLICADO);
});

test('só VALIDO sustenta distância; tudo menos INVALIDO é guardado', () => {
  assert.equal(contaParaDistancia(QUALIDADE_PONTO.VALIDO), true);
  for (const q of [QUALIDADE_PONTO.BAIXA_PRECISAO, QUALIDADE_PONTO.OUTLIER, QUALIDADE_PONTO.ANTIGO, QUALIDADE_PONTO.DUPLICADO]) {
    assert.equal(contaParaDistancia(q), false, `${q} não deveria somar distância`);
    assert.equal(deveGuardar(q), true, `${q} deveria continuar guardado`);
  }
  assert.equal(deveGuardar(QUALIDADE_PONTO.INVALIDO), false);
});

test('perda de sinal vira VÃO marcado, não uma reta por onde ninguém passou', () => {
  // Dez minutos sem ponto, e 3 km adiante: ligar os dois desenharia uma reta
  // por cima do que não foi observado, e somaria 3 km que ninguém mediu.
  const vao = detectarVao({ ...BASE, accuracy: 5 }, desloca(3000, 600, { accuracy: 5 }));
  assert.ok(vao, 'o vão precisa ser detectado');
  assert.equal(vao.dtMs, 600_000);
  assert.ok(vao.metros > 2900);
  assert.match(vao.motivo, /sem ponto registrado/);

  // Caminhada contínua não é vão.
  assert.equal(detectarVao({ ...BASE, accuracy: 5 }, desloca(14, 10, { accuracy: 5 })), null);

  // Só o tempo já basta: parado dez minutos sem fixo também é buraco no registro.
  const soTempo = detectarVao(BASE, { ...BASE, timestamp: BASE.timestamp + 600_000 });
  assert.ok(soTempo);
  assert.match(soTempo.motivo, /s sem ponto/);
});

test('coordenada inválida é INVALIDA e não passa adiante', () => {
  assert.equal(classificarPonto({ lat: 91, lon: 0 }, BASE).qualidade, QUALIDADE_PONTO.INVALIDO);
  assert.equal(classificarPonto({ lat: '', lon: '' }, BASE).qualidade, QUALIDADE_PONTO.INVALIDO);
  assert.equal(classificarPonto(null, BASE).qualidade, QUALIDADE_PONTO.INVALIDO);
});
