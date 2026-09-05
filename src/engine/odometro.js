/**
 * Odômetro de trilha — quanto se andou de verdade.
 *
 * ## O defeito que este módulo existe para consertar
 *
 * A conta antiga somava `haversine`, que é **distância no plano**. Subir uma
 * escada desloca dois metros na horizontal e dez na vertical: para o
 * haversine, isso é ficar parado. O mesmo vale para a ladeira muito inclinada
 * de uma peregrinação — o trecho mais duro do dia é justamente o que menos
 * aparece numa conta 2D.
 *
 * ## Por que não basta somar tudo em 3D
 *
 * Somar cegamente todos os fixos **infla** a distância. O GPS treme parado: com
 * ±10 m de precisão, uma pessoa sentada acumula centenas de metros por hora de
 * puro ruído. Por isso cada segmento passa por uma peneira antes de contar, e a
 * peneira é **proporcional à precisão informada pelo aparelho**, não um número
 * fixo — dez metros de deslocamento significam coisas diferentes com ±3 m e
 * com ±40 m.
 *
 * ## A altitude do GPS é o dado mais fraco que existe aqui
 *
 * A incerteza vertical do GNSS é tipicamente **duas a três vezes a horizontal**:
 * onde a posição tem ±5 m, a altitude tem ±10 a ±15 m. Um lance de escada de
 * três metros está **abaixo do ruído** — e nenhuma conta salva isso. É por isso
 * que o ganho de elevação usa **histerese** (só confirma subida depois de
 * superar a banda de ruído) em vez de somar diferença a diferença, e é por isso
 * que dentro de prédio quem responde "você está andando" é o contador de
 * passos, não este módulo.
 *
 * Sem DOM, sem dependência, sem relógio próprio.
 */

import { haversine } from './geo.js';
import { numeroFinito } from './numero-seguro.js';

export const LIMITES_ODOMETRO = Object.freeze({
  /** Fixo pior que isto não entra na conta: é chute, não medida. */
  precisaoMaximaM: 50,
  /** Piso absoluto de deslocamento — abaixo disto é tremor, não caminhada. */
  ruidoMinimoM: 2.5,
  /**
   * O deslocamento precisa superar esta fração da precisão combinada dos dois
   * fixos. Duas leituras independentes de um aparelho parado com ±A de
   * precisão já diferem cerca de 0,7·A entre si; com fator 1,0 a peneira fica
   * em 1,41·A, acima do tremor. Baixar isso foi testado e deixa uma hora
   * sentado virar quilômetros.
   */
  fatorPrecisao: 1.0,
  /** Banda de ruído do altímetro: subida só conta depois de vencer isto. */
  histereseVerticalM: 6,
  /**
   * Acima de 150 % (~56°) não é ladeira, é salto de altitude do receptor —
   * glitch de altímetro produz milhares por cento. O teto não é 100 % porque
   * uma escada é ~45° e a trilha "muito reta" de uma peregrinação chega perto:
   * cortar ali jogaria fora justamente o trecho que mais custa subir. Quando o
   * teto estoura, só o componente vertical cai; o horizontal continua valendo.
   */
  inclinacaoMaximaPct: 150,
  /** Salto maior que isto entre dois fixos é erro, não deslocamento. */
  saltoAbsurdoM: 2000,
});

export const MOTIVOS_SEGMENTO = Object.freeze({
  CONTADO: 'CONTADO',
  PRECISAO_RUIM: 'PRECISAO_RUIM',
  ABAIXO_DO_RUIDO: 'ABAIXO_DO_RUIDO',
  SALTO_ABSURDO: 'SALTO_ABSURDO',
  COORDENADA_INVALIDA: 'COORDENADA_INVALIDA',
});

function coordenada(ponto) {
  const lat = numeroFinito(ponto?.lat);
  const lon = numeroFinito(ponto?.lon);
  if (lat === null || lon === null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function altitude(ponto) {
  const alt = numeroFinito(ponto?.altitude ?? ponto?.alt);
  // Fora desta faixa é dado corrompido, não relevo: o ponto mais baixo em
  // terra firme é o mar Morto (−430 m) e o mais alto é o Everest.
  return alt !== null && alt >= -500 && alt <= 9000 ? alt : null;
}

function precisao(ponto) {
  const valor = numeroFinito(ponto?.accuracy);
  return valor !== null && valor >= 0 ? valor : null;
}

/**
 * Peneira de um segmento: quanto ele precisa medir para não ser ruído.
 *
 * Precisão desconhecida cai no piso absoluto — não se inventa confiança para
 * um aparelho que não informou a dele.
 */
export function limiarDoSegmento(a, b, limites = LIMITES_ODOMETRO) {
  const pa = precisao(a);
  const pb = precisao(b);
  if (pa === null && pb === null) return limites.ruidoMinimoM;
  // Erros independentes somam em quadratura, não linearmente.
  const combinada = Math.hypot(pa ?? limites.ruidoMinimoM, pb ?? limites.ruidoMinimoM);
  return Math.max(limites.ruidoMinimoM, combinada * limites.fatorPrecisao);
}

/**
 * Distância entre dois fixos considerando o desnível.
 *
 * O componente vertical entra por Pitágoras sobre o plano da encosta. Ele é
 * descartado quando a inclinação resultante seria alta demais para ser relevo
 * real — nesse caso o que mudou foi a leitura de altitude, não o terreno.
 */
export function distancia3D(a, b, limites = LIMITES_ODOMETRO) {
  const ca = coordenada(a);
  const cb = coordenada(b);
  if (!ca || !cb) return null;

  const horizontalM = haversine(ca, cb);
  const altA = altitude(a);
  const altB = altitude(b);
  const desnivelBruto = altA !== null && altB !== null ? altB - altA : null;

  let verticalM = 0;
  let verticalDescartado = false;
  if (desnivelBruto !== null) {
    const inclinacaoPct = horizontalM > 0 ? Math.abs(desnivelBruto) / horizontalM * 100 : Infinity;
    if (inclinacaoPct <= limites.inclinacaoMaximaPct) verticalM = desnivelBruto;
    else verticalDescartado = true;
  }

  return {
    horizontalM,
    verticalM,
    desnivelBruto,
    verticalDescartado,
    totalM: Math.hypot(horizontalM, verticalM),
    inclinacaoPct: horizontalM > 0 ? (verticalM / horizontalM) * 100 : 0,
  };
}

/** Decide se um segmento entra na conta, e diz por quê quando não entra. */
export function avaliarSegmento(a, b, limites = LIMITES_ODOMETRO) {
  const medida = distancia3D(a, b, limites);
  if (!medida) return { conta: false, motivo: MOTIVOS_SEGMENTO.COORDENADA_INVALIDA, medida: null };

  const pa = precisao(a);
  const pb = precisao(b);
  if ((pa !== null && pa > limites.precisaoMaximaM) || (pb !== null && pb > limites.precisaoMaximaM)) {
    return { conta: false, motivo: MOTIVOS_SEGMENTO.PRECISAO_RUIM, medida };
  }
  if (medida.totalM > limites.saltoAbsurdoM) {
    return { conta: false, motivo: MOTIVOS_SEGMENTO.SALTO_ABSURDO, medida };
  }

  const limiar = limiarDoSegmento(a, b, limites);
  if (medida.totalM < limiar) {
    return { conta: false, motivo: MOTIVOS_SEGMENTO.ABAIXO_DO_RUIDO, medida, limiar };
  }
  return { conta: true, motivo: MOTIVOS_SEGMENTO.CONTADO, medida, limiar };
}

/**
 * Ganho e perda de elevação com histerese.
 *
 * Somar |Δalt| segmento a segmento é o erro clássico: com ±12 m de ruído
 * vertical, uma caminhada plana "acumula" centenas de metros de subida. Aqui a
 * referência só se move quando a altitude vence a banda de ruído, e é a
 * diferença confirmada que entra no total.
 */
export function elevacaoAcumulada(pontos = [], limites = LIMITES_ODOMETRO) {
  const alturas = (Array.isArray(pontos) ? pontos : [])
    .map((ponto) => (coordenada(ponto) ? altitude(ponto) : null))
    .filter((valor) => valor !== null);
  if (alturas.length < 2) return { ganhoM: 0, perdaM: 0, amostras: alturas.length };

  const banda = limites.histereseVerticalM;
  let referencia = alturas[0];
  let ganhoM = 0;
  let perdaM = 0;
  for (const altura of alturas.slice(1)) {
    const delta = altura - referencia;
    if (delta >= banda) { ganhoM += delta; referencia = altura; }
    else if (delta <= -banda) { perdaM += -delta; referencia = altura; }
  }
  return { ganhoM, perdaM, amostras: alturas.length };
}

/**
 * Odômetro da trilha inteira.
 *
 * Devolve também o que foi descartado e por quê: uma distância sem a contagem
 * de pontos recusados esconde justamente o caso em que o número está baixo
 * porque o aparelho não enxergou nada.
 */
export function medirTrilha(pontos = [], limites = LIMITES_ODOMETRO) {
  const lista = Array.isArray(pontos) ? pontos : [];
  const descartados = {
    [MOTIVOS_SEGMENTO.PRECISAO_RUIM]: 0,
    [MOTIVOS_SEGMENTO.ABAIXO_DO_RUIDO]: 0,
    [MOTIVOS_SEGMENTO.SALTO_ABSURDO]: 0,
    [MOTIVOS_SEGMENTO.COORDENADA_INVALIDA]: 0,
  };

  let distanciaM = 0;
  let horizontalM = 0;
  let segmentosContados = 0;
  // O ponto recusado NÃO vira a nova âncora: se ele virasse, uma sequência de
  // passos curtos nunca somaria nada. A âncora só anda quando um segmento
  // conta, então caminhada lenta acumula até vencer a peneira.
  let ancora = null;
  for (const ponto of lista) {
    if (!coordenada(ponto)) { descartados[MOTIVOS_SEGMENTO.COORDENADA_INVALIDA] += 1; continue; }
    if (ancora === null) { ancora = ponto; continue; }
    const resultado = avaliarSegmento(ancora, ponto, limites);
    if (resultado.conta) {
      distanciaM += resultado.medida.totalM;
      horizontalM += resultado.medida.horizontalM;
      segmentosContados += 1;
      ancora = ponto;
    } else {
      descartados[resultado.motivo] += 1;
      // A âncora NÃO se move para um fixo ruim. Se movesse, o próximo fixo bom
      // seria medido a partir de um ponto em que não se confia e o trecho
      // inteiro se perderia — perder distância andada é o pior erro deste
      // módulo. Só o salto absurdo reancora, porque ali houve descontinuidade
      // real e medir por cima dela inventaria um trecho que ninguém andou.
      if (resultado.motivo === MOTIVOS_SEGMENTO.SALTO_ABSURDO) ancora = ponto;
    }
  }

  const { ganhoM, perdaM } = elevacaoAcumulada(lista, limites);
  return {
    distanciaM,
    horizontalM,
    ganhoElevacaoM: ganhoM,
    perdaElevacaoM: perdaM,
    segmentosContados,
    descartados,
    pontos: lista.length,
  };
}
