/**
 * O ponto de trilha: o que se guarda dele, e o que se pode dizer sobre ele.
 *
 * ## Duas regras que este módulo existe para não deixar quebrar
 *
 * **Não descartar precisão.** O ponto que chega do GPS traz `accuracy`,
 * `altitude`, `speed`, `heading` e a fonte que o produziu. Guardar só
 * latitude e longitude é jogar fora justamente o que permite, depois, separar
 * um deslocamento real de um tremor do sensor — e essa informação não volta.
 *
 * **Um ponto ruim não destrói a trilha.** Classificar não é filtrar: o ponto
 * suspeito é *marcado*, não apagado. Quem decide o que fazer com ele é o
 * consumidor — a distância pode ignorá-lo, o mapa pode desenhá-lo em outra cor,
 * e a exportação leva tudo. Apagar na entrada é perder sem recurso.
 *
 * ## Por que "salto impossível" e não "salto grande"
 *
 * O teste de outlier aqui não é uma distância mágica: é velocidade implícita
 * contra o tempo decorrido, com uma folga proporcional à incerteza dos dois
 * fixos. Dois pontos a 300 m de distância são normais com 20 s entre eles e
 * absurdos com 1 s — e com `accuracy` de 100 m em cada, 300 m podem ser só o
 * ruído se somando. Um limiar fixo em metros erra os dois casos.
 *
 * Módulo puro: sem DOM, sem rede, sem relógio próprio.
 */

import { haversine } from './geo.js';
import { numeroFinito, coordenadaValida } from './numero-seguro.js';

/** O que se pode dizer sobre um ponto. Nunca é motivo para apagá-lo. */
export const QUALIDADE_PONTO = Object.freeze({
  /** Coordenada válida e coerente com o ponto anterior. */
  VALIDO: 'VALIDO',
  /** Coordenada válida, mas com incerteza alta demais para medir distância. */
  BAIXA_PRECISAO: 'BAIXA_PRECISAO',
  /** Exigiria uma velocidade que o meio de transporte declarado não alcança. */
  OUTLIER: 'OUTLIER',
  /** Praticamente o mesmo lugar e o mesmo instante do ponto anterior. */
  DUPLICADO: 'DUPLICADO',
  /** Chegou fora de ordem: o relógio dele é anterior ao do ponto já gravado. */
  ANTIGO: 'ANTIGO',
  /** Não é uma posição: coordenada ausente ou fora da faixa. */
  INVALIDO: 'INVALIDO',
});

/**
 * Velocidade máxima plausível por modo, em m/s, com folga.
 *
 * Não são recordes: são tetos acima dos quais o ponto quase certamente é um
 * salto do sensor, e não deslocamento. O modo `DESCONHECIDO` usa o teto mais
 * largo de propósito — na dúvida, marcar de menos é melhor que marcar de mais.
 */
export const VELOCIDADE_MAXIMA_MS = Object.freeze({
  PE: 12,          // corrida de elite passa de 10 m/s em pista curta
  BICICLETA: 25,
  VEICULO: 70,     // 252 km/h
  DESCONHECIDO: 90,
});

/** Acima disto o fixo não sustenta medição de distância (raio de 95%). */
export const PRECISAO_RUIM_M = 50;

/** Abaixo destes dois, ao mesmo tempo, o ponto é repetição e não movimento. */
export const DUPLICADO_METROS = 0.5;
export const DUPLICADO_MS = 1000;

/**
 * Vão sem sinal. Acima disto, os dois pontos NÃO são um segmento: ligá-los
 * desenharia uma reta por cima do que não foi observado, e somaria à distância
 * um trecho que ninguém mediu.
 */
export const VAO_MS = 120_000;
export const VAO_METROS = 500;

/**
 * Normaliza uma leitura preservando tudo que ela trouxer.
 *
 * Campo ausente fica ausente — nunca vira `0`. `Number(null)` é `0`, e uma
 * altitude 0 inventada é indistinguível do nível do mar; uma `accuracy` 0
 * inventada diz "fixo perfeito" e envenena qualquer decisão adiante.
 */
export function normalizarPontoTrilha(leitura, { seq = null } = {}) {
  const coordenada = coordenadaValida(leitura);
  if (!coordenada) return null;

  const ponto = { lat: coordenada.lat, lon: coordenada.lon };

  const timestamp = numeroFinito(leitura?.timestamp) ?? numeroFinito(leitura?.createdAt) ?? numeroFinito(leitura?.tempoMs);
  if (timestamp != null) ponto.timestamp = timestamp;

  const accuracy = numeroFinito(leitura?.accuracy);
  if (accuracy != null && accuracy >= 0) ponto.accuracy = accuracy;

  const altitude = numeroFinito(leitura?.altitude);
  if (altitude != null) ponto.altitude = altitude;

  const altitudeAccuracy = numeroFinito(leitura?.altitudeAccuracy);
  if (altitudeAccuracy != null && altitudeAccuracy >= 0) ponto.altitudeAccuracy = altitudeAccuracy;

  const speed = numeroFinito(leitura?.speed);
  if (speed != null && speed >= 0) ponto.speed = speed;

  const heading = numeroFinito(leitura?.heading);
  if (heading != null) ponto.heading = heading;

  if (typeof leitura?.provider === 'string' && leitura.provider) ponto.provider = leitura.provider;
  else if (typeof leitura?.fonte === 'string' && leitura.fonte) ponto.provider = leitura.fonte;

  if (typeof leitura?.modo === 'string' && leitura.modo) ponto.modo = leitura.modo;
  if (seq != null) ponto.seq = seq;

  return ponto;
}

/**
 * Diz o que se pode afirmar sobre `ponto` em relação a `anterior`.
 *
 * Devolve sempre um motivo legível: um ponto marcado sem explicação vira
 * decisão que ninguém consegue auditar depois.
 */
export function classificarPonto(ponto, anterior = null, { velocidadeMaximaMs = VELOCIDADE_MAXIMA_MS.DESCONHECIDO, precisaoRuimM = PRECISAO_RUIM_M } = {}) {
  if (!coordenadaValida(ponto)) {
    return { qualidade: QUALIDADE_PONTO.INVALIDO, motivo: 'Sem latitude e longitude válidas.' };
  }

  const precisao = numeroFinito(ponto.accuracy);
  const baixaPrecisao = precisao != null && precisao > precisaoRuimM;

  if (!coordenadaValida(anterior)) {
    return baixaPrecisao
      ? { qualidade: QUALIDADE_PONTO.BAIXA_PRECISAO, motivo: `Primeiro fixo com raio de ${Math.round(precisao)} m.` }
      : { qualidade: QUALIDADE_PONTO.VALIDO, motivo: 'Primeiro ponto da trilha.' };
  }

  const tAtual = numeroFinito(ponto.timestamp);
  const tAnterior = numeroFinito(anterior.timestamp);
  const dtMs = tAtual != null && tAnterior != null ? tAtual - tAnterior : null;
  const metros = haversine(anterior, ponto);

  if (dtMs != null && dtMs < 0) {
    return { qualidade: QUALIDADE_PONTO.ANTIGO, motivo: `Chegou ${Math.abs(Math.round(dtMs / 1000))} s antes do último ponto gravado.`, metros, dtMs };
  }

  if (metros <= DUPLICADO_METROS && dtMs != null && dtMs <= DUPLICADO_MS) {
    return { qualidade: QUALIDADE_PONTO.DUPLICADO, motivo: 'Mesmo lugar e mesmo instante do ponto anterior.', metros, dtMs };
  }

  if (dtMs != null && dtMs > 0) {
    // A folga vem da incerteza dos DOIS fixos: com 100 m de raio em cada, 200 m
    // de diferença podem ser o ruído se somando, não deslocamento.
    const folgaM = (numeroFinito(anterior.accuracy) ?? 0) + (precisao ?? 0);
    const excedente = metros - folgaM;
    const velocidade = excedente > 0 ? excedente / (dtMs / 1000) : 0;
    if (velocidade > velocidadeMaximaMs) {
      return {
        qualidade: QUALIDADE_PONTO.OUTLIER,
        motivo: `Exigiria ${Math.round(velocidade)} m/s (${Math.round(velocidade * 3.6)} km/h) em ${(dtMs / 1000).toFixed(1)} s.`,
        metros, dtMs, velocidadeMs: velocidade,
      };
    }
  }

  if (baixaPrecisao) {
    return { qualidade: QUALIDADE_PONTO.BAIXA_PRECISAO, motivo: `Raio de ${Math.round(precisao)} m: alto demais para medir este trecho.`, metros, dtMs };
  }

  return { qualidade: QUALIDADE_PONTO.VALIDO, motivo: 'Coerente com o ponto anterior.', metros, dtMs };
}

/**
 * Houve buraco entre os dois pontos?
 *
 * Um vão não é um segmento. Ligar dois pontos separados por dez minutos sem
 * sinal desenha no mapa uma reta por onde ninguém passou, e soma à distância um
 * trecho que ninguém observou. O vão é marcado para que as duas coisas possam
 * ser evitadas — e para que a interface possa dizer que ali falta informação,
 * em vez de fingir que o caminho foi reto.
 */
export function detectarVao(anterior, ponto, { vaoMs = VAO_MS, vaoMetros = VAO_METROS } = {}) {
  if (!coordenadaValida(anterior) || !coordenadaValida(ponto)) return null;
  const tAtual = numeroFinito(ponto.timestamp);
  const tAnterior = numeroFinito(anterior.timestamp);
  const dtMs = tAtual != null && tAnterior != null ? tAtual - tAnterior : null;
  const metros = haversine(anterior, ponto);

  const porTempo = dtMs != null && dtMs >= vaoMs;
  const porDistancia = metros >= vaoMetros;
  if (!porTempo && !porDistancia) return null;

  return {
    dtMs,
    metros,
    motivo: porTempo && porDistancia
      ? `${Math.round(dtMs / 1000)} s e ${Math.round(metros)} m sem ponto registrado.`
      : porTempo
        ? `${Math.round(dtMs / 1000)} s sem ponto registrado.`
        : `${Math.round(metros)} m entre pontos consecutivos.`,
  };
}

/** As qualidades que sustentam medição de distância. */
export function contaParaDistancia(qualidade) {
  return qualidade === QUALIDADE_PONTO.VALIDO;
}

/** As qualidades que devem ser guardadas (ou seja: todas menos as impossíveis). */
export function deveGuardar(qualidade) {
  return qualidade !== QUALIDADE_PONTO.INVALIDO;
}
