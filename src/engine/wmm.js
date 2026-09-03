/**
 * World Magnetic Model — a declinação magnética sem rede, sem sensor e sem
 * ninguém precisar saber a do próprio lugar.
 *
 * ## Por que isto existe
 *
 * A bússola do celular lê o campo magnético. O norte que ela encontra **não é**
 * o norte do mapa: entre os dois há a declinação magnética, que varia de zero a
 * dezenas de graus conforme onde se está e muda ano a ano. Até aqui o Vanguard
 * só tinha dois jeitos de saber esse número: medir contra o Sol
 * (`core/bussola-leitura.js`) ou o operador digitar. Digitar exige saber; e
 * campo vazio virava "declinação de 0°", que é uma afirmação — errada — em vez
 * de uma ausência.
 *
 * Este módulo dá o terceiro caminho: calcular. Dado onde e quando, o WMM devolve
 * a declinação prevista pelo modelo oficial NOAA/BGS.
 *
 * ## O que ele NÃO é
 *
 * O WMM prevê o **campo da Terra**. Ele não sabe nada sobre o aparelho: não vê o
 * ímã do alto-falante, a chapa de aço do carro, o erro de fábrica do
 * magnetômetro, nem o fato de alguns Android já entregarem norte verdadeiro e
 * outros o magnético. Por isso a correção que sai daqui é **prevista**, e a que
 * sai do Sol é **medida** — quando as duas existem, a medida vale mais, e quem
 * decide isso é `core/bussola-leitura.js`, não este arquivo.
 *
 * ## Limites declarados
 *
 * - **Validade**: o WMM2025 vale de 2025,0 a 2030,0. Fora da janela este módulo
 *   **recusa** em vez de extrapolar — cinco anos de variação secular projetados
 *   às cegas chegam a graus de erro, e um número errado com cara de certo é pior
 *   que nenhum.
 *   O modelo declara incerteza da ordem de 0,4° em declinação na maior parte do
 *   globo, subindo perto dos polos magnéticos; ver o relatório técnico citado em
 *   `vendor/wmm/PROVENIENCIA.md`.
 * - **Polos geográficos**: o termo leste do campo divide por cos(latitude
 *   geocêntrica), que é zero no polo exato. Ali a latitude é afastada em 1e-6°
 *   (≈ 11 cm) — o mesmo recurso das implementações de referência. Não muda nada
 *   fora dos últimos centímetros do eixo, e está dito em vez de escondido.
 * - **Altitude é acima do elipsoide WGS-84**, em km, não acima do nível do mar.
 *
 * Módulo puro: sem DOM, sem rede, sem relógio próprio.
 */

import { normDeg } from './angles.js';
import { numeroFinito } from './numero-seguro.js';
import {
  WMM_COEFICIENTES,
  WMM_DATA_MODELO,
  WMM_EPOCA,
  WMM_GRAU_MAXIMO,
  WMM_MODELO,
  WMM_VALIDADE,
} from '../data/wmm2025.js';

const GRAUS = Math.PI / 180;

/** WGS-84, os mesmos números do resto do motor. Em km, porque o WMM trabalha em km. */
const ELIPSOIDE = Object.freeze({
  aKm: 6378.137,
  achatamento: 1 / 298.257223563,
});
const EXCENTRICIDADE2 = ELIPSOIDE.achatamento * (2 - ELIPSOIDE.achatamento);

/** Raio de referência geomagnético do WMM (não é o raio da Terra). */
const RAIO_GEOMAGNETICO_KM = 6371.2;

/**
 * Latitude é afastada do polo por isto (grau) antes do cálculo. Ver "Limites
 * declarados" no topo: 1e-6° são ~11 cm sobre o meridiano.
 */
const AFASTAMENTO_DO_POLO_DEG = 1e-6;

/** Acima desta latitude a variação de grade (GV) é definida; abaixo, não é. */
const LATITUDE_POLAR_DEG = 55;

export const MOTIVOS_WMM = Object.freeze({
  POSICAO_INVALIDA: 'POSICAO_INVALIDA',
  DATA_INVALIDA: 'DATA_INVALIDA',
  FORA_DE_VALIDADE: 'FORA_DE_VALIDADE',
});

/** Metadados do modelo embarcado, para a tela de diagnóstico não adivinhar. */
export const MODELO_WMM = Object.freeze({
  nome: WMM_MODELO,
  epoca: WMM_EPOCA,
  emitidoEm: WMM_DATA_MODELO,
  grauMaximo: WMM_GRAU_MAXIMO,
  validade: WMM_VALIDADE,
});

const indice = (n, m) => (n * (n + 1)) / 2 + m;

/* Coeficientes em tabelas indexadas por n(n+1)/2 + m — o mesmo índice do código
 * de referência da NOAA, para que comparar as duas implementações continue
 * possível sem traduzir índice. */
const TAMANHO = indice(WMM_GRAU_MAXIMO, WMM_GRAU_MAXIMO) + 1;
const G = new Float64Array(TAMANHO);
const H = new Float64Array(TAMANHO);
const G_PONTO = new Float64Array(TAMANHO);
const H_PONTO = new Float64Array(TAMANHO);
for (const [n, m, g, h, gPonto, hPonto] of WMM_COEFICIENTES) {
  const i = indice(n, m);
  G[i] = g;
  H[i] = h;
  G_PONTO[i] = gPonto;
  H_PONTO[i] = hPonto;
}

/* A conversão de Gauss-normalizado para Schmidt quase-normalizado só depende de
 * n e m, então é calculada uma vez. */
const NORMA_SCHMIDT = new Float64Array(TAMANHO);
NORMA_SCHMIDT[0] = 1;
for (let n = 1; n <= WMM_GRAU_MAXIMO; n += 1) {
  NORMA_SCHMIDT[indice(n, 0)] = (NORMA_SCHMIDT[indice(n - 1, 0)] * (2 * n - 1)) / n;
  for (let m = 1; m <= n; m += 1) {
    NORMA_SCHMIDT[indice(n, m)] = NORMA_SCHMIDT[indice(n, m - 1)]
      * Math.sqrt(((n - m + 1) * (m === 1 ? 2 : 1)) / (n + m));
  }
}

/**
 * Funções associadas de Legendre quase-normalizadas de Schmidt e a derivada
 * delas em relação à LATITUDE (não à colatitude — daí o sinal trocado no fim).
 */
function legendre(senoLatitude) {
  const P = new Float64Array(TAMANHO);
  const dP = new Float64Array(TAMANHO);
  const x = senoLatitude;
  const z = Math.sqrt((1 - x) * (1 + x));

  P[0] = 1;
  dP[0] = 0;

  for (let n = 1; n <= WMM_GRAU_MAXIMO; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      const i = indice(n, m);
      if (n === m) {
        const j = indice(n - 1, m - 1);
        P[i] = z * P[j];
        dP[i] = z * dP[j] + x * P[j];
      } else if (n === 1 && m === 0) {
        const j = indice(0, 0);
        P[i] = x * P[j];
        dP[i] = x * dP[j] - z * P[j];
      } else if (m > n - 2) {
        const j = indice(n - 1, m);
        P[i] = x * P[j];
        dP[i] = x * dP[j] - z * P[j];
      } else {
        const j1 = indice(n - 2, m);
        const j2 = indice(n - 1, m);
        const k = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
        P[i] = x * P[j2] - k * P[j1];
        dP[i] = x * dP[j2] - z * P[j2] - k * dP[j1];
      }
    }
  }

  for (let n = 1; n <= WMM_GRAU_MAXIMO; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      const i = indice(n, m);
      P[i] *= NORMA_SCHMIDT[i];
      dP[i] *= -NORMA_SCHMIDT[i];
    }
  }

  return { P, dP };
}

/** Ano decimal, o relógio do WMM. 2025,5 é o meio de 2025. */
export function anoDecimal(instante) {
  const data = instante instanceof Date ? instante : new Date(numeroFinito(instante) ?? NaN);
  const ms = data.getTime();
  if (!Number.isFinite(ms)) return null;
  const ano = data.getUTCFullYear();
  const inicio = Date.UTC(ano, 0, 1);
  const fim = Date.UTC(ano + 1, 0, 1);
  return ano + (ms - inicio) / (fim - inicio);
}

/**
 * Campo geomagnético previsto pelo WMM.
 *
 * @param {object} entrada
 * @param {number} entrada.lat latitude geodésica em graus
 * @param {number} entrada.lon longitude em graus
 * @param {number} [entrada.alturaKm=0] altura ACIMA DO ELIPSOIDE WGS-84, em km
 * @param {number} [entrada.ano] ano decimal; use `anoDecimal(Date.now())`
 * @returns {object} `{ ok }` e, quando ok, os elementos do campo e a variação anual.
 */
export function campoGeomagnetico({ lat, lon, alturaKm = 0, ano } = {}) {
  const latitude = numeroFinito(lat);
  const longitude = numeroFinito(lon);
  const altura = numeroFinito(alturaKm) ?? 0;
  const anoPedido = numeroFinito(ano);

  if (latitude == null || longitude == null || latitude < -90 || latitude > 90) {
    return {
      ok: false,
      motivo: MOTIVOS_WMM.POSICAO_INVALIDA,
      explicacao: 'Sem latitude e longitude válidas não há lugar sobre o qual calcular o campo.',
    };
  }
  if (anoPedido == null) {
    return {
      ok: false,
      motivo: MOTIVOS_WMM.DATA_INVALIDA,
      explicacao: 'O WMM muda com o tempo: sem uma data válida não há o que calcular.',
    };
  }
  if (anoPedido < WMM_VALIDADE.inicio || anoPedido > WMM_VALIDADE.fim) {
    return {
      ok: false,
      motivo: MOTIVOS_WMM.FORA_DE_VALIDADE,
      explicacao: `O ${WMM_MODELO} vale de ${WMM_VALIDADE.inicio} a ${WMM_VALIDADE.fim}; ${anoPedido.toFixed(2)} está fora. `
        + 'Extrapolar o modelo esconde erro de graus atrás de um número de aparência normal — atualize os coeficientes '
        + '(vendor/wmm/PROVENIENCIA.md) em vez de confiar nesta previsão.',
      validade: WMM_VALIDADE,
      ano: anoPedido,
    };
  }

  // Afasta do polo exato, onde o termo leste divide por zero. Ver o topo.
  const latSegura = Math.min(90 - AFASTAMENTO_DO_POLO_DEG, Math.max(-90 + AFASTAMENTO_DO_POLO_DEG, latitude));

  // Geodésico → esférico geocêntrico.
  const latRad = latSegura * GRAUS;
  const senoLat = Math.sin(latRad);
  const cossenoLat = Math.cos(latRad);
  const raioCurvatura = ELIPSOIDE.aKm / Math.sqrt(1 - EXCENTRICIDADE2 * senoLat * senoLat);
  const p = (raioCurvatura + altura) * cossenoLat;
  const z = (raioCurvatura * (1 - EXCENTRICIDADE2) + altura) * senoLat;
  const r = Math.sqrt(p * p + z * z);
  const latGeocentricaRad = Math.asin(z / r);

  const { P, dP } = legendre(Math.sin(latGeocentricaRad));
  const cosLatGeocentrica = Math.cos(latGeocentricaRad);

  const lonRad = longitude * GRAUS;
  const cosM = new Float64Array(WMM_GRAU_MAXIMO + 1);
  const senM = new Float64Array(WMM_GRAU_MAXIMO + 1);
  cosM[0] = 1;
  senM[0] = 0;
  for (let m = 1; m <= WMM_GRAU_MAXIMO; m += 1) {
    cosM[m] = Math.cos(m * lonRad);
    senM[m] = Math.sin(m * lonRad);
  }

  const razao = RAIO_GEOMAGNETICO_KM / r;
  const potencia = new Float64Array(WMM_GRAU_MAXIMO + 1);
  potencia[0] = razao * razao;
  for (let n = 1; n <= WMM_GRAU_MAXIMO; n += 1) potencia[n] = potencia[n - 1] * razao;

  const dt = anoPedido - WMM_EPOCA;

  // Campo e variação secular saem do mesmo laço: são a mesma soma, uma com os
  // coeficientes do instante e outra com as derivadas deles.
  let bx = 0;
  let by = 0;
  let bz = 0;
  let bxPonto = 0;
  let byPonto = 0;
  let bzPonto = 0;

  for (let n = 1; n <= WMM_GRAU_MAXIMO; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      const i = indice(n, m);
      const g = G[i] + dt * G_PONTO[i];
      const h = H[i] + dt * H_PONTO[i];
      const gPonto = G_PONTO[i];
      const hPonto = H_PONTO[i];

      const parCos = g * cosM[m] + h * senM[m];
      const parSen = g * senM[m] - h * cosM[m];
      const parCosPonto = gPonto * cosM[m] + hPonto * senM[m];
      const parSenPonto = gPonto * senM[m] - hPonto * cosM[m];

      bz -= potencia[n] * parCos * (n + 1) * P[i];
      by += potencia[n] * parSen * m * P[i];
      bx -= potencia[n] * parCos * dP[i];

      bzPonto -= potencia[n] * parCosPonto * (n + 1) * P[i];
      byPonto += potencia[n] * parSenPonto * m * P[i];
      bxPonto -= potencia[n] * parCosPonto * dP[i];
    }
  }

  by /= cosLatGeocentrica;
  byPonto /= cosLatGeocentrica;

  // Esférico → geodésico: gira o vetor pela diferença entre as duas latitudes.
  const psi = latGeocentricaRad - latRad;
  const cosPsi = Math.cos(psi);
  const senPsi = Math.sin(psi);

  const X = bx * cosPsi - bz * senPsi;
  const Y = by;
  const Z = bx * senPsi + bz * cosPsi;
  const Xponto = bxPonto * cosPsi - bzPonto * senPsi;
  const Yponto = byPonto;
  const Zponto = bxPonto * senPsi + bzPonto * cosPsi;

  const horizontalNt = Math.hypot(X, Y);
  const totalNt = Math.hypot(horizontalNt, Z);
  const declinacaoDeg = Math.atan2(Y, X) / GRAUS;
  const inclinacaoDeg = Math.atan2(Z, horizontalNt) / GRAUS;

  const horizontalPonto = (X * Xponto + Y * Yponto) / horizontalNt;
  const totalPonto = (X * Xponto + Y * Yponto + Z * Zponto) / totalNt;
  const declinacaoPontoDeg = ((X * Yponto - Y * Xponto) / (horizontalNt * horizontalNt)) / GRAUS;
  const inclinacaoPontoDeg = ((horizontalNt * Zponto - Z * horizontalPonto) / (totalNt * totalNt)) / GRAUS;

  // Variação de grade: só definida na região polar, e é lá que ela importa
  // (perto do polo o meridiano deixa de servir de referência prática).
  let variacaoDeGradeDeg = null;
  if (latitude >= LATITUDE_POLAR_DEG) variacaoDeGradeDeg = normDeg180(declinacaoDeg - longitude);
  else if (latitude <= -LATITUDE_POLAR_DEG) variacaoDeGradeDeg = normDeg180(declinacaoDeg + longitude);

  return {
    ok: true,
    modelo: MODELO_WMM,
    ano: anoPedido,
    posicao: { lat: latitude, lon: longitude, alturaKm: altura },
    /** Positivo = norte magnético a leste do norte verdadeiro. */
    declinacaoDeg,
    inclinacaoDeg,
    intensidadeNt: totalNt,
    horizontalNt,
    componentes: { norteNt: X, lesteNt: Y, verticalNt: Z },
    variacaoDeGradeDeg,
    /** Quanto cada elemento muda por ano, no ritmo do modelo. */
    variacaoAnual: {
      declinacaoDeg: declinacaoPontoDeg,
      inclinacaoDeg: inclinacaoPontoDeg,
      intensidadeNt: totalPonto,
      horizontalNt: horizontalPonto,
      componentes: { norteNt: Xponto, lesteNt: Yponto, verticalNt: Zponto },
    },
  };
}

/** Normaliza para (−180, 180], a faixa em que declinação e GV são publicadas. */
function normDeg180(graus) {
  const normalizado = normDeg(graus);
  return normalizado > 180 ? normalizado - 360 : normalizado;
}

/**
 * Só a declinação, que é o que a bússola precisa — com o motivo quando não dá.
 * Aceita instante em ms (o que `Date.now()` devolve) em vez de ano decimal.
 */
export function declinacaoMagnetica({ lat, lon, alturaKm = 0, instanteMs = Date.now() } = {}) {
  const ano = anoDecimal(instanteMs);
  if (ano == null) {
    return {
      ok: false,
      motivo: MOTIVOS_WMM.DATA_INVALIDA,
      explicacao: 'O WMM muda com o tempo: sem uma data válida não há o que calcular.',
    };
  }
  const campo = campoGeomagnetico({ lat, lon, alturaKm, ano });
  if (!campo.ok) return campo;
  return {
    ok: true,
    modelo: campo.modelo,
    ano: campo.ano,
    declinacaoDeg: campo.declinacaoDeg,
    variacaoAnualDeg: campo.variacaoAnual.declinacaoDeg,
    inclinacaoDeg: campo.inclinacaoDeg,
    intensidadeNt: campo.intensidadeNt,
  };
}
