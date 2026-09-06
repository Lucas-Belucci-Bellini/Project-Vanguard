import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FAIXA_PADRAO_M, JUSTIFICATIVA_FAIXA, MINIMO_DE_TRILHAS_PADRAO,
  compararComReferencia, compararGrupo, consensoDeTrilhas,
} from '../src/engine/comparar-trilhas.js';

const T0 = 1_700_000_000_000;
/** Trecho reto: `n` fixos a partir de (lat0, lon0), passo constante. */
const seg = (n, lat0, lon0, dLat, dLon) => Array.from({ length: n }, (_, i) => ({
  lat: lat0 + dLat * i, lon: lon0 + dLon * i, timestamp: T0 + i * 10_000, accuracy: 5,
}));
const REFERENCIA = seg(200, -23.31, -51.16, 0, 0.004);

test('a faixa padrão traz a justificativa junto — número solto vira arbitrário', () => {
  assert.equal(FAIXA_PADRAO_M, 60);
  assert.match(JUSTIFICATIVA_FAIXA, /GNSS/);
  assert.match(JUSTIFICATIVA_FAIXA, /quadratura/);
});

test('trilha idêntica à referência dá 100 % no caminho e desvio zero', () => {
  const r = compararComReferencia(REFERENCIA, REFERENCIA);
  assert.equal(r.comparavel, true);
  assert.equal(r.fracaoNoCaminho, 1);
  assert.equal(r.fora, 0);
  assert.ok(r.desvio.maximoM < 1e-6, `${r.desvio.maximoM} m`);
  assert.equal(r.desvios.length, 0);
});

test('DEFEITO CORRIGIDO: ponto longe da referência não devolve Infinity', () => {
  // A grade olhava só as células vizinhas. Quem está DENTRO da faixa está a
  // uma célula; quem está fora pode estar a quilômetros — e aí não havia
  // segmento nenhum na vizinhança e a distância saía `Infinity`, direto para a
  // tela como "maior afastamento: Infinity m".
  const longe = [{ lat: -20.0, lon: -48.0, timestamp: T0, accuracy: 5 }];
  const r = compararComReferencia(longe, REFERENCIA);
  assert.ok(Number.isFinite(r.desvio.maximoM), `maximoM = ${r.desvio.maximoM}`);
  assert.ok(r.desvio.maximoM > 100_000, 'e é uma distância grande de verdade');
  assert.ok(r.desvios.every((d) => Number.isFinite(d.maiorAfastamentoM)));
});

test('a distância medida pela grade é a MESMA da varredura completa', () => {
  // A grade é otimização; se ela mudasse o resultado, seria outro cálculo.
  // Aqui: pontos a distâncias variadas, todos com resposta finita e coerente.
  for (const desloc of [0.0001, 0.001, 0.01, 0.1, 1]) {
    const p = [{ lat: -23.31 + desloc, lon: -51.0, timestamp: T0, accuracy: 5 }];
    const r = compararComReferencia(p, REFERENCIA);
    const esperado = desloc * 111_320;
    assert.ok(
      Math.abs(r.desvio.maximoM - esperado) / esperado < 0.02,
      `deslocamento ${desloc}°: esperado ~${esperado.toFixed(0)} m, medido ${r.desvio.maximoM.toFixed(0)} m`
    );
  }
});

test('quem sai do caminho aparece como trecho contíguo, com o afastamento', () => {
  const desviou = [...seg(100, -23.31, -51.16, 0, 0.004), ...seg(50, -23.31, -50.76, 0.004, 0.004), ...seg(50, -23.11, -50.56, 0, 0.004)];
  const r = compararComReferencia(desviou, REFERENCIA);
  assert.ok(r.fora > 0);
  assert.ok(r.desvios.length >= 1);
  assert.ok(r.desvios[0].pontos > 10, 'o desvio é um trecho, não pontos soltos');
  assert.ok(r.desvios[0].maiorAfastamentoM > FAIXA_PADRAO_M);
  assert.ok(r.desvios[0].de < r.desvios[0].para, 'e diz ONDE começou e terminou');
});

test('quem andou só metade cobre metade da referência', () => {
  const metade = REFERENCIA.slice(0, 100);
  const r = compararComReferencia(metade, REFERENCIA);
  assert.equal(r.fracaoNoCaminho, 1, 'tudo que ela andou foi no caminho');
  assert.ok(r.cobertura.fracao > 0.45 && r.cobertura.fracao < 0.55, `${r.cobertura.fracao}`);
});

test('cobertura de 100 % NÃO é o mesmo que "no caminho" de 100 %', () => {
  // Alguém pode percorrer a referência inteira E ainda ter andado muito fora
  // dela. Confundir as duas medidas esconde exatamente esse caso.
  const tudoMaisDesvio = [...REFERENCIA, ...seg(120, -23.31, -50.40, 0.004, 0.004)];
  const r = compararComReferencia(tudoMaisDesvio, REFERENCIA);
  assert.ok(r.cobertura.fracao > 0.95, 'passou pela referência inteira');
  assert.ok(r.fracaoNoCaminho < 0.9, 'e mesmo assim andou bastante fora');
});

test('referência curta demais não é comparável, e diz por quê', () => {
  for (const ref of [[], [REFERENCIA[0]], null]) {
    const r = compararComReferencia(REFERENCIA, ref);
    assert.equal(r.comparavel, false);
    assert.equal(r.motivo, 'REFERENCIA_INSUFICIENTE');
  }
});

test('ponto inválido é contado à parte, sem virar desvio nem acerto', () => {
  const comLixo = [...REFERENCIA.slice(0, 10), { lat: null, lon: -51 }, { lat: 'x', lon: 'y' }, ...REFERENCIA.slice(10, 20)];
  const r = compararComReferencia(comLixo, REFERENCIA);
  assert.equal(r.invalidos, 2);
  assert.equal(r.noCaminho + r.fora, comLixo.length - 2);
});

test('a faixa é configurável e muda o veredito, como deve', () => {
  const pouco = seg(50, -23.3105, -51.16, 0, 0.004); // ~55 m ao lado
  assert.equal(compararComReferencia(pouco, REFERENCIA, { faixaM: 60 }).fracaoNoCaminho, 1);
  assert.equal(compararComReferencia(pouco, REFERENCIA, { faixaM: 30 }).fracaoNoCaminho, 0);
});

test('comparar grupo devolve uma linha por pessoa, com o mesmo critério', () => {
  const grupo = [
    { id: 'a', nome: 'Ana', pontos: REFERENCIA },
    { id: 'b', nome: 'Bento', pontos: REFERENCIA.slice(0, 100) },
  ];
  const linhas = compararGrupo(grupo, REFERENCIA);
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].nome, 'Ana');
  assert.ok(linhas[0].cobertura.fracao > linhas[1].cobertura.fracao);
  assert.equal(linhas[0].faixaM, linhas[1].faixaM, 'mesmo critério para todos');
});

/* ─────────────────────────── consenso ─────────────────────────── */

test('o consenso confirma onde muitos passaram e acusa onde ninguém passa', () => {
  const atalho = [...seg(80, -23.31, -51.16, 0, 0.004), ...seg(40, -23.31, -50.84, 0.0025, 0.004), ...seg(80, -23.21, -50.68, 0, 0.004)];
  const trilhas = Array.from({ length: 5 }, (_, k) => ({ id: `p${k}`, nome: `P${k}`, pontos: k < 4 ? atalho : REFERENCIA }));
  const c = consensoDeTrilhas(trilhas, REFERENCIA, { minimoDeTrilhas: 3 });

  assert.equal(c.comparavel, true);
  assert.ok(c.abandonado.fracao > 0.4, `${(c.abandonado.fracao * 100).toFixed(0)} % abandonado`);
  assert.ok(c.novo.length > 0, 'e aponta onde o caminho novo passa');
  assert.ok(c.novo[0].trilhas >= 3);
  assert.ok(Number.isFinite(c.novo[0].lat) && Number.isFinite(c.novo[0].lon), 'com coordenada, para dar para ir ver');
});

test('o app NÃO gera traçado novo — ele conta e o operador decide', () => {
  // Uma média entre duas variantes legítimas passa pelo meio do mato, entre as
  // duas. O módulo entrega evidência contada, nunca geometria inventada.
  const c = consensoDeTrilhas([{ id: 'a', pontos: REFERENCIA }], REFERENCIA, { minimoDeTrilhas: 1 });
  assert.equal(c.decideOperador, true);
  assert.ok(!('tracadoNovo' in c) && !('linhaConsenso' in c));
});

test('a contagem é por TRILHA distinta, não por ponto', () => {
  // Quem parou para almoçar deixa duzentos fixos no mesmo lugar. Contando
  // ponto, um almoço viraria "caminho novo confirmado por 200".
  const almoco = Array.from({ length: 200 }, () => ({ lat: -23.35, lon: -51.0, timestamp: T0, accuracy: 5 }));
  const c = consensoDeTrilhas([{ id: 'a', pontos: almoco }], REFERENCIA, { minimoDeTrilhas: 2 });
  assert.equal(c.novo.length, 0, 'uma pessoa parada não cria caminho');
  const c2 = consensoDeTrilhas([{ id: 'a', pontos: almoco }], REFERENCIA, { minimoDeTrilhas: 1 });
  assert.ok(c2.novo.every((n) => n.trilhas === 1), 'e quando conta, conta 1 — não 200');
});

test('sem trilhas ou sem referência, o consenso se recusa com motivo', () => {
  assert.equal(consensoDeTrilhas([], REFERENCIA).motivo, 'SEM_TRILHAS');
  assert.equal(consensoDeTrilhas([{ id: 'a', pontos: REFERENCIA }], []).motivo, 'REFERENCIA_INSUFICIENTE');
});

test('o mínimo padrão não deixa uma pessoa perdida virar caminho novo', () => {
  assert.ok(MINIMO_DE_TRILHAS_PADRAO >= 3);
});

test('o custo NÃO explode com o tamanho — a grade tem de estar funcionando', () => {
  // Sem índice espacial isto é O(n·m): 12 000 × 12 000 são 144 milhões de
  // contas. A propriedade cobrada é a forma, não o relógio da máquina de CI.
  const grande = (n) => seg(n, -23.31, -51.16, 0, 400 / n * 0.004);
  const medir = (n) => {
    const t = grande(n);
    const inicio = process.hrtime.bigint();
    compararComReferencia(t, t);
    return Number(process.hrtime.bigint() - inicio) / n;
  };
  medir(2000);
  const pequeno = medir(2000);
  const enorme = medir(20_000);
  assert.ok(enorme < pequeno * 6, `custo por ponto explodiu: ${pequeno.toFixed(0)} ns → ${enorme.toFixed(0)} ns`);
});
