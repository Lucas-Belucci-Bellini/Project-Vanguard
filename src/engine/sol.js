/**
 * Posição do Sol — altura e azimute — a partir de latitude, longitude e
 * instante UTC.
 *
 * Pertence ao motor porque é geometria pura: sem rede, sem DOM, sem
 * dependência. É o que permite avaliar exposição solar **offline**, no meio de
 * uma estrada rural sem sinal, sem consultar serviço nenhum.
 *
 * Segue o procedimento solar do NOAA (equações de Meeus para longitude média,
 * anomalia, equação do centro, obliquidade e equação do tempo). A precisão é
 * de fração de grau para uso em campo — suficiente para dizer se o sol está a
 * pino, não para efeméride astronômica.
 *
 * **Altura do sol não é temperatura.** Este módulo diz onde o sol está; ele
 * não mede calor, umidade, vento nem sombra.
 */

import { numeroFinito } from './numero-seguro.js';

const GRAU = Math.PI / 180;
const DIA_MS = 86_400_000;
/** Dia juliano do epoch Unix (1970-01-01T00:00:00Z). */
const JD_UNIX_EPOCH = 2440587.5;
/** Dia juliano de J2000.0, origem dos séculos julianos das equações. */
const JD_J2000 = 2451545;

const sen = (graus) => Math.sin(graus * GRAU);
const cos = (graus) => Math.cos(graus * GRAU);

function seculoJuliano(instanteMs) {
  return (instanteMs / DIA_MS + JD_UNIX_EPOCH - JD_J2000) / 36525;
}

function longitudeMediaSolar(t) {
  return (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
}

function anomaliaMediaSolar(t) {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

function equacaoDoCentro(t, m) {
  return sen(m) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + sen(2 * m) * (0.019993 - 0.000101 * t)
    + sen(3 * m) * 0.000289;
}

function obliquidadeCorrigida(t) {
  const media = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  return media + 0.00256 * cos(125.04 - 1934.136 * t);
}

function longitudeAparente(t, verdadeira) {
  return verdadeira - 0.00569 - 0.00478 * sen(125.04 - 1934.136 * t);
}

/** Diferença, em minutos, entre o meio-dia solar verdadeiro e o médio. */
function equacaoDoTempoMin(t) {
  const l0 = longitudeMediaSolar(t);
  const m = anomaliaMediaSolar(t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const epsilon = obliquidadeCorrigida(t);
  const y = Math.tan((epsilon / 2) * GRAU) ** 2;
  const valor = y * sen(2 * l0)
    - 2 * e * sen(m)
    + 4 * e * y * sen(m) * cos(2 * l0)
    - 0.5 * y * y * sen(4 * l0)
    - 1.25 * e * e * sen(2 * m);
  return 4 * (valor / GRAU);
}

export function declinacaoSolarDeg(instanteMs) {
  const t = seculoJuliano(instanteMs);
  const lambda = longitudeAparente(t, longitudeMediaSolar(t) + equacaoDoCentro(t, anomaliaMediaSolar(t)));
  return Math.asin(sen(obliquidadeCorrigida(t)) * sen(lambda)) / GRAU;
}

/**
 * Altura (elevação) e azimute do Sol.
 * Elevação negativa significa Sol abaixo do horizonte.
 */
export function posicaoSolar({ lat, lon, instanteMs = Date.now() } = {}) {
  const latitude = numeroFinito(lat);
  const longitude = numeroFinito(lon);
  const instante = numeroFinito(instanteMs);
  if (latitude == null || longitude == null || instante == null) {
    throw new TypeError('posicaoSolar exige lat, lon e instante numéricos.');
  }

  const t = seculoJuliano(instante);
  const declinacao = declinacaoSolarDeg(instante);
  const minutosUtc = ((instante % DIA_MS) + DIA_MS) % DIA_MS / 60_000;
  // Hora solar verdadeira: hora UTC corrigida pela longitude e pela equação do tempo.
  const tempoSolarVerdadeiroMin = (minutosUtc + equacaoDoTempoMin(t) + 4 * longitude + 1440) % 1440;
  const anguloHorario = tempoSolarVerdadeiroMin / 4 - 180;

  const cosZenite = sen(latitude) * sen(declinacao) + cos(latitude) * cos(declinacao) * cos(anguloHorario);
  const zenite = Math.acos(Math.min(1, Math.max(-1, cosZenite))) / GRAU;
  const elevacaoDeg = 90 - zenite;

  const denominador = cos(latitude) * sen(zenite);
  let azimuteDeg;
  if (Math.abs(denominador) < 1e-9) {
    azimuteDeg = anguloHorario > 0 ? 180 : 0;
  } else {
    const cosAzimute = (sen(declinacao) - sen(latitude) * cosZenite) / denominador;
    const base = Math.acos(Math.min(1, Math.max(-1, cosAzimute))) / GRAU;
    azimuteDeg = anguloHorario > 0 ? (540 - base) % 360 : base % 360;
  }

  return {
    elevacaoDeg,
    azimuteDeg,
    declinacaoDeg: declinacao,
    anguloHorarioDeg: anguloHorario,
    acimaDoHorizonte: elevacaoDeg > 0,
  };
}
