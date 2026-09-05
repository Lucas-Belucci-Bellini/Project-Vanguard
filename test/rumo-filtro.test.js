import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES_RUMO,
  QUALIDADES_RUMO,
  criarFiltroDeRumo,
  dispersaoCircularDeg,
  mediaCircularDeg,
  reducaoDeRuido,
  retidaoDaJanela,
} from '../src/engine/rumo-filtro.js';
import { normDeg, deltaDeg } from '../src/engine/angles.js';

/**
 * Ruído reprodutível. Não é `Math.random`: um teste que mede desvio padrão
 * precisa dar o mesmo número em todo runner, senão ele avisa sozinho às vezes.
 */
function ruido(semente = 12345) {
  let s = semente;
  const uniforme = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  // Box-Muller: gaussiana a partir de dois uniformes.
  return () => Math.sqrt(-2 * Math.log(Math.max(1e-9, uniforme()))) * Math.cos(2 * Math.PI * uniforme());
}

test('a redução de ruído da média exponencial segue α/(2−α)', () => {
  // Álgebra, não medição: Var(y) = α/(2−α)·Var(x) para y = αx + (1−α)y.
  // Com α = 0,2 isso é 1/9, e o desvio padrão (a raiz) é exatamente 1/3.
  const r = reducaoDeRuido(0.2);
  assert.ok(Math.abs(r.variancia - 1 / 9) < 1e-12, `variância ${r.variancia}`);
  assert.ok(Math.abs(r.fator - 1 / 3) < 1e-12, `fator ${r.fator}`);
  assert.ok(Math.abs(r.amostrasEquivalentes - 9) < 1e-12, `equivalentes ${r.amostrasEquivalentes}`);
  // α = 1 é "não filtrar": nada muda.
  assert.equal(reducaoDeRuido(1).fator, 1);
});

test('o α padrão parado é o que entrega o fator 3 — mudá-lo quebra a promessa', () => {
  assert.equal(LIMITES_RUMO.alfaParado, 0.2);
  assert.ok(Math.abs(1 / reducaoDeRuido(LIMITES_RUMO.alfaParado).fator - 3) < 1e-9);
});

test('parado, o tremor medido cai pelo menos três vezes', () => {
  // Verdade conhecida: 47°. Ruído de 4° a 16 Hz, que é a ordem do que um
  // magnetômetro de celular entrega na mão.
  const gauss = ruido();
  const filtro = criarFiltroDeRumo();
  let ms = 0;
  let somaEntrada = 0;
  let somaSaida = 0;
  let contadas = 0;
  let ultimo = null;
  for (let i = 0; i < 800; i += 1) {
    const bruto = 47 + 4 * gauss();
    ultimo = filtro.adicionar({ rumoDeg: bruto, emMs: (ms += 62) });
    // Os primeiros quadros são a convergência do filtro, não o regime.
    if (i > 150) {
      somaEntrada += deltaDeg(47, bruto) ** 2;
      somaSaida += deltaDeg(47, ultimo.rumoDeg) ** 2;
      contadas += 1;
    }
  }
  const rmsEntrada = Math.sqrt(somaEntrada / contadas);
  const rmsSaida = Math.sqrt(somaSaida / contadas);
  const ganho = rmsEntrada / rmsSaida;
  assert.ok(ganho >= 3, `o ganho medido foi ${ganho.toFixed(2)}×, abaixo do 3× prometido`);
  assert.equal(ultimo.alfa, LIMITES_RUMO.alfaParado, 'parado o α tem de ficar no mínimo');
  assert.equal(ultimo.qualidade, QUALIDADES_RUMO.ESTAVEL);
});

test('a média não quebra ao cruzar o norte', () => {
  // O erro clássico: a média aritmética de 359° e 1° é 180°, o sul exato.
  const filtro = criarFiltroDeRumo();
  let ms = 0;
  let ultimo = null;
  for (const rumo of [359, 1, 358, 2, 0, 359.5, 0.5, 359, 1, 0]) {
    ultimo = filtro.adicionar({ rumoDeg: rumo, emMs: (ms += 62) });
  }
  assert.ok(Math.abs(deltaDeg(0, ultimo.rumoDeg)) < 3, `ficou em ${ultimo.rumoDeg}°, longe do norte`);
});

test('girando, o filtro abre o α e não fica para trás', () => {
  // A 60°/s — meia volta em três segundos — o atraso não pode virar erro de
  // direção. O limite cobrado é generoso de propósito: 20° com 4° de ruído
  // entrando ainda é uma agulha utilizável; 45° não seria.
  const gauss = ruido(999);
  const filtro = criarFiltroDeRumo();
  let ms = 0;
  let maiorErro = 0;
  let alfaMaximo = 0;
  for (let i = 0; i < 300; i += 1) {
    const verdade = normDeg(i * 60 * 0.062);
    const leitura = filtro.adicionar({ rumoDeg: normDeg(verdade + 4 * gauss()), emMs: (ms += 62) });
    if (i > 60) {
      maiorErro = Math.max(maiorErro, Math.abs(deltaDeg(verdade, leitura.rumoDeg)));
      alfaMaximo = Math.max(alfaMaximo, leitura.alfa);
    }
  }
  assert.ok(maiorErro < 20, `o filtro ficou ${maiorErro.toFixed(1)}° para trás`);
  assert.ok(alfaMaximo >= LIMITES_RUMO.alfaGirando - 1e-9, `o α parou em ${alfaMaximo}`);
});

test('a retidão separa giro de interferência', () => {
  // Girar 90° em passos é um caminho reto no círculo.
  const girando = Array.from({ length: 19 }, (_, i) => i * 5);
  assert.ok(retidaoDaJanela(girando) > 0.9, `giro deu retidão ${retidaoDaJanela(girando)}`);
  // Ir e voltar anda muito e não sai do lugar.
  const tremendo = Array.from({ length: 20 }, (_, i) => (i % 2 ? 60 : 20));
  assert.ok(retidaoDaJanela(tremendo) < 0.1, `tremor deu retidão ${retidaoDaJanela(tremendo)}`);
});

test('leitura espalhada com o aparelho quieto é chamada de interferência', () => {
  const gauss = ruido(7);
  const filtro = criarFiltroDeRumo();
  let ms = 0;
  let ultimo = null;
  for (let i = 0; i < 40; i += 1) ultimo = filtro.adicionar({ rumoDeg: normDeg(47 + 40 * gauss()), emMs: (ms += 62) });
  assert.equal(ultimo.qualidade, QUALIDADES_RUMO.INTERFERENCIA);
  assert.equal(ultimo.estavel, false);
  assert.ok(ultimo.dispersaoDeg > LIMITES_RUMO.dispersaoMaximaDeg);
});

test('girar de verdade não é confundido com interferência', () => {
  const filtro = criarFiltroDeRumo();
  let ms = 0;
  let ultimo = null;
  for (let i = 0; i < 40; i += 1) ultimo = filtro.adicionar({ rumoDeg: normDeg(i * 9), emMs: (ms += 62) });
  assert.equal(ultimo.qualidade, QUALIDADES_RUMO.INSTAVEL, 'giro amplo não é defeito do sensor');
});

test('poucas amostras não viram julgamento de qualidade', () => {
  const filtro = criarFiltroDeRumo();
  const primeira = filtro.adicionar({ rumoDeg: 100, emMs: 0 });
  assert.equal(primeira.qualidade, QUALIDADES_RUMO.INSUFICIENTE);
  assert.equal(primeira.dispersaoDeg, null);
  assert.equal(primeira.rumoDeg, 100, 'a primeira leitura passa direto, sem suavização');
});

test('um hiato longo reinicia o filtro em vez de fingir continuidade', () => {
  const filtro = criarFiltroDeRumo();
  filtro.adicionar({ rumoDeg: 10, emMs: 0 });
  filtro.adicionar({ rumoDeg: 10, emMs: 62 });
  // Tela apagada por meio minuto; a leitura nova é a realidade, não a média
  // com o que o aparelho via antes.
  const depois = filtro.adicionar({ rumoDeg: 200, emMs: 30_000 });
  assert.equal(depois.rumoDeg, 200);
  assert.equal(depois.amostras, 1);
});

test('leitura inválida não contamina o estado', () => {
  const filtro = criarFiltroDeRumo();
  filtro.adicionar({ rumoDeg: 90, emMs: 0 });
  const depois = filtro.adicionar({ rumoDeg: null, emMs: 62 });
  assert.equal(depois.rumoDeg, 90);
  assert.equal(depois.amostras, 1, 'o nulo não entra na janela');
  const nan = filtro.adicionar({ rumoDeg: Number.NaN, emMs: 124 });
  assert.equal(nan.rumoDeg, 90);
});

test('a média circular recusa leituras que se cancelam', () => {
  // 0° e 180° não têm média: qualquer resposta seria invenção.
  assert.equal(mediaCircularDeg([0, 180]), null);
  assert.equal(mediaCircularDeg([]), null);
  const media = mediaCircularDeg([350, 10]);
  assert.ok(Math.abs(deltaDeg(0, media.rumoDeg)) < 1e-9, `deu ${media.rumoDeg}`);
  assert.equal(media.amostras, 2);
});

test('a dispersão circular segue a fórmula de Mardia', () => {
  // σ = √(−2·ln R). R = 1 é leitura perfeita; R → 0 é ruído puro.
  assert.equal(dispersaoCircularDeg(1), 0);
  const r = 0.9;
  const esperado = (Math.sqrt(-2 * Math.log(r)) * 180) / Math.PI;
  assert.ok(Math.abs(dispersaoCircularDeg(r) - esperado) < 1e-9);
  assert.equal(dispersaoCircularDeg(0), 180);
  assert.equal(dispersaoCircularDeg(null), 180);
});
