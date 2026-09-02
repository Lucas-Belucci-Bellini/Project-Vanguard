/**
 * Filtro de rumo: transformar a leitura tremida da bússola numa agulha legível.
 *
 * ## Por que não dá para suavizar em graus
 *
 * A média de 359° e 1° é 180° — o sul exato, o oposto do certo. Qualquer filtro
 * que trate rumo como número comum quebra ao cruzar o norte, e ele cruza o
 * norte o tempo todo. Aqui a leitura é convertida no vetor unitário
 * (cos, sen), o filtro roda **no vetor**, e o ângulo só volta a existir no
 * final. O problema do salto some porque o salto nunca existiu: 359° e 1° são
 * vizinhos no círculo, e vetores vizinhos somam como vizinhos.
 *
 * ## Quanto isto melhora, e por quê exatamente três vezes
 *
 * A média exponencial `y = α·x + (1−α)·y` reduz a variância do ruído por um
 * fator `α/(2−α)` em regime — é álgebra, não estimativa. Com **α = 0,2** esse
 * fator é `0,2/1,8 = 1/9`, e o desvio padrão (a raiz) cai para **1/3**: a
 * agulha treme **três vezes menos** com a mesma leitura entrando. É o mesmo
 * que empilhar 9 leituras, guardando uma só.
 *
 * O preço é atraso: a média arrasta cerca de `(1−α)/α` amostras, ~4 leituras.
 * Parado isso não se percebe; girando, sim — uma agulha atrasada é pior do que
 * uma agulha trêmula, porque ela aponta para onde você **estava**. Por isso o α
 * é adaptativo: sobe até 0,6 quando o aparelho gira, e desce para 0,2 quando
 * para. A mesma ideia assimétrica do piso da escuta — suavizar só onde
 * suavizar não custa informação.
 *
 * ## O filtro também diz quando NÃO acreditar nele
 *
 * Ferro, ímã de capa e alto-falante entortam a leitura sem avisar. O módulo
 * mede a dispersão circular das últimas leituras pelo comprimento do vetor
 * médio R: `σ = √(−2·ln R)` (desvio padrão circular, Mardia). R perto de 1 é
 * leitura firme; R baixo com o aparelho parado é interferência — e aí a tela
 * precisa dizer isso, em vez de mostrar um número bonito e errado.
 *
 * Módulo puro: sem DOM, sem sensor, sem relógio próprio.
 */

import { normDeg, deltaDeg } from './angles.js';
import { numeroFinito } from './numero-seguro.js';

export const LIMITES_RUMO = Object.freeze({
  /** Parado: σ do ruído cai a 1/3 (α/(2−α) = 1/9). Não mexa sem refazer a conta. */
  alfaParado: 0.2,
  /** Girando: segue o sensor de perto, porque atraso vira erro de direção. */
  alfaGirando: 0.6,
  /** Acima desta velocidade de giro o α já está no máximo. */
  giroPlenoDegPorS: 45,
  /** Abaixo disto é aparelho parado: 8°/s é uma volta inteira em 45 s. */
  giroMortoDegPorS: 8,
  /** Leituras guardadas para medir dispersão. */
  janelaEstabilidade: 24,
  /** Dispersão acima disso a leitura não é firme. */
  dispersaoMaximaDeg: 12,
  /** Retidão mínima para chamar a dispersão de giro em vez de interferência. */
  retidaoMinima: 0.35,
  /** Hiato maior que isto quebra a continuidade: o filtro recomeça. */
  intervaloMaximoMs: 2000,
  /** Base de tempo para medir giro. Curta demais, o ruído vira "giro". */
  baseGiroMs: 500,
  /** Abaixo disto não há amostras para afirmar nada sobre estabilidade. */
  amostrasMinimas: 6,
});

export const QUALIDADES_RUMO = Object.freeze({
  INSUFICIENTE: 'INSUFICIENTE',
  ESTAVEL: 'ESTAVEL',
  INSTAVEL: 'INSTAVEL',
  INTERFERENCIA: 'INTERFERENCIA',
});

const RAD = Math.PI / 180;

/**
 * Redução de ruído de uma média exponencial, em regime.
 * `fator` é quanto o desvio padrão da saída vale em relação ao da entrada:
 * 1/3 significa "treme três vezes menos".
 */
export function reducaoDeRuido(alfa) {
  const a = numeroFinito(alfa);
  if (a == null || a <= 0 || a > 1) return { fator: 1, variancia: 1, amostrasEquivalentes: 1 };
  const variancia = a / (2 - a);
  return {
    fator: Math.sqrt(variancia),
    variancia,
    // Quantas leituras uma média simples precisaria para o mesmo resultado.
    amostrasEquivalentes: (2 - a) / a,
  };
}

/** Desvio padrão circular (Mardia) a partir do comprimento do vetor médio. */
export function dispersaoCircularDeg(comprimentoMedio) {
  const r = numeroFinito(comprimentoMedio);
  if (r == null || r <= 0) return 180;
  if (r >= 1) return 0;
  return Math.sqrt(-2 * Math.log(r)) / RAD;
}

/**
 * Média circular de uma lista de rumos em graus.
 * Devolve `null` quando as leituras se cancelam (vetor médio nulo) — o que é
 * honesto: não existe "direção média" de leituras opostas.
 */
export function mediaCircularDeg(rumos = []) {
  let x = 0;
  let y = 0;
  let contadas = 0;
  for (const rumo of rumos) {
    const valor = numeroFinito(rumo);
    if (valor == null) continue;
    x += Math.cos(valor * RAD);
    y += Math.sin(valor * RAD);
    contadas += 1;
  }
  if (!contadas) return null;
  const comprimento = Math.hypot(x, y) / contadas;
  if (comprimento < 1e-9) return null;
  return { rumoDeg: normDeg(Math.atan2(y, x) / RAD), comprimento, amostras: contadas };
}

function alfaDoGiro(taxaDegPorS, limites) {
  const taxa = Math.abs(numeroFinito(taxaDegPorS) ?? 0);
  // Zona morta: sem ela o próprio tremor residual do sinal filtrado é lido
  // como giro lento, o α sobe sozinho e o ganho de 3× nunca chega parado.
  const util = Math.max(0, taxa - limites.giroMortoDegPorS);
  const faixa = Math.max(1e-6, limites.giroPlenoDegPorS - limites.giroMortoDegPorS);
  const fracao = Math.min(1, util / faixa);
  return limites.alfaParado + (limites.alfaGirando - limites.alfaParado) * fracao;
}

/**
 * Retidão: o quanto as leituras da janela caminham numa direção, entre 0 e 1.
 * Girar 90° é um trajeto reto (retidão ~1). Tremer 90° para lá e para cá anda
 * muito e não sai do lugar (retidão ~0). É o que separa "está girando" de
 * "tem ferro por perto" sem precisar de outro sensor.
 */
export function retidaoDaJanela(rumos = []) {
  if (rumos.length < 2) return 1;
  let percurso = 0;
  for (let i = 1; i < rumos.length; i += 1) percurso += Math.abs(deltaDeg(rumos[i - 1], rumos[i]));
  if (percurso <= 1e-9) return 1;
  return Math.min(1, Math.abs(deltaDeg(rumos[0], rumos[rumos.length - 1])) / percurso);
}

/**
 * Filtro com memória. Alimente com a leitura crua do sensor e o instante;
 * ele devolve o rumo suavizado, o quanto ele está girando e o quanto se pode
 * confiar naquilo.
 */
export function criarFiltroDeRumo(limites = {}) {
  const cfg = { ...LIMITES_RUMO, ...limites };
  let x = null;
  let y = null;
  let ultimoMs = null;
  let ultimoFiltradoDeg = null;
  let taxaGiroDegPorS = 0;
  let alfaAtual = cfg.alfaParado;
  const janela = [];
  const trilhoFiltrado = [];

  function reiniciar() {
    x = null;
    y = null;
    ultimoMs = null;
    ultimoFiltradoDeg = null;
    taxaGiroDegPorS = 0;
    alfaAtual = cfg.alfaParado;
    janela.length = 0;
    trilhoFiltrado.length = 0;
  }

  /**
   * Velocidade de giro medida no rumo JÁ FILTRADO, sobre uma base de tempo
   * longa. Medir na leitura crua entre dois quadros seria medir o ruído: a
   * 16 Hz, 3° de tremor viram 48°/s de "giro" que não existe, o α abriria
   * sozinho e o filtro devolveria justamente o tremor que ele tirou.
   */
  function estimarGiro(agoraMs, filtradoDeg) {
    if (agoraMs == null) return 0;
    trilhoFiltrado.push({ deg: filtradoDeg, ms: agoraMs });
    while (trilhoFiltrado.length > 2 && agoraMs - trilhoFiltrado[1].ms >= cfg.baseGiroMs) trilhoFiltrado.shift();
    const antigo = trilhoFiltrado[0];
    const dtS = (agoraMs - antigo.ms) / 1000;
    if (dtS <= 0) return taxaGiroDegPorS;
    return deltaDeg(antigo.deg, filtradoDeg) / dtS;
  }

  function medirJanela() {
    if (janela.length < cfg.amostrasMinimas) {
      return { qualidade: QUALIDADES_RUMO.INSUFICIENTE, dispersaoDeg: null, comprimento: null };
    }
    let sx = 0;
    let sy = 0;
    for (const rumo of janela) {
      sx += Math.cos(rumo * RAD);
      sy += Math.sin(rumo * RAD);
    }
    const comprimento = Math.hypot(sx, sy) / janela.length;
    const dispersaoDeg = dispersaoCircularDeg(comprimento);
    const retidao = retidaoDaJanela(janela);
    if (dispersaoDeg <= cfg.dispersaoMaximaDeg) {
      return { qualidade: QUALIDADES_RUMO.ESTAVEL, dispersaoDeg, comprimento, retidao };
    }
    // Dispersão alta tem duas causas opostas, e confundi-las é grave: girar é
    // normal, ímã perto é motivo para não confiar no número. Quem separa as
    // duas é a retidão, não a velocidade.
    return {
      qualidade: retidao >= cfg.retidaoMinima ? QUALIDADES_RUMO.INSTAVEL : QUALIDADES_RUMO.INTERFERENCIA,
      dispersaoDeg,
      comprimento,
      retidao,
    };
  }

  function estadoAtual(bruto = null) {
    const { qualidade, dispersaoDeg, comprimento, retidao } = medirJanela();
    const reducao = reducaoDeRuido(alfaAtual);
    return {
      rumoDeg: ultimoFiltradoDeg,
      brutoDeg: bruto,
      amostras: janela.length,
      alfa: alfaAtual,
      taxaGiroDegPorS,
      dispersaoDeg,
      comprimentoMedio: comprimento,
      retidao: retidao ?? null,
      qualidade,
      estavel: qualidade === QUALIDADES_RUMO.ESTAVEL,
      fatorRuido: reducao.fator,
      amostrasEquivalentes: reducao.amostrasEquivalentes,
    };
  }

  return {
    reiniciar,
    estado: () => estadoAtual(),
    /**
     * @param {object} leitura
     * @param {number} leitura.rumoDeg leitura crua do sensor
     * @param {number} [leitura.emMs] instante da leitura
     */
    adicionar({ rumoDeg, emMs = null } = {}) {
      const rumo = numeroFinito(rumoDeg);
      if (rumo == null) return estadoAtual(null);
      const bruto = normDeg(rumo);
      const instante = numeroFinito(emMs);

      // Um hiato longo significa que o sensor ficou desligado ou a tela apagou.
      // Continuar a média a partir de uma leitura velha é fingir continuidade
      // que não houve.
      if (ultimoMs != null && instante != null && instante - ultimoMs > cfg.intervaloMaximoMs) reiniciar();

      if (x == null || y == null || ultimoFiltradoDeg == null) {
        x = Math.cos(bruto * RAD);
        y = Math.sin(bruto * RAD);
        ultimoFiltradoDeg = bruto;
        alfaAtual = cfg.alfaParado;
        taxaGiroDegPorS = 0;
        trilhoFiltrado.length = 0;
        if (instante != null) trilhoFiltrado.push({ deg: bruto, ms: instante });
      } else {
        // O α da vez usa o giro medido ATÉ AQUI: abrir o filtro com a mesma
        // leitura que ele ainda vai processar realimentaria o ruído.
        alfaAtual = alfaDoGiro(taxaGiroDegPorS, cfg);
        x = alfaAtual * Math.cos(bruto * RAD) + (1 - alfaAtual) * x;
        y = alfaAtual * Math.sin(bruto * RAD) + (1 - alfaAtual) * y;
        if (Math.hypot(x, y) > 1e-9) ultimoFiltradoDeg = normDeg(Math.atan2(y, x) / RAD);
        taxaGiroDegPorS = estimarGiro(instante, ultimoFiltradoDeg);
      }

      if (instante != null) ultimoMs = instante;
      janela.push(bruto);
      if (janela.length > cfg.janelaEstabilidade) janela.shift();
      return estadoAtual(bruto);
    },
  };
}
