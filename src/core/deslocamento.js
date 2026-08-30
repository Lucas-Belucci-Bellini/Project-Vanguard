/**
 * Distingue o trecho caminhado do trecho em veículo dentro de uma trilha.
 *
 * Numa peregrinação isso muda o significado do número: 60 km percorridos com
 * 25 km de ônibus não são 60 km caminhados, e somar tudo junto apaga a única
 * parte que a pessoa andou.
 *
 * **O que este módulo faz é inferência a partir de velocidade, não detecção.**
 * O celular não sabe que você está num ônibus; ele sabe a que velocidade a
 * posição mudou. Andar rápido ladeira abaixo, bicicleta e reflexão de sinal
 * produzem velocidade alta sem veículo, e um ônibus parado no trânsito produz
 * velocidade de pedestre. Por isso o resultado é uma **sugestão** com nível de
 * confiança, para a pessoa confirmar — nunca uma reclassificação silenciosa
 * do que ela registrou.
 *
 * Módulo puro: sem DOM, sem storage, sem relógio próprio.
 */

import { haversine } from '../engine/geo.js';
import { coordenadaValida, numeroFinito } from '../engine/numero-seguro.js';

export const MODOS_DESLOCAMENTO = Object.freeze({
  A_PE: 'A_PE',
  VEICULO: 'VEICULO',
  INDEFINIDO: 'INDEFINIDO',
});

export const CONFIANCA = Object.freeze({
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAIXA: 'BAIXA',
});

export const LIMITES_DESLOCAMENTO = Object.freeze({
  /** Acima disso já não é caminhada comum, mas ainda não afirmamos veículo. */
  velocidadeAPeMaxKmh: 8,
  /** A partir daqui a hipótese de veículo passa a ser sustentável. */
  velocidadeVeiculoMinKmh: 12,
  /** Evidência precisa durar: um pico isolado não é um trecho de ônibus. */
  janelaMinimaMs: 60_000,
  /** ~200 km/h entre dois fixos é erro de GPS, não deslocamento. */
  velocidadeAbsurdaKmh: 200,
});

const MS_POR_HORA = 3_600_000;

function pontoUtil(ponto) {
  const coordenada = coordenadaValida(ponto);
  const instante = numeroFinito(ponto?.createdAt ?? ponto?.timestamp);
  return coordenada && instante != null && instante >= 0 ? { ...coordenada, instante } : null;
}

function classificarVelocidade(kmh) {
  if (kmh == null) return MODOS_DESLOCAMENTO.INDEFINIDO;
  if (kmh <= LIMITES_DESLOCAMENTO.velocidadeAPeMaxKmh) return MODOS_DESLOCAMENTO.A_PE;
  if (kmh >= LIMITES_DESLOCAMENTO.velocidadeVeiculoMinKmh) return MODOS_DESLOCAMENTO.VEICULO;
  return MODOS_DESLOCAMENTO.INDEFINIDO;
}

function confiancaDe(segmento) {
  if (segmento.modo === MODOS_DESLOCAMENTO.INDEFINIDO) return CONFIANCA.BAIXA;
  if (segmento.duracaoMs >= 3 * LIMITES_DESLOCAMENTO.janelaMinimaMs) return CONFIANCA.ALTA;
  if (segmento.duracaoMs >= LIMITES_DESLOCAMENTO.janelaMinimaMs) return CONFIANCA.MEDIA;
  return CONFIANCA.BAIXA;
}

function trechosEntrePontos(pontos) {
  const trechos = [];
  for (let indice = 1; indice < pontos.length; indice += 1) {
    const anterior = pontos[indice - 1];
    const atual = pontos[indice];
    const duracaoMs = atual.instante - anterior.instante;
    if (duracaoMs <= 0) continue;
    const distanciaM = haversine(anterior, atual);
    const kmh = (distanciaM / 1000) / (duracaoMs / MS_POR_HORA);
    // Salto impossível: o fixo pulou, o corpo não. Some do cálculo em vez de
    // virar um "trecho de veículo" que nunca aconteceu.
    if (kmh > LIMITES_DESLOCAMENTO.velocidadeAbsurdaKmh) {
      trechos.push({ inicio: anterior.instante, fim: atual.instante, distanciaM: 0, duracaoMs, kmh: null, descartado: true });
      continue;
    }
    trechos.push({ inicio: anterior.instante, fim: atual.instante, distanciaM, duracaoMs, kmh, descartado: false });
  }
  return trechos;
}

function agrupar(trechos) {
  const segmentos = [];
  for (const trecho of trechos) {
    const modo = trecho.descartado ? MODOS_DESLOCAMENTO.INDEFINIDO : classificarVelocidade(trecho.kmh);
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo && ultimo.modo === modo) {
      ultimo.fim = trecho.fim;
      ultimo.distanciaM += trecho.distanciaM;
      ultimo.duracaoMs += trecho.duracaoMs;
      ultimo.descartados += trecho.descartado ? 1 : 0;
      continue;
    }
    segmentos.push({
      modo,
      inicio: trecho.inicio,
      fim: trecho.fim,
      distanciaM: trecho.distanciaM,
      duracaoMs: trecho.duracaoMs,
      descartados: trecho.descartado ? 1 : 0,
    });
  }
  return segmentos;
}

/** Veículo curto demais volta a ser indefinido: evidência fraca não vira afirmação. */
function rebaixarPicos(segmentos) {
  return segmentos.map((segmento) => (
    segmento.modo === MODOS_DESLOCAMENTO.VEICULO && segmento.duracaoMs < LIMITES_DESLOCAMENTO.janelaMinimaMs
      ? { ...segmento, modo: MODOS_DESLOCAMENTO.INDEFINIDO, rebaixado: true }
      : segmento
  ));
}

function fundirVizinhos(segmentos) {
  const fundidos = [];
  for (const segmento of segmentos) {
    const ultimo = fundidos[fundidos.length - 1];
    if (ultimo && ultimo.modo === segmento.modo) {
      ultimo.fim = segmento.fim;
      ultimo.distanciaM += segmento.distanciaM;
      ultimo.duracaoMs += segmento.duracaoMs;
      ultimo.descartados += segmento.descartados;
      continue;
    }
    fundidos.push({ ...segmento });
  }
  return fundidos;
}

/**
 * Separa a trilha em segmentos por modo de deslocamento.
 * O resultado descreve o que a velocidade sugere; confirmar é da pessoa.
 */
export function classificarDeslocamento(pontos = []) {
  const uteis = (Array.isArray(pontos) ? pontos : [])
    .map(pontoUtil)
    .filter(Boolean)
    .sort((a, b) => a.instante - b.instante);

  if (uteis.length < 2) {
    return {
      segmentos: [],
      distanciaAPeM: 0,
      distanciaVeiculoM: 0,
      distanciaIndefinidaM: 0,
      distanciaTotalM: 0,
      pontosConsiderados: uteis.length,
      saltosDescartados: 0,
    };
  }

  const trechos = trechosEntrePontos(uteis);
  const segmentos = fundirVizinhos(rebaixarPicos(agrupar(trechos)))
    .map((segmento) => ({
      ...segmento,
      velocidadeMediaKmh: segmento.duracaoMs > 0 ? (segmento.distanciaM / 1000) / (segmento.duracaoMs / MS_POR_HORA) : null,
      confianca: confiancaDe(segmento),
      inicioIso: new Date(segmento.inicio).toISOString(),
      fimIso: new Date(segmento.fim).toISOString(),
    }));

  const soma = (modo) => segmentos.filter((s) => s.modo === modo).reduce((total, s) => total + s.distanciaM, 0);

  return {
    segmentos,
    distanciaAPeM: soma(MODOS_DESLOCAMENTO.A_PE),
    distanciaVeiculoM: soma(MODOS_DESLOCAMENTO.VEICULO),
    distanciaIndefinidaM: soma(MODOS_DESLOCAMENTO.INDEFINIDO),
    distanciaTotalM: segmentos.reduce((total, s) => total + s.distanciaM, 0),
    pontosConsiderados: uteis.length,
    saltosDescartados: trechos.filter((trecho) => trecho.descartado).length,
  };
}

/**
 * Sugestão para a tela perguntar "você está em veículo?".
 * Olha só a janela recente, e só sugere quando a evidência se sustenta nela.
 */
export function sugerirModoAtual(pontos = [], { agora = Date.now(), janelaMs = 3 * LIMITES_DESLOCAMENTO.janelaMinimaMs } = {}) {
  const limite = numeroFinito(agora);
  // Filtra os pontos ORIGINAIS: `pontoUtil` renomeia o carimbo de tempo para
  // `instante`, e passar a forma já normalizada adiante faria a classificação
  // não achar mais o tempo e descartar tudo.
  const recentes = (Array.isArray(pontos) ? pontos : []).filter((ponto) => {
    const util = pontoUtil(ponto);
    return Boolean(util) && limite != null && util.instante >= limite - janelaMs;
  });

  if (recentes.length < 2) {
    return { modo: MODOS_DESLOCAMENTO.INDEFINIDO, confianca: CONFIANCA.BAIXA, motivo: 'Ainda não há fixos suficientes na janela recente.', velocidadeMediaKmh: null };
  }

  const analise = classificarDeslocamento(recentes);
  const dominante = [...analise.segmentos].sort((a, b) => b.duracaoMs - a.duracaoMs)[0] ?? null;
  if (!dominante || dominante.modo === MODOS_DESLOCAMENTO.INDEFINIDO) {
    return { modo: MODOS_DESLOCAMENTO.INDEFINIDO, confianca: CONFIANCA.BAIXA, motivo: 'A velocidade recente não sustenta nem caminhada nem veículo.', velocidadeMediaKmh: dominante?.velocidadeMediaKmh ?? null };
  }

  return {
    modo: dominante.modo,
    confianca: dominante.confianca,
    motivo: dominante.modo === MODOS_DESLOCAMENTO.VEICULO
      ? `A velocidade média recente é de ${dominante.velocidadeMediaKmh.toFixed(1)} km/h, acima do que uma caminhada sustenta.`
      : `A velocidade média recente é de ${dominante.velocidadeMediaKmh.toFixed(1)} km/h, compatível com caminhada.`,
    velocidadeMediaKmh: dominante.velocidadeMediaKmh,
  };
}
