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

/**
 * Trilha em GeoJSON, quebrada em segmentos por modo de deslocamento.
 *
 * Uma `LineString` única obriga a desenhar tudo da mesma cor, e aí o trecho de
 * ônibus fica idêntico ao trecho caminhado — que é justamente a diferença que
 * importa numa peregrinação. Aqui cada troca de modo fecha um segmento e abre
 * o próximo, **repetindo o ponto de junção** para não abrir buraco no traçado.
 *
 * Segmento de um ponto só é descartado: `LineString` com um vértice não é
 * geometria válida e alguns renderizadores engasgam nela.
 */
export function trilhaGeoJSON(pontos = []) {
  const validos = (Array.isArray(pontos) ? pontos : []).filter(coordenadaValida);
  const features = [];
  let atual = null;

  for (const ponto of validos) {
    const modo = ponto?.modo === 'VEICULO' ? 'VEICULO' : 'A_PE';
    if (!atual) {
      atual = { modo, coordinates: [[ponto.lon, ponto.lat]] };
      continue;
    }
    if (modo !== atual.modo) {
      // O ponto da virada entra nos dois segmentos: sem isso o traçado fica
      // com um vão exatamente onde a pessoa subiu no ônibus.
      atual.coordinates.push([ponto.lon, ponto.lat]);
      if (atual.coordinates.length > 1) features.push(atual);
      atual = { modo, coordinates: [[ponto.lon, ponto.lat]] };
      continue;
    }
    atual.coordinates.push([ponto.lon, ponto.lat]);
  }
  if (atual && atual.coordinates.length > 1) features.push(atual);

  return {
    type: 'FeatureCollection',
    features: features.map(({ modo, coordinates }) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: { modo },
    })),
  };
}

/** Ponto de partida da trilha, para o mapa marcar onde o dia começou. */
export function inicioDaTrilha(pontos = []) {
  const primeiro = (Array.isArray(pontos) ? pontos : []).find(coordenadaValida);
  if (!primeiro) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [primeiro.lon, primeiro.lat] },
      properties: {},
    }],
  };
}

/** Começo do dia local do instante dado. */
function inicioDoDia(instante) {
  const d = new Date(instante);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Quanto se andou HOJE — o número que vai para a tela bloqueada.
 *
 * A trilha atravessa dias: numa peregrinação de três dias, mostrar o total
 * acumulado responde a pergunta errada. Aqui o recorte é o dia local, e o
 * tempo é medido do primeiro ao último ponto **de hoje**, não desde o começo
 * da trilha.
 *
 * `emMovimento` distingue "andei 6 h" de "o app está ligado há 6 h": se o
 * último ponto é velho, a caminhada parou, e o texto tem de dizer isso em vez
 * de deixar o número subindo sozinho.
 */
export function resumoDoDia(pontos = [], agora = Date.now(), { paradoAposMs = 10 * 60_000 } = {}) {
  const doDia = (Array.isArray(pontos) ? pontos : [])
    .filter(coordenadaValida)
    .filter((ponto) => {
      const instante = instanteValido(ponto);
      return instante !== null && instante >= inicioDoDia(agora) && instante <= agora;
    });

  if (doDia.length < 2) {
    return { distanciaM: 0, duracaoMs: 0, duracaoLabel: duracaoLabel(0), pontos: doDia.length, emMovimento: false, ganhoElevacaoM: 0 };
  }
  const medida = medirTrilha(doDia);
  const primeiro = instanteValido(doDia[0]);
  const ultimo = instanteValido(doDia[doDia.length - 1]);
  const duracaoMs = Math.max(0, ultimo - primeiro);

  return {
    distanciaM: medida.distanciaM,
    ganhoElevacaoM: medida.ganhoElevacaoM,
    duracaoMs,
    duracaoLabel: duracaoLabel(duracaoMs),
    pontos: doDia.length,
    emMovimento: agora - ultimo <= paradoAposMs,
  };
}
