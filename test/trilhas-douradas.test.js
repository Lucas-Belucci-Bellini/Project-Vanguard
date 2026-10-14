import test from 'node:test';
import assert from 'node:assert/strict';

import { trilhasDouradas } from './dados/trilhas-douradas.js';
import { medirDistancia } from '../src/engine/distancia.js';
import { medirTrilha } from '../src/engine/odometro.js';
import { haversine } from '../src/engine/geo.js';

/**
 * A verdade de cada trilha vem da geometria que a gerou, calculada antes de
 * existir qualquer ruído. Se estes testes passassem a comparar contra a saída
 * do motor, eles registrariam o defeito do dia em vez de pegá-lo.
 */
for (const trilha of trilhasDouradas()) {
  test(`golden · ${trilha.id}: ${trilha.titulo}`, () => {
    const r = medirDistancia(trilha.pontos);
    const medido = r.observadaM;
    const verdade = trilha.verdadeM;
    const erro = Math.abs(medido - verdade);

    if (trilha.toleranciaAbsolutaM != null) {
      assert.ok(
        erro <= trilha.toleranciaAbsolutaM,
        `${trilha.id}: medido ${medido.toFixed(0)} m contra verdade ${verdade.toFixed(0)} m (erro ${erro.toFixed(0)} m, teto ${trilha.toleranciaAbsolutaM} m)`
      );
    } else {
      const relativo = erro / Math.max(1, verdade);
      assert.ok(
        relativo <= trilha.toleranciaRelativa,
        `${trilha.id}: medido ${medido.toFixed(0)} m contra verdade ${verdade.toFixed(0)} m (erro ${(relativo * 100).toFixed(1)}%, teto ${(trilha.toleranciaRelativa * 100).toFixed(0)}%)`
      );
    }
  });
}

test('golden · o quarteirão fechado prova que a distância é acumulada', () => {
  const trilha = trilhasDouradas().find((t) => t.id === 'quarteirao-fechado');
  const r = medirDistancia(trilha.pontos);
  const deslocamentoLiquido = haversine(trilha.pontos[0], trilha.pontos.at(-1));

  assert.ok(r.observadaM > 700, `andou ${r.observadaM.toFixed(0)} m`);
  assert.ok(deslocamentoLiquido < 40, `mas voltou para perto do começo: ${deslocamentoLiquido.toFixed(0)} m`);
  // Quem calcula primeiro→último reporta ~0 aqui, e 800 m de caminhada somem.
  assert.ok(r.observadaM / Math.max(1, deslocamentoLiquido) > 15);
});

test('golden · uma hora parado não pode virar quilômetros', () => {
  // O caso mais caro do odômetro: a pessoa sentou e o GPS continuou tremendo.
  const trilha = trilhasDouradas().find((t) => t.id === 'parado-com-ruido');
  const r = medirDistancia(trilha.pontos);

  assert.ok(r.bruta.distanciaM > 1000, `a soma crua acumulou ${r.bruta.distanciaM.toFixed(0)} m de puro ruído`);
  assert.ok(r.observadaM < 150, `e a peneirada ficou em ${r.observadaM.toFixed(0)} m`);
  const reducao = r.bruta.distanciaM / Math.max(1, r.observadaM);
  assert.ok(reducao > 5, `a peneira removeu ${reducao.toFixed(1)}× o ruído`);
});

test('golden · a perda de sinal é declarada, não somada', () => {
  const trilha = trilhasDouradas().find((t) => t.id === 'perda-de-sinal');
  const r = medirDistancia(trilha.pontos);

  assert.equal(r.vaos.quantidade, 1, 'o vão precisa ser visto');
  assert.ok(Math.abs(r.vaos.naoObservadaM - trilha.naoObservadoM) < 60,
    `o não observado medido foi ${r.vaos.naoObservadaM.toFixed(0)} m contra ${trilha.naoObservadoM} m injetados`);
  // E a medida antiga somava esses 400 m como se fossem caminhada.
  assert.ok(r.filtrada.distanciaM > r.observadaM + 300, 'a diferença entre as duas medidas é o vão');
  assert.match(r.exibicao.rotulo, /sem registro/);
});

test('golden · o salto de 40 km não entra na distância', () => {
  const trilha = trilhasDouradas().find((t) => t.id === 'salto-do-sensor');
  const r = medirDistancia(trilha.pontos);
  assert.ok(r.observadaM < 800, `um outlier de 40 km não pode aparecer no total: ${r.observadaM.toFixed(0)} m`);
  assert.ok(r.observadaM > 400, 'e a caminhada real não pode ser perdida junto com ele');
});

test('golden · a V3 não piora nenhuma trilha em relação à medida antiga', () => {
  // Regressão de verdade: para cada trilha, o erro da V3 contra a verdade tem
  // de ser MENOR OU IGUAL ao erro da medida da 1.6.0. Nenhuma exceção.
  const piores = [];
  for (const trilha of trilhasDouradas()) {
    const antiga = Math.abs(medirTrilha(trilha.pontos).distanciaM - trilha.verdadeM);
    const nova = Math.abs(medirDistancia(trilha.pontos).observadaM - trilha.verdadeM);
    // Uma folga de 1 m absorve arredondamento sem esconder regressão real.
    if (nova > antiga + 1) piores.push(`${trilha.id}: antiga errava ${antiga.toFixed(0)} m, nova erra ${nova.toFixed(0)} m`);
  }
  assert.deepEqual(piores, [], piores.join(' · '));
});
