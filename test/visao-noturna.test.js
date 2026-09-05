import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAGNOSTICOS,
  LIMITES_VISAO_NOTURNA,
  PALETAS,
  alfaParaQuadros,
  amplificacaoPermitida,
  construirCurva,
  construirPaleta,
  criarVisaoNoturna,
  diferencaEsperadaDoRuido,
  expoenteAutomatico,
  ganhoDeEmpilhamento,
  gradienteMedio,
  histograma,
  luminancia,
  percentilDoHistograma,
  quadrosPermitidos,
  reduzirPlano,
  ruidoEspacial,
} from '../src/engine/visao-noturna.js';
import { reducaoDeRuido } from '../src/engine/rumo-filtro.js';

const L = 160;
const A = 120;
const N = L * A;

function sorteador(semente = 7) {
  let s = semente;
  const uniforme = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return () => Math.sqrt(-2 * Math.log(Math.max(1e-9, uniforme()))) * Math.cos(2 * Math.PI * uniforme());
}

/**
 * Cena escura realista: estrutura LISA (o mundo é correlacionado no espaço)
 * com ruído por pixel (que não é). Uma cena de textura aleatória por pixel
 * seria indistinguível de ruído por qualquer estatística espacial — testaria
 * o motor contra um caso que não existe.
 */
function cenaEm(x, y) {
  return 6 + 4 * Math.sin(x / 21 + 0.7) * Math.cos(y / 17) + 2.5 * Math.sin(x / 7.5 + y / 9);
}

function quadroDaCena(gauss, { desloca = 0, sigma = 3, luz = 1 } = {}) {
  const b = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < A; y += 1) {
    for (let x = 0; x < L; x += 1) {
      const i = y * L + x;
      const v = Math.max(0, Math.round(luz * cenaEm(x + desloca, y) + sigma * gauss()));
      b[i * 4] = v; b[i * 4 + 1] = v; b[i * 4 + 2] = v; b[i * 4 + 3] = 255;
    }
  }
  return b;
}

test('o ganho de empilhamento é a mesma álgebra do filtro da bússola', () => {
  // Os dois módulos usam a identidade Var(y) = α/(2−α)·Var(x). Se algum dia
  // uma delas for "corrigida" sozinha, este teste é quem avisa.
  for (const alfa of [0.05, 0.2, 0.5, 0.9, 1]) {
    assert.ok(Math.abs(ganhoDeEmpilhamento(alfa).fator - reducaoDeRuido(alfa).fator) < 1e-12, `α=${alfa}`);
  }
  const padrao = ganhoDeEmpilhamento(LIMITES_VISAO_NOTURNA.alfaParado);
  assert.ok(Math.abs(padrao.fator - 1 / 3) < 1e-12, 'o α padrão tem de dar exatamente 3× menos ruído');
  assert.ok(Math.abs(padrao.quadrosEquivalentes - 9) < 1e-12);
});

test('alfaParaQuadros é o inverso exato de quadrosEquivalentes', () => {
  for (const q of [1, 2, 4, 9, 20]) {
    const alfa = alfaParaQuadros(q);
    assert.ok(Math.abs(ganhoDeEmpilhamento(alfa).quadrosEquivalentes - q) < 1e-9, `q=${q}`);
  }
  assert.equal(alfaParaQuadros(1), 1, 'um quadro é não empilhar');
  assert.equal(alfaParaQuadros(0.5), 1);
});

test('parado, o ruído da imagem cai pelo menos três vezes por unidade de amplificação', () => {
  // A promessa central do modo noturno, medida — não afirmada. A comparação é
  // por unidade de amplificação porque a pilha AUTORIZA esticar mais; comparar
  // o ruído bruto premiaria a imagem mais escura.
  function medir(empilhar) {
    const gauss = sorteador();
    const motor = criarVisaoNoturna();
    let relatorio = null;
    for (let k = 0; k < 60; k += 1) relatorio = motor.processar(quadroDaCena(gauss), L, A, { empilhar });
    const b = quadroDaCena(gauss);
    relatorio = motor.processar(b, L, A, { empilhar });
    // Desvio em relação aos vizinhos a 3 px: mede ruído, não a estrutura lisa.
    let soma2 = 0;
    let n = 0;
    for (let y = 40; y < 80; y += 1) {
      for (let x = 3; x < L - 3; x += 1) {
        const centro = b[(y * L + x) * 4 + 1];
        const vizinhos = (b[(y * L + x - 3) * 4 + 1] + b[(y * L + x + 3) * 4 + 1]) / 2;
        soma2 += (centro - vizinhos) ** 2;
        n += 1;
      }
    }
    return Math.sqrt(soma2 / n) / relatorio.amplificacao;
  }
  const ganho = medir(false) / medir(true);
  assert.ok(ganho >= 3, `o ruído caiu apenas ${ganho.toFixed(2)}×`);
});

test('parado, a pilha chega aos nove quadros; varrendo, ela encolhe', () => {
  function quadrosEmRegime(passo) {
    const gauss = sorteador(11);
    const motor = criarVisaoNoturna();
    let soma = 0;
    let n = 0;
    for (let k = 0; k < 80; k += 1) {
      const r = motor.processar(quadroDaCena(gauss, { desloca: k * passo }), L, A);
      if (k >= 40) { soma += r.quadrosEquivalentes; n += 1; }
    }
    return soma / n;
  }
  const parado = quadrosEmRegime(0);
  const devagar = quadrosEmRegime(2);
  const rapido = quadrosEmRegime(12);
  assert.ok(parado > 8.9, `parado empilhou só ${parado.toFixed(1)} quadros`);
  assert.ok(devagar < parado, `varrendo devagar (${devagar.toFixed(1)}) não encolheu a pilha`);
  assert.ok(rapido < devagar, `varrendo rápido (${rapido.toFixed(1)}) empilhou mais que devagar`);
  assert.ok(rapido < 3, `varrendo rápido ainda empilhou ${rapido.toFixed(1)} quadros`);
});

test('a amplificação nunca passa do que o ruído removido autoriza', () => {
  const gauss = sorteador(3);
  for (const empilhar of [true, false]) {
    const motor = criarVisaoNoturna();
    for (let k = 0; k < 40; k += 1) {
      const r = motor.processar(quadroDaCena(gauss, { luz: 0.4 }), L, A, { empilhar });
      assert.ok(
        r.amplificacao <= r.amplificacaoMaxima + 1e-9,
        `amplificou ${r.amplificacao.toFixed(2)}× com teto de ${r.amplificacaoMaxima.toFixed(2)}×`,
      );
    }
  }
});

test('a pilha cheia autoriza exatamente três vezes mais esticamento', () => {
  const base = amplificacaoPermitida(1);
  const empilhada = amplificacaoPermitida(ganhoDeEmpilhamento(0.2).fator);
  assert.ok(Math.abs(empilhada / base - 3) < 1e-9, `deu ${(empilhada / base).toFixed(3)}×`);
});

test('no breu o motor diz que está no breu, em vez de mostrar ruído pintado', () => {
  // A regra que separa isto de um app que promete ver no escuro total: sem
  // fóton não há amplificação possível, e o operador precisa saber.
  const motor = criarVisaoNoturna();
  let relatorio = null;
  for (let k = 0; k < 10; k += 1) relatorio = motor.processar(new Uint8ClampedArray(N * 4), L, A);
  assert.equal(relatorio.diagnostico, DIAGNOSTICOS.ESCURO_DEMAIS);
  assert.equal(relatorio.luzMedia, 0);
});

test('cena escura mas com sinal é levada para um cinza legível', () => {
  const gauss = sorteador(5);
  const motor = criarVisaoNoturna();
  let relatorio = null;
  for (let k = 0; k < 40; k += 1) relatorio = motor.processar(quadroDaCena(gauss), L, A);
  assert.equal(relatorio.diagnostico, DIAGNOSTICOS.OK);
  assert.ok(relatorio.luzMedia < 12, `a cena de teste não estava escura: ${relatorio.luzMedia}`);
  const alvo = LIMITES_VISAO_NOTURNA.alvoMediana;
  assert.ok(
    Math.abs(relatorio.luzMediaSaida - alvo) < alvo * 0.35,
    `a saída ficou em ${relatorio.luzMediaSaida.toFixed(1)}, longe do alvo ${alvo}`,
  );
});

test('a curva nunca escurece a cena', () => {
  // Visão noturna que escurece sombra não tem para que existir.
  assert.ok(expoenteAutomatico(10) <= 1);
  assert.ok(expoenteAutomatico(250) <= 1);
  assert.equal(expoenteAutomatico(0), LIMITES_VISAO_NOTURNA.expoenteMinimo);
  // Mediana escura tem de levantar mais que mediana clara.
  assert.ok(expoenteAutomatico(20) < expoenteAutomatico(90));
  // E o expoente escolhido tem de levar a mediana ao alvo.
  const m = 40;
  const e = expoenteAutomatico(m);
  const resultado = 255 * Math.pow(m / 255, e);
  assert.ok(Math.abs(resultado - LIMITES_VISAO_NOTURNA.alvoMediana) < 2, `levou a ${resultado.toFixed(1)}`);
});

test('a luminância usa Rec. 601 e os pesos somam um', () => {
  assert.ok(Math.abs(luminancia(255, 255, 255) - 255) < 1e-9);
  assert.equal(luminancia(0, 0, 0), 0);
  // O verde pesa mais: é dele que vem quase todo o sinal no escuro.
  assert.ok(luminancia(0, 100, 0) > luminancia(100, 0, 0));
  assert.ok(luminancia(100, 0, 0) > luminancia(0, 0, 100));
});

test('as paletas são monótonas e cada uma tem a cor que promete', () => {
  for (const nome of Object.values(PALETAS)) {
    const paleta = construirPaleta(nome);
    assert.equal(paleta.length, 768);
    for (let v = 1; v < 256; v += 1) {
      for (let c = 0; c < 3; c += 1) {
        assert.ok(paleta[v * 3 + c] >= paleta[(v - 1) * 3 + c], `${nome} canal ${c} desce em ${v}`);
      }
    }
  }
  const fosforo = construirPaleta(PALETAS.FOSFORO);
  assert.ok(fosforo[255 * 3 + 1] > fosforo[255 * 3], 'fósforo tem de ser verde');
  const vermelho = construirPaleta(PALETAS.VERMELHO);
  assert.ok(vermelho[255 * 3] > vermelho[255 * 3 + 1] * 4, 'vermelho preserva a visão noturna');
  const cinza = construirPaleta(PALETAS.CINZA);
  assert.equal(cinza[128 * 3], cinza[128 * 3 + 1]);
  assert.equal(cinza[128 * 3 + 1], cinza[128 * 3 + 2]);
  // Nome desconhecido cai no fósforo em vez de estourar.
  assert.deepEqual(construirPaleta('INVENTADA'), fosforo);
});

test('o histograma e os percentis descrevem o plano', () => {
  const plano = new Float32Array(1000);
  for (let i = 0; i < 1000; i += 1) plano[i] = i < 500 ? 10 : 200;
  const hist = histograma(plano);
  assert.equal(hist[10], 500);
  assert.equal(hist[200], 500);
  assert.equal(percentilDoHistograma(hist, 1000, 0.25), 10);
  assert.equal(percentilDoHistograma(hist, 1000, 0.75), 200);
  assert.equal(percentilDoHistograma(hist, 0, 0.5), 0);
});

test('o ruído espacial recupera o desvio que foi injetado', () => {
  // Cena LISA com ruído conhecido: a mediana das diferenças entre vizinhos tem
  // de devolver o σ que entrou. É o que sustenta o desconto de ruído.
  const gauss = sorteador(21);
  const plano = new Float32Array(N);
  const sigma = 4;
  for (let i = 0; i < N; i += 1) plano[i] = 128 + sigma * gauss();
  const medido = ruidoEspacial(plano, L, A);
  assert.ok(Math.abs(medido - sigma) < 1.2, `estimou σ=${medido.toFixed(2)} para σ=${sigma}`);
  assert.equal(ruidoEspacial(plano, 1, 1), 0);
});

test('a diferença esperada do ruído segue 2σ/√π', () => {
  assert.ok(Math.abs(diferencaEsperadaDoRuido(3) - (2 * 3) / Math.sqrt(Math.PI)) < 1e-12);
  assert.equal(diferencaEsperadaDoRuido(0), 0);
  assert.equal(diferencaEsperadaDoRuido(null), 0);
});

test('reduzir o plano divide o ruído sem apagar a estrutura', () => {
  const gauss = sorteador(33);
  const plano = new Float32Array(N);
  for (let i = 0; i < N; i += 1) plano[i] = 100 + 5 * gauss();
  const grosso = reduzirPlano(plano, L, A, 8);
  assert.equal(grosso.largura, 20);
  assert.equal(grosso.altura, 15);
  // A média de 64 pixels tem σ oito vezes menor: o gradiente grosso desaba.
  assert.ok(gradienteMedio(grosso.dados, grosso.largura, grosso.altura) < gradienteMedio(plano, L, A) / 4);
  // Já uma rampa (estrutura de verdade) sobrevive à redução.
  const rampa = new Float32Array(N);
  for (let y = 0; y < A; y += 1) for (let x = 0; x < L; x += 1) rampa[y * L + x] = x;
  const rampaGrossa = reduzirPlano(rampa, L, A, 8);
  assert.ok(Math.abs(gradienteMedio(rampaGrossa.dados, rampaGrossa.largura, rampaGrossa.altura) - 8) < 0.5);
});

test('quadrosPermitidos respeita os extremos da retenção', () => {
  assert.ok(Math.abs(quadrosPermitidos(1) - 9) < 1e-9);
  assert.equal(quadrosPermitidos(LIMITES_VISAO_NOTURNA.retencaoMinima), 1);
  assert.equal(quadrosPermitidos(0), 1);
  assert.ok(quadrosPermitidos(0.9) > 1 && quadrosPermitidos(0.9) < 9);
});

test('a curva junta esticamento, expoente e ganho num passe só', () => {
  const curva = construirCurva({ pretoEm: 10, brancoEm: 110, expoente: 1, ganho: 1 });
  assert.equal(curva[10], 0);
  assert.equal(curva[110], 255);
  assert.equal(curva[5], 0, 'abaixo do preto satura em zero');
  assert.equal(curva[200], 255, 'acima do branco satura em 255');
  assert.equal(curva[60], 128);
  // O ganho multiplica depois da curva e satura sem estourar o tipo.
  const comGanho = construirCurva({ pretoEm: 0, brancoEm: 255, expoente: 1, ganho: 4 });
  assert.equal(comGanho[255], 255);
});

test('buffer menor que a imagem declarada é recusado, não lido pela metade', () => {
  const motor = criarVisaoNoturna();
  assert.throws(() => motor.processar(new Uint8ClampedArray(100), L, A), /menor que a largura/i);
  assert.throws(() => motor.processar(null, L, A), /menor que a largura/i);
});

test('mudar a resolução recomeça a pilha em vez de misturar imagens', () => {
  const gauss = sorteador(44);
  const motor = criarVisaoNoturna();
  for (let k = 0; k < 10; k += 1) motor.processar(quadroDaCena(gauss), L, A);
  assert.equal(motor.estado().quadros, 10);
  const menor = new Uint8ClampedArray(80 * 60 * 4);
  const r = motor.processar(menor, 80, 60);
  assert.equal(r.quadros, 1);
  assert.equal(motor.estado().largura, 80);
});

test('a saída é escrita no próprio buffer e fica opaca', () => {
  const gauss = sorteador(55);
  const motor = criarVisaoNoturna();
  const b = quadroDaCena(gauss);
  const antes = b.slice(0, 4);
  motor.processar(b, L, A);
  assert.notDeepEqual(Array.from(b.slice(0, 4)), Array.from(antes), 'o buffer tem de ser reescrito');
  for (let p = 3; p < b.length; p += 4) {
    if (b[p] !== 255) assert.fail(`alfa ${b[p]} no pixel ${(p - 3) / 4}`);
  }
});

test('trocar a paleta muda a cor sem reiniciar a pilha', () => {
  const gauss = sorteador(66);
  const motor = criarVisaoNoturna();
  for (let k = 0; k < 20; k += 1) motor.processar(quadroDaCena(gauss), L, A);
  const quadrosAntes = motor.estado().quadros;
  assert.equal(motor.trocarPaleta(PALETAS.VERMELHO), PALETAS.VERMELHO);
  const b = quadroDaCena(gauss);
  const r = motor.processar(b, L, A);
  assert.equal(r.paleta, PALETAS.VERMELHO);
  assert.equal(r.quadros, quadrosAntes + 1);
  // Vermelho: o canal vermelho domina em qualquer pixel aceso.
  let acesos = 0;
  for (let p = 0; p < b.length; p += 4) if (b[p] > 40) { assert.ok(b[p] > b[p + 1]); acesos += 1; }
  assert.ok(acesos > 0, 'a imagem saiu apagada');
  assert.equal(motor.trocarPaleta('NAO_EXISTE'), PALETAS.FOSFORO);
});
