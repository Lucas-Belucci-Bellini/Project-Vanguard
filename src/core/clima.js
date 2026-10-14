/**
 * Clima — vem pela rede, mas continua legível sem ela.
 *
 * ## A regra que manda aqui
 *
 * Este é um aplicativo offline-first, e o clima é a única coisa nele que
 * **não pode** ser offline: ninguém mede a frente fria que vem chegando com o
 * sensor do celular. Então a regra é outra: buscar quando há rede, **guardar**,
 * e nunca deixar a tela em branco quando a rede some.
 *
 * O que a tela não pode fazer é mostrar uma leitura velha como se fosse de
 * agora. Por isso `lerClima` devolve sempre a **idade** do dado junto com o
 * dado, e a tela mostra a idade ao lado do número. Uma previsão de três horas
 * atrás numa noite de temporal já não descreve o céu que está lá fora.
 *
 * ## Falha de rede não destrói o que já se sabia
 *
 * Uma busca que falha **preserva** a leitura guardada e devolve o motivo. O
 * caminho errado seria gravar `null` por cima: a pessoa perderia a última
 * informação boa exatamente no momento em que o sinal caiu, que é quando ela
 * mais precisa.
 *
 * ## Fonte
 *
 * Open-Meteo — **sem chave de API**. Isso não é conveniência, é decisão:
 * token dentro de um APK é extraível com um descompactador, e este
 * repositório já registrou essa armadilha (ADR-0034). Sem chave, não há
 * segredo para vazar.
 */

import { estado as estadoPadrao, CHAVES } from './estado.js';
import { descreverTempo } from '../engine/tempestade.js';
import { coordenadaValida } from '../engine/numero-seguro.js';

export const ENDPOINT_CLIMA = 'https://api.open-meteo.com/v1/forecast';

/** Acima disto a leitura guardada vira referência histórica, não "agora". */
export const IDADE_LEITURA_VELHA_MS = 60 * 60 * 1000;

/** Quantas horas de previsão a tela mostra. Mais que isso não cabe na tela. */
export const HORAS_PREVISTAS = 12;

export const RESULTADO_CLIMA = Object.freeze({
  ATUALIZADO: 'ATUALIZADO',
  /** Rede falhou; a leitura guardada continua valendo e é devolvida. */
  SEM_REDE: 'SEM_REDE',
  /** A fonte respondeu, mas não com o que promete. */
  RESPOSTA_INVALIDA: 'RESPOSTA_INVALIDA',
  SEM_POSICAO: 'SEM_POSICAO',
});

const CAMPOS_ATUAIS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation',
  'weather_code', 'wind_speed_10m', 'wind_gusts_10m', 'pressure_msl',
];
const CAMPOS_HORA = ['precipitation_probability', 'precipitation', 'weather_code', 'wind_gusts_10m'];

export function urlDoClima({ lat, lon, horas = HORAS_PREVISTAS }) {
  const parametros = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: CAMPOS_ATUAIS.join(','),
    hourly: CAMPOS_HORA.join(','),
    forecast_hours: String(horas),
    timezone: 'auto',
  });
  return `${ENDPOINT_CLIMA}?${parametros}`;
}

/**
 * Converte a resposta da fonte no formato desta casa.
 *
 * Devolve `null` quando a resposta não traz o essencial, em vez de um objeto
 * com campos `undefined` que a tela mostraria como se fossem medida.
 */
export function normalizarResposta(bruto, { agoraMs = Date.now() } = {}) {
  const atual = bruto?.current;
  if (!atual || typeof atual !== 'object') return null;
  const temperatura = Number(atual.temperature_2m);
  if (!Number.isFinite(temperatura)) return null;

  const horas = [];
  const tempos = Array.isArray(bruto?.hourly?.time) ? bruto.hourly.time : [];
  for (let i = 0; i < tempos.length; i += 1) {
    horas.push({
      hora: tempos[i],
      chuvaProbabilidade: Number(bruto.hourly.precipitation_probability?.[i] ?? NaN),
      chuvaMm: Number(bruto.hourly.precipitation?.[i] ?? NaN),
      rajadaKmh: Number(bruto.hourly.wind_gusts_10m?.[i] ?? NaN),
      ...descreverTempo(bruto.hourly.weather_code?.[i]),
    });
  }

  return {
    esquema: 'vanguard-clima',
    versao: 1,
    lidoEm: agoraMs,
    fonte: 'Open-Meteo',
    local: {
      lat: Number(bruto.latitude),
      lon: Number(bruto.longitude),
      elevacaoM: Number(bruto.elevation),
      fuso: String(bruto.timezone ?? ''),
    },
    atual: {
      hora: String(atual.time ?? ''),
      temperaturaC: temperatura,
      sensacaoC: Number(atual.apparent_temperature),
      umidadePct: Number(atual.relative_humidity_2m),
      chuvaMm: Number(atual.precipitation),
      ventoKmh: Number(atual.wind_speed_10m),
      rajadaKmh: Number(atual.wind_gusts_10m),
      pressaoHpa: Number(atual.pressure_msl),
      ...descreverTempo(atual.weather_code),
    },
    horas,
  };
}

/** Há trovoada nas próximas horas? A pergunta que decide sair ou não sair. */
export function trovoadaPrevista(leitura, { horas = 6 } = {}) {
  const lista = Array.isArray(leitura?.horas) ? leitura.horas.slice(0, horas) : [];
  const comTrovoada = lista.filter((h) => h.trovoada);
  return {
    prevista: comTrovoada.length > 0 || Boolean(leitura?.atual?.trovoada),
    agora: Boolean(leitura?.atual?.trovoada),
    proximaHora: comTrovoada[0]?.hora ?? null,
    horasComTrovoada: comTrovoada.length,
    granizo: comTrovoada.some((h) => h.granizo) || Boolean(leitura?.atual?.granizo),
  };
}

/** A leitura guardada, com a IDADE dela — nunca o dado sozinho. */
export function lerClima({ estado = estadoPadrao, agoraMs = Date.now() } = {}) {
  const guardada = estado.get(CHAVES.CLIMA, null);
  if (!guardada?.atual) return { leitura: null, idadeMs: null, velha: true };
  const idadeMs = Math.max(0, agoraMs - Number(guardada.lidoEm ?? 0));
  return { leitura: guardada, idadeMs, velha: idadeMs > IDADE_LEITURA_VELHA_MS };
}

/**
 * Busca o clima e guarda. Falha de rede **preserva** o que já havia.
 *
 * `buscar` é injetado para o teste não depender de rede — e para o motivo da
 * falha ser exercitável, que é a parte que precisa estar certa.
 */
export async function atualizarClima({
  posicao,
  estado = estadoPadrao,
  buscar = globalThis.fetch?.bind(globalThis),
  agoraMs = Date.now(),
  horas = HORAS_PREVISTAS,
} = {}) {
  const guardada = lerClima({ estado, agoraMs });

  if (!coordenadaValida(posicao)) {
    return { ...guardada, resultado: RESULTADO_CLIMA.SEM_POSICAO };
  }
  if (typeof buscar !== 'function') {
    return { ...guardada, resultado: RESULTADO_CLIMA.SEM_REDE, erro: 'fetch indisponível' };
  }

  try {
    const resposta = await buscar(urlDoClima({ lat: posicao.lat, lon: posicao.lon, horas }));
    if (!resposta?.ok) {
      // A leitura guardada continua valendo: apagar aqui seria tirar a última
      // informação boa exatamente quando o sinal caiu.
      return { ...guardada, resultado: RESULTADO_CLIMA.SEM_REDE, erro: `HTTP ${resposta?.status ?? '?'}` };
    }
    const bruto = await resposta.json();
    const leitura = normalizarResposta(bruto, { agoraMs });
    if (!leitura) return { ...guardada, resultado: RESULTADO_CLIMA.RESPOSTA_INVALIDA };

    estado.set(CHAVES.CLIMA, leitura);
    return { leitura, idadeMs: 0, velha: false, resultado: RESULTADO_CLIMA.ATUALIZADO };
  } catch (erro) {
    return { ...guardada, resultado: RESULTADO_CLIMA.SEM_REDE, erro: erro?.message ?? String(erro) };
  }
}
