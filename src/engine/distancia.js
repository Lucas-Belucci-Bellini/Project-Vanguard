/**
 * Distância percorrida — as três medidas, e a que é honesta.
 *
 * ## O defeito medido que este módulo existe para consertar
 *
 * `odometro.js` já resolve a parte difícil: soma segmento a segmento (não
 * primeiro→último), inclui desnível e peneira o tremor do GPS pela precisão do
 * fixo. O que ele não tinha era noção de **vão**.
 *
 * Medido na 1.6.0: uma caminhada de 100 m, três minutos sem sinal, e a pessoa
 * reaparece 400 m adiante, mais 100 m andados. O odômetro devolve **599 m**.
 * Só que 400 daqueles metros ninguém observou — o aparelho estava sem sinal, e
 * a linha reta entre os dois fixos é um palpite, não uma medição. Pode ter sido
 * 400 m em linha reta, pode ter sido 900 m contornando um quarteirão.
 *
 * Somar isso silenciosamente é inventar distância. Não somar e não dizer nada é
 * esconder que faltou informação. Este módulo faz a terceira coisa: **mede o
 * observado, e declara o não observado ao lado**.
 *
 * ## Três medidas, porque elas respondem perguntas diferentes
 *
 * | medida | o que é | quando serve |
 * |---|---|---|
 * | `bruta` | soma de tudo, sem peneira | teto absoluto; mostra quanto do total é ruído |
 * | `filtrada` | com a peneira do odômetro | o número que a interface mostra |
 * | `casada` | ajustada à malha viária | **`null` hoje** — não existe map matching, e fingir seria pior |
 *
 * `casada: null` é uma afirmação, não um esquecimento. Um campo que devolve a
 * distância filtrada com nome de "casada" faria a interface anunciar uma
 * precisão que não existe.
 *
 * Sem DOM, sem dependência, sem relógio próprio.
 */

import { LIMITES_ODOMETRO, avaliarSegmento, distancia3D, medirTrilha } from './odometro.js';
import { detectarVao } from './trilha-ponto.js';
import { coordenadaValida } from './numero-seguro.js';

/** Qual medida a interface deve exibir. Nunca ambígua. */
export const MEDIDAS = Object.freeze({
  BRUTA: 'bruta',
  FILTRADA: 'filtrada',
  CASADA: 'casada',
  OBSERVADA: 'observada',
});

/**
 * Soma tudo, sem peneira nenhuma.
 *
 * Serve de teto e de termômetro: a diferença entre bruta e filtrada é
 * exatamente quanto do total era tremor do sensor. Se as duas forem iguais, ou
 * o sinal estava perfeito, ou a peneira não está funcionando.
 */
export function distanciaBruta(pontos = [], limites = LIMITES_ODOMETRO) {
  const lista = Array.isArray(pontos) ? pontos : [];
  let distanciaM = 0;
  let segmentos = 0;
  let anterior = null;
  for (const ponto of lista) {
    if (!coordenadaValida(ponto)) continue;
    if (anterior) {
      const medida = distancia3D(anterior, ponto, limites);
      if (medida) { distanciaM += medida.totalM; segmentos += 1; }
    }
    anterior = ponto;
  }
  return { distanciaM, segmentos };
}

/**
 * Os vãos da trilha: onde faltou observação.
 *
 * Um ponto que já traz `vao` (gravado pelo Track Store) é respeitado; para
 * trilhas antigas, sem essa marca, o vão é detectado aqui pelos mesmos
 * critérios — assim a medição funciona igual para o que foi gravado antes e
 * depois da V3.
 */
export function vaosDaTrilha(pontos = [], opcoes = {}) {
  const lista = Array.isArray(pontos) ? pontos : [];
  const vaos = [];
  let anterior = null;
  let indiceAnterior = -1;

  for (const [indice, ponto] of lista.entries()) {
    if (!coordenadaValida(ponto)) continue;
    if (anterior) {
      const vao = ponto.vao ?? detectarVao(anterior, ponto, opcoes);
      if (vao) {
        const medida = distancia3D(anterior, ponto, LIMITES_ODOMETRO);
        vaos.push({
          de: indiceAnterior,
          para: indice,
          dtMs: vao.dtMs ?? null,
          /** A reta entre os dois fixos. NÃO é distância andada: é o que falta saber. */
          retaM: medida?.totalM ?? vao.metros ?? 0,
          motivo: vao.motivo,
        });
      }
    }
    anterior = ponto;
    indiceAnterior = indice;
  }
  return vaos;
}

/**
 * Mede a trilha e devolve as três medidas mais o que faltou observar.
 *
 * `observadaM` é o número honesto: distância medida sobre chão que o aparelho
 * realmente viu. É ele que a interface deve mostrar quando houver vão, com os
 * metros não observados ditos ao lado — e não a soma dos dois, que anunciaria
 * como andado um trecho que ninguém mediu.
 */
export function medirDistancia(pontos = [], { limites = LIMITES_ODOMETRO, vao = {} } = {}) {
  const lista = Array.isArray(pontos) ? pontos : [];
  const filtrada = medirTrilha(lista, limites);
  const bruta = distanciaBruta(lista, limites);
  const vaos = vaosDaTrilha(lista, vao);

  // Quanto da distância filtrada veio de segmentos que atravessam um vão.
  // Descontar isso é o que separa "medi 200 m" de "afirmei 599 m".
  let atravessandoVaoM = 0;
  for (const buraco of vaos) {
    const a = lista[buraco.de];
    const b = lista[buraco.para];
    if (!coordenadaValida(a) || !coordenadaValida(b)) continue;
    const avaliacao = avaliarSegmento(a, b, limites);
    // Só desconta o que a peneira TINHA contado: um vão que já foi recusado
    // como salto absurdo não está no total, e descontá-lo de novo tiraria
    // distância real.
    if (avaliacao.conta) atravessandoVaoM += avaliacao.medida.totalM;
  }

  const observadaM = Math.max(0, filtrada.distanciaM - atravessandoVaoM);
  const naoObservadaM = vaos.reduce((soma, v) => soma + v.retaM, 0);

  return {
    bruta,
    filtrada,
    /** Não existe map matching neste repositório. Fingir seria pior que faltar. */
    casada: null,
    vaos: {
      quantidade: vaos.length,
      lista: vaos,
      /** Soma das retas entre fixos separados por vão. É o que NÃO se sabe. */
      naoObservadaM,
      duracaoMs: vaos.reduce((soma, v) => soma + (v.dtMs ?? 0), 0),
      /** Quanto da distância filtrada era, na verdade, palpite sobre vão. */
      descontadoM: atravessandoVaoM,
    },
    /** Distância sobre chão observado. O número que se pode defender. */
    observadaM,
    /** O que a interface deve mostrar, e o rótulo que precisa aparecer junto. */
    exibicao: vaos.length
      ? {
        medida: MEDIDAS.OBSERVADA,
        metros: observadaM,
        rotulo: `${Math.round(observadaM)} m observados · ${Math.round(naoObservadaM)} m sem registro em ${vaos.length} ${vaos.length === 1 ? 'trecho' : 'trechos'}`,
      }
      : {
        medida: MEDIDAS.FILTRADA,
        metros: filtrada.distanciaM,
        rotulo: `${Math.round(filtrada.distanciaM)} m`,
      },
    /** Quanto do total bruto a peneira removeu como ruído. */
    ruidoRemovidoM: Math.max(0, bruta.distanciaM - filtrada.distanciaM),
    pontos: lista.length,
  };
}
