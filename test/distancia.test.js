import test from 'node:test';
import assert from 'node:assert/strict';

import { MEDIDAS, distanciaBruta, medirDistancia, vaosDaTrilha } from '../src/engine/distancia.js';
import { haversine } from '../src/engine/geo.js';

const T0 = 1_700_000_000_000;
/** Ponto a `metros` ao norte da origem, `segundos` depois. */
const p = (metros, segundos, extra = {}) => ({
  lat: -23.3103 + metros / 111_320,
  lon: -51.1628,
  timestamp: T0 + segundos * 1000,
  accuracy: 6,
  altitude: 550,
  ...extra,
});

/** 100 m andados, vão de 400 m / 180 s, mais 100 m andados. */
function trilhaComVao() {
  const t = [];
  for (let i = 0; i <= 10; i += 1) t.push(p(i * 10, i * 10));
  t.push(p(500, 280));
  for (let i = 1; i <= 10; i += 1) t.push(p(500 + i * 10, 280 + i * 10));
  return t;
}

test('o vão para de ser somado como se fosse caminhada', () => {
  // Medido na 1.6.0: esta trilha devolvia 599 m. Só que 400 daqueles metros
  // ninguém observou — o aparelho estava sem sinal, e a reta entre os dois
  // fixos é palpite. Pode ter sido 400 m retos, pode ter sido 900 contornando
  // um quarteirão.
  const r = medirDistancia(trilhaComVao());

  assert.equal(Math.round(r.filtrada.distanciaM), 599, 'a medida antiga continua disponível, com o nome certo');
  assert.equal(Math.round(r.observadaM), 200, 'e a honesta é só o chão que o aparelho viu');
  assert.equal(r.vaos.quantidade, 1);
  assert.equal(Math.round(r.vaos.naoObservadaM), 400);
  assert.equal(r.vaos.lista[0].dtMs, 180_000);
});

test('quando há vão, a interface recebe o rótulo que diz o que falta', () => {
  const r = medirDistancia(trilhaComVao());
  assert.equal(r.exibicao.medida, MEDIDAS.OBSERVADA);
  assert.equal(Math.round(r.exibicao.metros), 200);
  assert.match(r.exibicao.rotulo, /200 m observados/);
  assert.match(r.exibicao.rotulo, /400 m sem registro/);
  assert.match(r.exibicao.rotulo, /1 trecho/);
});

test('sem vão, o número exibido é a distância filtrada, sem ressalva inventada', () => {
  const continua = Array.from({ length: 31 }, (_, i) => p(i * 10, i * 10));
  const r = medirDistancia(continua);

  assert.equal(r.vaos.quantidade, 0);
  assert.equal(r.exibicao.medida, MEDIDAS.FILTRADA);
  assert.equal(Math.round(r.observadaM), Math.round(r.filtrada.distanciaM));
  assert.equal(Math.round(r.observadaM), 300);
  assert.match(r.exibicao.rotulo, /^300 m$/);
});

test('distância é ACUMULADA: uma volta fechada não mede zero', () => {
  // O §23 em forma de teste. Quem calcula primeiro→último acha 0 m aqui, e a
  // pessoa andou 400 m. É o erro que faz uma volta ao ponto de partida
  // "não contar".
  const volta = [
    p(0, 0), p(100, 100), p(200, 200), p(100, 300), p(0, 400),
  ];
  const r = medirDistancia(volta);

  assert.ok(r.observadaM > 350, `volta fechada mediu ${r.observadaM.toFixed(0)} m`);
  assert.ok(haversine(volta[0], volta.at(-1)) < 1, 'e o deslocamento líquido é praticamente zero');
});

test('bruta é teto e filtrada é peneirada — a diferença é o ruído medido', () => {
  // Parado por dez minutos, com o GPS tremendo ±10 m. Ninguém andou.
  const parado = Array.from({ length: 60 }, (_, i) => ({
    lat: -23.3103 + (Math.sin(i * 1.7) * 8) / 111_320,
    lon: -51.1628 + (Math.cos(i * 2.3) * 8) / 111_320,
    timestamp: T0 + i * 10_000,
    accuracy: 10,
    altitude: 550,
  }));

  const r = medirDistancia(parado);
  assert.ok(r.bruta.distanciaM > 100, `a soma crua acumulou ${r.bruta.distanciaM.toFixed(0)} m de tremor`);
  assert.ok(r.filtrada.distanciaM < r.bruta.distanciaM, 'a peneira precisa remover parte disso');
  assert.equal(Math.round(r.ruidoRemovidoM), Math.round(r.bruta.distanciaM - r.filtrada.distanciaM));
});

test('`casada` é null e continua null enquanto não houver map matching', () => {
  // Um campo que devolvesse a filtrada com nome de "casada" faria a interface
  // anunciar uma precisão que não existe neste repositório.
  const r = medirDistancia(Array.from({ length: 10 }, (_, i) => p(i * 10, i * 10)));
  assert.equal(r.casada, null);
});

test('o vão gravado no ponto é respeitado, e o antigo é detectado do mesmo jeito', () => {
  // Trilha nova: o Track Store já marcou o vão no ponto.
  const comMarca = [p(0, 0), { ...p(500, 280), vao: { dtMs: 180_000, metros: 500, motivo: '180 s sem ponto registrado.' } }];
  assert.equal(vaosDaTrilha(comMarca).length, 1);

  // Trilha antiga, migrada, sem a marca: os mesmos critérios detectam.
  const semMarca = [p(0, 0), p(500, 280)];
  assert.equal(vaosDaTrilha(semMarca).length, 1, 'a medição precisa funcionar igual antes e depois da V3');
});

test('salto absurdo já recusado pela peneira não é descontado duas vezes', () => {
  // Um salto de 50 km em 1 s é recusado pelo odômetro e não entra no total.
  // Descontá-lo de novo como vão tiraria distância real da conta.
  const comSalto = [p(0, 0), p(10, 10), p(50_000, 11), p(50_010, 21)];
  const r = medirDistancia(comSalto);
  assert.ok(r.observadaM >= 0, 'a distância observada nunca fica negativa');
  assert.ok(r.observadaM < 100, `o salto não entrou na distância: ${r.observadaM.toFixed(0)} m`);
});

test('trilha vazia ou de um ponto não quebra e não inventa distância', () => {
  for (const entrada of [[], [p(0, 0)], null, undefined]) {
    const r = medirDistancia(entrada);
    assert.equal(r.observadaM, 0);
    assert.equal(r.filtrada.distanciaM, 0);
    assert.equal(r.bruta.distanciaM, 0);
    assert.equal(r.vaos.quantidade, 0);
  }
});

test('distanciaBruta soma tudo, inclusive o que a peneira recusaria', () => {
  const trilha = [p(0, 0), p(1, 10), p(2, 20), p(3, 30)];
  const bruta = distanciaBruta(trilha);
  assert.equal(bruta.segmentos, 3);
  assert.ok(bruta.distanciaM > 2.5, 'passos de 1 m entram na bruta');
  // E a filtrada, com ±6 m de precisão, recusa esses passos como ruído.
  assert.ok(medirDistancia(trilha).filtrada.distanciaM < bruta.distanciaM);
});
