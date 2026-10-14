/**
 * Pacotes de mapa por REGIÃO — e a aritmética que explica por que não existe
 * "baixar o mundo".
 *
 * ## O que havia antes
 *
 * `planejarTilesDoViewport` guarda 256 tiles do que está na tela, em três
 * níveis de zoom. Isso cobre alguns quarteirões. Serve para "não perder o
 * mapa se o sinal cair agora"; não serve para "vou andar 300 km sem rede".
 *
 * ## Por que o mapa-múndi offline não existe, com o número
 *
 * O planeta em zoom 14 são **4¹⁴ = 268 435 456 tiles**. Isso é contagem
 * exata, não estimativa — é a definição da pirâmide de tiles. A 41,5 kB por
 * tile (medido, ver abaixo) daria cerca de **11 TB**. Mesmo supondo que o
 * oceano custasse 1 kB por tile, sobrariam centenas de gigabytes.
 *
 * Não é limite de engenharia que se contorna com compressão ou paciência: é a
 * ordem de grandeza. Por isso o app não oferece o planeta — e `custoDoPlaneta`
 * existe para a interface poder MOSTRAR a conta em vez de só dizer "não dá".
 *
 * ## Região, sim
 *
 * O que resolve a caminhada real é o corredor por onde se vai passar, baixado
 * com internet e guardado. É o que este módulo planeja, com tamanho declarado
 * antes de baixar e recusa explícita quando não cabe.
 */

import { tileX, tileY, urlDoTile } from './mapa-offline.js';

/**
 * Bytes por tile — **medido**, não estimado de cabeça.
 *
 * 10 tiles distintos de `tile.openstreetmap.org`, zooms 12 a 15, sobre a
 * região de São Paulo (urbana e periurbana), em 2026-09-05: média de
 * **41 529 bytes**. O palpite razoável seria ~15 kB; errar para baixo em 2,8×
 * é o tipo de erro que só aparece no aparelho, como download interrompido por
 * falta de espaço.
 *
 * A média depende do conteúdo: oceano e deserto rendem tiles muito menores,
 * centro de cidade rende maiores. Por isso o número aparece na interface
 * rotulado como ESTIMATIVA, e o tamanho real é conhecido só depois de baixar.
 */
export const BYTES_POR_TILE = 41_529;

/** De onde veio o número acima. Estimativa sem procedência é chute com aparência de dado. */
export const PROCEDENCIA_BYTES_POR_TILE = Object.freeze({
  amostra: 10,
  zooms: [12, 15],
  fonte: 'tile.openstreetmap.org',
  regiao: 'São Paulo (SP) — urbana e periurbana',
  medidoEm: '2026-09-05',
  mediaBytes: 41_529,
});

/**
 * Teto de um pacote de região.
 *
 * Não é um número escolhido por gosto: 12 000 tiles × 41,5 kB ≈ **500 MB**, e
 * meio giga é o que se pode pedir a um celular de campo sem competir com as
 * fotos da pessoa. Passar disso não é recusado por capricho — é recusado
 * porque baixar 2 GB por uma barra de progresso que falha no fim é pior que
 * dizer não na hora.
 */
export const TETO_TILES_REGIAO = 12_000;
export const TETO_BYTES_REGIAO = TETO_TILES_REGIAO * BYTES_POR_TILE;

/** Zoom em que o traçado de rua ainda é legível a pé. */
export const ZOOM_PADRAO = Object.freeze({ minimo: 11, maximo: 15 });

export const MOTIVOS_REGIAO = Object.freeze({
  OK: 'OK',
  GRANDE_DEMAIS: 'GRANDE_DEMAIS',
  CENTRO_INVALIDO: 'CENTRO_INVALIDO',
  RAIO_INVALIDO: 'RAIO_INVALIDO',
  SEM_FONTE: 'SEM_FONTE',
  /** Corredor sem linha: dois pontos válidos são o mínimo para haver caminho. */
  ROTA_INVALIDA: 'ROTA_INVALIDA',
});

const GRAU_LAT_KM = 111.32;

/**
 * Caixa que cobre um raio em quilômetros ao redor de um ponto.
 *
 * A longitude encolhe com o cosseno da latitude: um grau vale 111 km no
 * equador e 55 km a 60°. Ignorar isso faria a caixa ficar larga demais longe
 * do equador — e o tamanho do pacote dobrar sem ninguém entender por quê.
 */
export function boundsDoRaio({ lat, lon, raioKm }) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  const raio = Number(raioKm);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!Number.isFinite(raio) || raio <= 0) return null;

  const deltaLat = raio / GRAU_LAT_KM;
  // Perto do polo o cosseno tende a zero e a caixa explodiria para o globo
  // inteiro. O piso mantém a conta finita e o teto de tiles faz o resto.
  const cos = Math.max(0.01, Math.cos(latitude * Math.PI / 180));
  const deltaLon = raio / (GRAU_LAT_KM * cos);

  return {
    norte: Math.min(85.0511, latitude + deltaLat),
    sul: Math.max(-85.0511, latitude - deltaLat),
    oeste: Math.max(-180, longitude - deltaLon),
    leste: Math.min(180, longitude + deltaLon),
  };
}

/** Quantos tiles uma caixa ocupa num zoom. Contagem exata, sem gerar as URLs. */
export function contarTiles(bounds, zoom) {
  if (!bounds) return 0;
  const x0 = tileX(bounds.oeste, zoom);
  const x1 = tileX(bounds.leste, zoom);
  const y0 = tileY(bounds.norte, zoom);
  const y1 = tileY(bounds.sul, zoom);
  const largura = Math.max(0, x1 - x0) + 1;
  const altura = Math.max(0, y1 - y0) + 1;
  return largura * altura;
}

/**
 * O custo do planeta inteiro num zoom — para a interface poder mostrar a conta.
 *
 * A contagem de tiles é exata (é a definição da pirâmide). Os bytes são um
 * limite superior grosseiro: supõem tile com conteúdo de terra em toda parte,
 * e dois terços do planeta são oceano. Mesmo assim a conclusão não muda, e é
 * por isso que a função devolve a contagem em separado dos bytes.
 */
export function custoDoPlaneta(zoom) {
  const z = Math.max(0, Math.floor(Number(zoom) || 0));
  const tiles = 4 ** z;
  return {
    zoom: z,
    tiles,
    bytesSupondoTerra: tiles * BYTES_POR_TILE,
    /** A contagem é exata; os bytes supõem terra em toda parte. */
    exato: 'tiles',
  };
}

/**
 * Planeja um pacote de região.
 *
 * Devolve o plano **e o motivo** quando ele não cabe: uma função que só
 * devolve lista vazia obriga a interface a adivinhar se a região é grande
 * demais, se falta fonte de tile ou se o centro veio inválido — três
 * problemas com três respostas diferentes para quem está usando.
 */
export function planejarRegiao({
  centro,
  raioKm = 15,
  zoomMinimo = ZOOM_PADRAO.minimo,
  zoomMaximo = ZOOM_PADRAO.maximo,
  base = {},
  tetoTiles = TETO_TILES_REGIAO,
} = {}) {
  const vazio = (motivo) => ({
    cabe: false, motivo, urls: [], tiles: 0, bytesEstimados: 0,
    porZoom: [], bounds: null, raioKm: Number(raioKm) || 0,
  });

  const bounds = boundsDoRaio({ lat: centro?.lat, lon: centro?.lon, raioKm });
  if (!bounds) {
    const centroValido = Number.isFinite(Number(centro?.lat)) && Number.isFinite(Number(centro?.lon));
    return vazio(centroValido ? MOTIVOS_REGIAO.RAIO_INVALIDO : MOTIVOS_REGIAO.CENTRO_INVALIDO);
  }

  const templates = [...new Set(
    (Array.isArray(base.tiles) ? base.tiles : [base.tiles]).filter(Boolean).map(String)
  )];
  if (!templates.length) return { ...vazio(MOTIVOS_REGIAO.SEM_FONTE), bounds };

  const zMin = Math.max(0, Math.floor(Number(zoomMinimo)));
  const zMax = Math.min(Number(base.maxzoom ?? 16), Math.floor(Number(zoomMaximo)));

  // Contar ANTES de gerar: uma região grande demais não deve custar a memória
  // de milhões de strings de URL só para ser recusada no fim.
  const porZoom = [];
  let tiles = 0;
  for (let z = zMin; z <= zMax; z += 1) {
    const noZoom = contarTiles(bounds, z) * templates.length;
    porZoom.push({ zoom: z, tiles: noZoom });
    tiles += noZoom;
  }

  const bytesEstimados = tiles * BYTES_POR_TILE;
  if (tiles > tetoTiles) {
    return {
      cabe: false, motivo: MOTIVOS_REGIAO.GRANDE_DEMAIS,
      urls: [], tiles, bytesEstimados, porZoom, bounds, raioKm: Number(raioKm),
      /** Quanto encolher: o raio que caberia, para a interface poder sugerir. */
      raioSugeridoKm: Math.max(1, Math.floor(Number(raioKm) * Math.sqrt(tetoTiles / tiles))),
    };
  }

  const urls = [];
  for (let z = zMin; z <= zMax; z += 1) {
    const x0 = tileX(bounds.oeste, z);
    const x1 = tileX(bounds.leste, z);
    const y0 = tileY(bounds.norte, z);
    const y1 = tileY(bounds.sul, z);
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        for (const template of templates) urls.push(urlDoTile(template, x, y, z));
      }
    }
  }

  return {
    cabe: true, motivo: MOTIVOS_REGIAO.OK,
    urls, tiles, bytesEstimados, porZoom, bounds, raioKm: Number(raioKm),
  };
}

/** Bytes em texto curto — a interface mostra tamanho, não uma soma crua. */
export function formatarBytes(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return '0 MB';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} kB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  if (b < 1024 ** 4) return `${(b / (1024 ** 3)).toFixed(1)} GB`;
  return `${(b / (1024 ** 4)).toFixed(1)} TB`;
}


/* ───────────────────────────── CORREDOR DE ROTA ─────────────────────────────
 *
 * Uma peregrinação não é um círculo. Londrina → Bandeirantes são 84,3 km em
 * linha reta: um círculo que cobrisse as duas pontas teria 42 km de raio e
 * baixaria uma área enorme onde ninguém vai pisar.
 *
 * O que serve é o CORREDOR — os tiles a até X km da linha do caminho. Medido
 * nesse trecho, contra a caixa retangular que o contém:
 *
 *     zoom | corredor | caixa  | economia
 *      z13 |       45 |    168 |   73 %
 *      z15 |      726 |  2 460 |   70 %
 *      z17 |   11 683 | 37 816 |   69 %
 *
 * Setenta por cento é a diferença entre caber e não caber.
 *
 * ## De onde vem a linha
 *
 * **Do operador, nunca deste código.** Um traçado inventado num aplicativo de
 * navegação é o pior tipo de dado falso, porque alguém segue. A linha entra
 * por GPX/KML importado (o app já faz isso), pela trilha já gravada, ou como
 * reta entre dois pontos — e nesse último caso a interface diz que é reta, que
 * não é o caminho.
 */

/** Passos de zoom onde as casas começam a ser desenhadas na maioria das bases. */
export const ZOOM_CASAS = 17;

const GRAU_LON_KM = (lat) => GRAU_LAT_KM * Math.max(0.01, Math.cos(lat * Math.PI / 180));

/** Comprimento da linha, em km. Sem depender de `engine/` — este é `core/`. */
export function comprimentoDaRota(pontos = []) {
  const lista = normalizarRota(pontos);
  let km = 0;
  for (let i = 1; i < lista.length; i += 1) {
    const a = lista[i - 1];
    const b = lista[i];
    const latMedia = (a.lat + b.lat) / 2;
    km += Math.hypot((b.lat - a.lat) * GRAU_LAT_KM, (b.lon - a.lon) * GRAU_LON_KM(latMedia));
  }
  return km;
}

function normalizarRota(pontos) {
  return (Array.isArray(pontos) ? pontos : [])
    .map((p) => ({ lat: Number(p?.lat ?? p?.latitude), lon: Number(p?.lon ?? p?.longitude) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)
      && p.lat >= -85.0511 && p.lat <= 85.0511 && p.lon >= -180 && p.lon <= 180);
}

/** Distância de um ponto ao segmento AB, em km, em plano local. */
function distanciaAoSegmentoKm(ponto, a, b) {
  const kx = GRAU_LON_KM(ponto.lat);
  const ax = a.lon * kx, ay = a.lat * GRAU_LAT_KM;
  const bx = b.lon * kx, by = b.lat * GRAU_LAT_KM;
  const px = ponto.lon * kx, py = ponto.lat * GRAU_LAT_KM;
  const dx = bx - ax, dy = by - ay;
  const denominador = dx * dx + dy * dy;
  // Segmento degenerado (dois fixos no mesmo lugar): vira distância ao ponto.
  const t = denominador === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominador));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Centro geográfico de um tile — para medir a distância dele até a rota. */
function centroDoTile(x, y, zoom) {
  const n = 2 ** zoom;
  return {
    lon: ((x + 0.5) / n) * 360 - 180,
    lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * ((y + 0.5) / n)))) * 180 / Math.PI,
  };
}

/**
 * Planeja o corredor ao longo de uma rota.
 *
 * Varre a caixa de CADA SEGMENTO, não a da rota inteira: numa rota longa a
 * caixa total pode ter milhões de células vazias, e contá-las para descartar
 * quase todas seria pagar pelo que não se leva. O custo fica proporcional ao
 * que sai, não ao retângulo que contém a viagem.
 */
export function planejarCorredor({
  pontos,
  raioKm = 5,
  zoomMinimo = ZOOM_PADRAO.minimo,
  zoomMaximo = ZOOM_PADRAO.maximo,
  base = {},
  tetoTiles = TETO_TILES_REGIAO,
} = {}) {
  const rota = normalizarRota(pontos);
  const raio = Number(raioKm);
  const vazio = (motivo, extras = {}) => ({
    cabe: false, motivo, urls: [], tiles: 0, bytesEstimados: 0,
    porZoom: [], comprimentoKm: 0, raioKm: Number.isFinite(raio) ? raio : 0, ...extras,
  });

  if (rota.length < 2) return vazio(MOTIVOS_REGIAO.ROTA_INVALIDA);
  if (!Number.isFinite(raio) || raio <= 0) return vazio(MOTIVOS_REGIAO.RAIO_INVALIDO);

  const templates = [...new Set(
    (Array.isArray(base.tiles) ? base.tiles : [base.tiles]).filter(Boolean).map(String)
  )];
  if (!templates.length) return vazio(MOTIVOS_REGIAO.SEM_FONTE);

  const zMin = Math.max(0, Math.floor(Number(zoomMinimo)));
  const zMax = Math.min(Number(base.maxzoom ?? 16), Math.floor(Number(zoomMaximo)));
  const comprimentoKm = comprimentoDaRota(rota);

  const porZoom = [];
  const chavesPorZoom = new Map();
  let tiles = 0;

  for (let z = zMin; z <= zMax; z += 1) {
    const chaves = new Set();
    for (let i = 1; i < rota.length; i += 1) {
      const a = rota[i - 1];
      const b = rota[i];
      const dLat = raio / GRAU_LAT_KM;
      const dLon = raio / GRAU_LON_KM((a.lat + b.lat) / 2);
      const x0 = tileX(Math.min(a.lon, b.lon) - dLon, z);
      const x1 = tileX(Math.max(a.lon, b.lon) + dLon, z);
      const y0 = tileY(Math.max(a.lat, b.lat) + dLat, z);
      const y1 = tileY(Math.min(a.lat, b.lat) - dLat, z);
      for (let x = x0; x <= x1; x += 1) {
        for (let y = y0; y <= y1; y += 1) {
          const chave = `${x}/${y}`;
          if (chaves.has(chave)) continue;
          if (distanciaAoSegmentoKm(centroDoTile(x, y, z), a, b) <= raio) chaves.add(chave);
        }
      }
    }
    chavesPorZoom.set(z, chaves);
    const noZoom = chaves.size * templates.length;
    porZoom.push({ zoom: z, tiles: noZoom });
    tiles += noZoom;
  }

  const bytesEstimados = tiles * BYTES_POR_TILE;
  if (tiles > tetoTiles) {
    return {
      cabe: false, motivo: MOTIVOS_REGIAO.GRANDE_DEMAIS,
      urls: [], tiles, bytesEstimados, porZoom, comprimentoKm, raioKm: raio,
      /** Até que zoom caberia — encolher o detalhe custa menos que perder o caminho. */
      zoomSugerido: porZoom.reduce((maior, atual, indice) => {
        const ate = porZoom.slice(0, indice + 1).reduce((soma, z) => soma + z.tiles, 0);
        return ate <= tetoTiles ? atual.zoom : maior;
      }, null),
    };
  }

  const urls = [];
  for (const [z, chaves] of chavesPorZoom) {
    for (const chave of chaves) {
      const [x, y] = chave.split('/');
      for (const template of templates) urls.push(urlDoTile(template, x, y, z));
    }
  }

  return {
    cabe: true, motivo: MOTIVOS_REGIAO.OK,
    urls, tiles, bytesEstimados, porZoom, comprimentoKm, raioKm: raio,
  };
}
