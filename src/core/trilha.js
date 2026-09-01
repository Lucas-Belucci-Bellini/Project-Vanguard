/**
 * Resumo da trilha para a tela.
 *
 * A distância vem de `engine/odometro.js`, não de uma soma de `haversine`. A
 * conta 2D antiga tratava subida como parado — foi assim que uma escada de
 * verdade virou "quase no mesmo lugar" no campo. O odômetro conta o desnível
 * e peneira o tremor do GPS, e devolve também o que descartou, para número
 * baixo não se confundir com caminhada curta.
 */
import { medirTrilha } from '../engine/odometro.js';

function coordenadaValida(ponto) {
  const lat = Number(ponto?.lat);
  const lon = Number(ponto?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function instanteValido(ponto) {
  const instante = Number(ponto?.createdAt ?? ponto?.timestamp);
  return Number.isFinite(instante) && instante >= 0 ? instante : null;
}

export function duracaoLabel(duracaoMs) {
  if (!Number.isFinite(duracaoMs) || duracaoMs < 0) return 'tempo indisponível';
  const segundos = Math.round(duracaoMs / 1000);
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;
  if (horas) return `${horas}h ${String(minutos).padStart(2, '0')}min`;
  if (minutos) return `${minutos}min ${String(resto).padStart(2, '0')}s`;
  return `${resto}s`;
}

export function resumoTrilha(pontos = []) {
  const validos = Array.isArray(pontos) ? pontos.filter(coordenadaValida) : [];
  const medida = medirTrilha(validos);
  const distanciaM = medida.distanciaM;

  const instantes = validos.map(instanteValido);
  const temTodosInstantes = instantes.length >= 2 && instantes.every((instante) => instante !== null);
  const duracaoMs = temTodosInstantes && instantes[instantes.length - 1] >= instantes[0]
    ? instantes[instantes.length - 1] - instantes[0]
    : null;
  const velocidadeMediaMps = duracaoMs > 0 ? distanciaM / (duracaoMs / 1000) : null;

  return {
    pontos: validos.length,
    distanciaM,
    /** Só o plano, para comparar com o que aparelhos 2D mostram. */
    horizontalM: medida.horizontalM,
    ganhoElevacaoM: medida.ganhoElevacaoM,
    perdaElevacaoM: medida.perdaElevacaoM,
    segmentosContados: medida.segmentosContados,
    descartados: medida.descartados,
    duracaoMs,
    duracaoLabel: duracaoLabel(duracaoMs),
    velocidadeMediaMps,
    velocidadeMediaLabel: velocidadeMediaMps == null ? 'velocidade média indisponível' : `${(velocidadeMediaMps * 3.6).toFixed(1)} km/h média`,
    temTempo: duracaoMs !== null,
  };
}
