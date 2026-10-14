import test from 'node:test';
import assert from 'node:assert/strict';

import { criarOdometroCorrente, medirTrilha, MOTIVOS_SEGMENTO } from '../src/engine/odometro.js';
import { trilhasDouradas } from './dados/trilhas-douradas.js';

const T0 = 1_700_000_000_000;

/** Alimenta o acumulador ponto a ponto e devolve o resultado corrente. */
function correndo(pontos) {
  const odometro = criarOdometroCorrente();
  for (const ponto of pontos) odometro.adicionar(ponto);
  return odometro.resultado();
}

/**
 * A propriedade que sustenta tudo: medir ao vivo tem de dar EXATAMENTE o
 * mesmo número que medir no fim. Se algum dia divergirem, a tela e o registro
 * passam a discordar sobre a mesma caminhada — e a pessoa não tem como saber
 * qual dos dois mentiu.
 */
test('corrente e em lote dão o mesmo resultado nas oito trilhas douradas', () => {
  for (const trilha of trilhasDouradas()) {
    assert.deepEqual(
      correndo(trilha.pontos),
      medirTrilha(trilha.pontos),
      `divergiram em "${trilha.id}"`
    );
  }
});

test('a igualdade vale em CADA prefixo, não só no fim', () => {
  // Um acumulador pode acertar o total e errar no meio — e é justamente o
  // meio que a tela mostra enquanto a pessoa caminha.
  const [trilha] = trilhasDouradas();
  const odometro = criarOdometroCorrente();
  for (let i = 0; i < trilha.pontos.length; i += 1) {
    odometro.adicionar(trilha.pontos[i]);
    if (i % 25 !== 0) continue;
    assert.deepEqual(
      odometro.resultado(),
      medirTrilha(trilha.pontos.slice(0, i + 1)),
      `divergiram no prefixo de ${i + 1} ponto(s)`
    );
  }
});

test('trilha vazia e de um ponto só não inventam distância', () => {
  assert.deepEqual(correndo([]), medirTrilha([]));
  const um = [{ lat: -23.55, lon: -46.63, accuracy: 5, timestamp: T0 }];
  assert.deepEqual(correndo(um), medirTrilha(um));
  assert.equal(correndo(um).distanciaM, 0);
});

test('coordenada inválida é contada como descarte, nos dois caminhos', () => {
  const pontos = [
    { lat: -23.55, lon: -46.63, accuracy: 5, timestamp: T0 },
    { lat: null, lon: -46.63, accuracy: 5, timestamp: T0 + 1000 },
    { lat: 'abc', lon: -46.63, accuracy: 5, timestamp: T0 + 2000 },
    { lat: -23.54, lon: -46.63, accuracy: 5, timestamp: T0 + 3000 },
  ];
  const r = correndo(pontos);
  assert.deepEqual(r, medirTrilha(pontos));
  assert.equal(r.descartados[MOTIVOS_SEGMENTO.COORDENADA_INVALIDA], 2);
  assert.equal(r.pontos, 4, 'o total conta todos os fixos, inclusive os inválidos');
});

test('ponto sem altitude não entra na elevação, nos dois caminhos', () => {
  const pontos = [
    { lat: -23.55, lon: -46.63, altitude: 700, accuracy: 5, timestamp: T0 },
    { lat: -23.549, lon: -46.63, accuracy: 5, timestamp: T0 + 10_000 },
    { lat: -23.548, lon: -46.63, altitude: 730, accuracy: 5, timestamp: T0 + 20_000 },
  ];
  assert.deepEqual(correndo(pontos), medirTrilha(pontos));
  assert.ok(correndo(pontos).ganhoElevacaoM > 0);
});

test('salto absurdo reancora igual nos dois caminhos', () => {
  const pontos = [
    { lat: -23.55, lon: -46.63, accuracy: 5, timestamp: T0 },
    { lat: -23.549, lon: -46.63, accuracy: 5, timestamp: T0 + 10_000 },
    { lat: -20.00, lon: -46.63, accuracy: 5, timestamp: T0 + 20_000 },
    { lat: -20.001, lon: -46.63, accuracy: 5, timestamp: T0 + 30_000 },
  ];
  const r = correndo(pontos);
  assert.deepEqual(r, medirTrilha(pontos));
  assert.equal(r.descartados[MOTIVOS_SEGMENTO.SALTO_ABSURDO], 1);
  assert.ok(r.segmentosContados >= 2, 'depois do salto a contagem recomeça, não para');
});

test('adicionar() diz o que houve com CADA ponto', () => {
  const odometro = criarOdometroCorrente();
  const primeiro = odometro.adicionar({ lat: -23.55, lon: -46.63, accuracy: 5, timestamp: T0 });
  assert.equal(primeiro.contou, false, 'o primeiro ponto é âncora, não segmento');

  const perto = odometro.adicionar({ lat: -23.550001, lon: -46.63, accuracy: 5, timestamp: T0 + 1000 });
  assert.equal(perto.contou, false);
  assert.equal(perto.motivo, MOTIVOS_SEGMENTO.ABAIXO_DO_RUIDO);

  const longe = odometro.adicionar({ lat: -23.5495, lon: -46.63, accuracy: 5, timestamp: T0 + 20_000 });
  assert.equal(longe.contou, true);
  assert.equal(longe.motivo, MOTIVOS_SEGMENTO.CONTADO);
  assert.ok(longe.medida.totalM > 0);
  assert.equal(longe.distanciaM, odometro.distancia());
});

test('o custo por ponto NÃO cresce com o tamanho da trilha', () => {
  // A propriedade que o defeito violava. Não se mede tempo aqui (máquina de
  // CI varia); mede-se a forma: o trabalho por ponto é constante, então o
  // total cresce linearmente. Um acumulador O(n²) estouraria a razão.
  const fixo = (i) => ({
    lat: -23.55 + i / 111_320, lon: -46.63,
    altitude: 700, accuracy: 5, timestamp: T0 + i * 1000,
  });
  const medir = (n) => {
    const odometro = criarOdometroCorrente();
    const inicio = process.hrtime.bigint();
    for (let i = 0; i < n; i += 1) odometro.adicionar(fixo(i));
    return Number(process.hrtime.bigint() - inicio) / n;
  };
  medir(2000); // aquece, para o JIT não contaminar a primeira medida
  const pequeno = medir(2000);
  const grande = medir(20_000);
  assert.ok(
    grande < pequeno * 4,
    `custo por ponto explodiu com o tamanho: ${pequeno.toFixed(0)} ns → ${grande.toFixed(0)} ns`
  );
});
