export const LIMITE_TILES_OFFLINE = 256;

function longitudeNormalizada(lon) {
  const valor = Number(lon);
  if (!Number.isFinite(valor)) return 0;
  return ((valor + 180) % 360 + 360) % 360 - 180;
}

export function tileX(lon, zoom) {
  const n = 2 ** zoom;
  const longitude = longitudeNormalizada(lon);
  return Math.min(n - 1, Math.max(0, Math.floor(((longitude + 180) / 360) * n)));
}

export function tileY(lat, zoom) {
  const n = 2 ** zoom;
  const rad = Math.max(-85.0511, Math.min(85.0511, Number(lat))) * Math.PI / 180;
  return Math.min(n - 1, Math.max(0, Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * n)));
}

export function urlDoTile(template, x, y, z) {
  return String(template).replace('{x}', x).replace('{y}', y).replace('{z}', z);
}

function xsDoIntervalo(west, east, zoom) {
  const n = 2 ** zoom;
  const longitudeInicial = Number(west);
  const longitudeFinal = Number(east);
  if (!Number.isFinite(longitudeInicial) || !Number.isFinite(longitudeFinal)) return [];
  if (longitudeFinal - longitudeInicial >= 360 || (longitudeInicial <= -180 && longitudeFinal >= 180)) {
    return Array.from({ length: n }, (_, indice) => indice);
  }
  const inicio = tileX(longitudeInicial, zoom);
  const fim = tileX(longitudeFinal, zoom);
  const cruzaAntimeridiano = longitudeInicial > longitudeFinal;
  if (cruzaAntimeridiano || fim < inicio) {
    return [...Array.from({ length: n - inicio }, (_, indice) => inicio + indice), ...Array.from({ length: fim + 1 }, (_, indice) => indice)];
  }
  return Array.from({ length: fim - inicio + 1 }, (_, indice) => inicio + indice);
}

function ysDoIntervalo(north, south, zoom) {
  const inicio = tileY(north, zoom);
  const fim = tileY(south, zoom);
  return fim < inicio ? [fim, inicio] : [inicio, fim];
}

export function planejarTilesDoViewport(bounds, base = {}) {
  if (!bounds?.getWest || !bounds?.getEast || !bounds?.getNorth || !bounds?.getSouth) return { urls: [], totalEstimado: 0, limitado: false };
  const zoomAtual = Math.max(0, Math.floor(Number(base.zoomAtual ?? 12)));
  const minimo = Math.max(5, zoomAtual - 1);
  const maximo = Math.min(Number(base.maxzoom ?? 16), zoomAtual + 1, 16);
  const templates = [...new Set((Array.isArray(base.tiles) ? base.tiles : [base.tiles]).filter(Boolean).map(String))];
  const urls = new Set();
  let totalEstimado = 0;
  for (let z = minimo; z <= maximo; z++) {
    const xs = xsDoIntervalo(bounds.getWest(), bounds.getEast(), z);
    const [y0, y1] = ysDoIntervalo(bounds.getNorth(), bounds.getSouth(), z);
    totalEstimado += xs.length * Math.max(0, y1 - y0 + 1) * templates.length;
    if (urls.size >= LIMITE_TILES_OFFLINE) continue;
    for (const x of xs) {
      for (let y = y0; y <= y1; y++) {
        for (const template of templates) {
          urls.add(urlDoTile(template, x, y, z));
          if (urls.size >= LIMITE_TILES_OFFLINE) break;
        }
        if (urls.size >= LIMITE_TILES_OFFLINE) break;
      }
      if (urls.size >= LIMITE_TILES_OFFLINE) break;
    }
  }
  const todos = [...urls];
  return { urls: todos.slice(0, LIMITE_TILES_OFFLINE), totalEstimado, limitado: totalEstimado > LIMITE_TILES_OFFLINE };
}

export function tilesDoViewport(bounds, base = {}) {
  return planejarTilesDoViewport(bounds, base).urls;
}
