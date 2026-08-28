import { cartoBasemapDisponivel, cartoVoyagerTiles } from '../config/cartografia.js';

/**
 * Catálogo de camadas de mapa — COMPARTILHADO entre Projeto Baluarte e
 * Project Vanguard.
 *
 * Regras: atribuição visível e nenhuma chave real versionada.
 */

export function dataGibs(agora = Date.now()) {
  return new Date(agora - 36 * 3600 * 1000).toISOString().slice(0, 10);
}

export const CAMADAS_BASE = [
  {
    id: 'carto-voyager',
    nome: 'CARTO Voyager',
    desc: 'Base cartográfica clara para uso online.',
    padrao: false,
    disponivel: cartoBasemapDisponivel(),
    tileSize: 256,
    maxzoom: 20,
    tiles: cartoVoyagerTiles(),
    creditos: '© CARTO · © OpenStreetMap contributors',
  },
  {
    id: 'sat',
    nome: 'Satélite',
    desc: 'Imagem de satélite de alta resolução.',
    padrao: true,
    tileSize: 256,
    maxzoom: 22,
    tiles: [
      'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    ],
    creditos: '© Google',
  },
  {
    id: 'terreno', nome: 'Topográfico', desc: 'Curvas de nível, trilhas e cotas.',
    tileSize: 256, maxzoom: 17,
    tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
    creditos: '© OpenTopoMap · © OpenStreetMap',
  },
  {
    id: 'dark', nome: 'Tático escuro', desc: 'Base escura de baixo contraste.',
    tileSize: 256, maxzoom: 19,
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    paint: {'raster-saturation': -1, 'raster-brightness-min': 0.05, 'raster-brightness-max': 0.28, 'raster-contrast': 0.15, 'raster-opacity': 0.96},
    creditos: '© OpenStreetMap contributors',
  },
  {
    id: 'imagery', nome: 'Satélite (ESRI)', desc: 'Segunda fonte de imagem.',
    tileSize: 256, maxzoom: 19,
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    creditos: '© Esri · Maxar · Earthstar Geographics',
  },
];

export const CAMADAS_OVERLAY = [
  {
    id: 'labels', nome: 'Nomes e rótulos', desc: 'Nomes de lugares e limites.', tipo: 'raster', padrao: true, tileSize: 256, maxzoom: 23,
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
    creditos: '© Esri · HERE · Garmin · © OpenStreetMap contributors',
  },
  {
    id: 'gibs', nome: 'MODIS (satélite de ontem)', desc: 'Imagem global diária da NASA.', tipo: 'raster', tileSize: 256, maxzoom: 9, opacidade: 0.85,
    tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor' + `/default/${dataGibs()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],
    creditos: '© NASA GIBS / MODIS Terra',
  },
  {
    id: 'gebco', nome: 'Batimetria (GEBCO)', desc: 'Relevo do fundo do mar.', tipo: 'raster', tileSize: 256, opacidade: 0.7,
    tiles: ['https://wms.gebco.net/mapserv?request=GetMap&service=WMS&version=1.3.0&layers=GEBCO_LATEST&styles=&format=image/png&transparent=true&crs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}'],
    creditos: '© GEBCO',
  },
  { id: 'hillshade', nome: 'Sombreamento do relevo', desc: 'Realce de encosta a partir do DEM.', tipo: 'hillshade', fonteDem: 'dem', exageroPadrao: 0.5, creditos: '© Mapzen / AWS Terrain Tiles' },
];

export const CAMADA_DEM = {
  id: 'dem', nome: 'Elevação (DEM)', tipo: 'raster-dem', tileSize: 256, maxzoom: 15, encoding: 'terrarium',
  tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'],
  creditos: '© Mapzen / AWS Terrain Tiles',
};

export function creditosDe(ids = null) {
  const todas = [...CAMADAS_BASE, ...CAMADAS_OVERLAY, CAMADA_DEM];
  const alvo = ids ? todas.filter((c) => ids.includes(c.id)) : todas;
  return [...new Set(alvo.map((c) => c.creditos).filter(Boolean))];
}

export function camadaPorId(id) {
  return [...CAMADAS_BASE, ...CAMADAS_OVERLAY, CAMADA_DEM].find((c) => c.id === id) || null;
}

export function estiloMapLibre({base = 'sat', overlays = ['labels'], glyphs = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf', incluirDem = true} = {}) {
  const sources = {}; const layers = [];
  for (const c of CAMADAS_BASE) sources[c.id] = {type: 'raster', tiles: c.tiles, tileSize: c.tileSize, maxzoom: c.maxzoom, attribution: c.creditos};
  if (incluirDem) sources[CAMADA_DEM.id] = {type: 'raster-dem', tiles: CAMADA_DEM.tiles, tileSize: CAMADA_DEM.tileSize, maxzoom: CAMADA_DEM.maxzoom, encoding: CAMADA_DEM.encoding, attribution: CAMADA_DEM.creditos};
  for (const c of CAMADAS_OVERLAY) if (c.tipo === 'raster') sources[c.id] = {type: 'raster', tiles: c.tiles, tileSize: c.tileSize, maxzoom: c.maxzoom, attribution: c.creditos};
  for (const c of CAMADAS_BASE) layers.push({id: `base-${c.id}`, type: 'raster', source: c.id, layout: {visibility: c.id === base && c.disponivel !== false ? 'visible' : 'none'}});
  for (const c of CAMADAS_OVERLAY) {
    const visivel = overlays.includes(c.id);
    if (c.tipo === 'raster') layers.push({id: `${c.id}-layer`, type: 'raster', source: c.id, layout: {visibility: visivel ? 'visible' : 'none'}, paint: c.opacidade ? {'raster-opacity': c.opacidade} : {}});
    else if (c.tipo === 'hillshade' && incluirDem) layers.push({id: c.id, type: 'hillshade', source: c.fonteDem, layout: {visibility: visivel ? 'visible' : 'none'}, paint: {'hillshade-exaggeration': c.exageroPadrao}});
  }
  const style = {version: 8, sources, layers}; if (glyphs) style.glyphs = glyphs; return style;
}
