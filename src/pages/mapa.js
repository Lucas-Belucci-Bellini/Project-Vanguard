import '../styles/mapa.css';
import { h, empty, dist, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { iniciarAcompanhamento, solicitarPosicao, precisaoLabel, velocidadeLabel } from '../core/localizacao.js';
import { haversine, vincentyInverse, bearingTo } from '../engine/geo.js';
import { latLonParaMGRS, latLonParaUTM, utmParaLatLon, fusoDe } from '../engine/mgrs.js';
import { CAMADAS_BASE } from '../data/camadas-mapa.js';

const BASES = Object.fromEntries(CAMADAS_BASE.map((camada) => [camada.id, camada]));
const CENTRO_FALLBACK = [-43.21, -22.95];

function intervaloGrade(zoom) {
  if (zoom >= 15) return 100;
  if (zoom >= 12.5) return 1000;
  if (zoom >= 9.5) return 10000;
  return 100000;
}

function gerarGrade(bounds, zoom) {
  const passo = intervaloGrade(zoom);
  const so = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const zona = fusoDe((so.lat + ne.lat) / 2, (so.lng + ne.lng) / 2);
  const cantos = [
    latLonParaUTM(so.lat, so.lng, zona),
    latLonParaUTM(ne.lat, ne.lng, zona),
    latLonParaUTM(so.lat, ne.lng, zona),
    latLonParaUTM(ne.lat, so.lng, zona)
  ];
  const eMin = Math.min(...cantos.map((c) => c.easting));
  const eMax = Math.max(...cantos.map((c) => c.easting));
  const nMin = Math.min(...cantos.map((c) => c.northing));
  const nMax = Math.max(...cantos.map((c) => c.northing));
  if ((eMax - eMin) / passo > 80 || (nMax - nMin) / passo > 80) return { type: 'FeatureCollection', features: [] };

  const hemisferio = so.lat < 0 ? 'S' : 'N';
  const features = [];
  for (let e = Math.ceil(eMin / passo) * passo; e <= eMax; e += passo) {
    const coords = [];
    for (let i = 0; i <= 10; i++) {
      const n = nMin + ((nMax - nMin) * i) / 10;
      const p = utmParaLatLon({ zona, easting: e, northing: n, hemisferio });
      coords.push([p.lon, p.lat]);
    }
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { eixo: 'E', valor: e, forte: e % (passo * 10) === 0 } });
  }
  for (let n = Math.ceil(nMin / passo) * passo; n <= nMax; n += passo) {
    const coords = [];
    for (let i = 0; i <= 10; i++) {
      const e = eMin + ((eMax - eMin) * i) / 10;
      const p = utmParaLatLon({ zona, easting: e, northing: n, hemisferio });
      coords.push([p.lon, p.lat]);
    }
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { eixo: 'N', valor: n, forte: n % (passo * 10) === 0 } });
  }
  return { type: 'FeatureCollection', features, passo };
}

function rotuloDaLinha(valor, passo) {
  return String(Math.floor((valor % 100000) / passo) % 100).padStart(2, '0');
}

function tileX(lon, zoom) { return Math.floor(((lon + 180) / 360) * (2 ** zoom)); }
function tileY(lat, zoom) {
  const rad = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
  return Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * (2 ** zoom));
}
function urlDoTile(template, x, y, z) {
  return template.replace('{x}', x).replace('{y}', y).replace('{z}', z);
}
function tilesDoViewport(bounds, base) {
  const zoomAtual = Math.max(0, Math.floor(base?.zoomAtual ?? 12));
  const minimo = Math.max(5, zoomAtual - 1);
  const maximo = Math.min(Number(base?.maxzoom ?? 16), zoomAtual + 1, 16);
  const urls = new Set();
  for (let z = minimo; z <= maximo; z++) {
    const x0 = tileX(bounds.getWest(), z);
    const x1 = tileX(bounds.getEast(), z);
    const y0 = tileY(bounds.getNorth(), z);
    const y1 = tileY(bounds.getSouth(), z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (const template of base.tiles ?? []) urls.add(urlDoTile(template, x, y, z));
      }
    }
  }
  return [...urls].slice(0, 256);
}

async function carregarMapLibre() {
  try {
    await import('maplibre-gl/dist/maplibre-gl.css');
    const mod = await import('maplibre-gl');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

export function mapaPage() {
  const raiz = h('div', { className: 'vg-pagina mapa' });
  const canvas = h('div', { className: 'mapa__canvas' });
  const rotulos = h('canvas', { className: 'mapa__rotulos', 'aria-hidden': 'true' });
  const topoLocal = h('span', { className: 'mapa__hud-coord' }, 'AGUARDANDO GPS');
  const topoMeta = h('span', { className: 'mapa__hud-meta' }, 'POSIÇÃO NÃO CONFIRMADA');
  const estadoGps = h('span', { className: 'mapa__gps-label' }, 'GPS DESLIGADO');
  const modoBotao = h('button', { className: 'mapa__mode-button', type: 'button' }, 'MARCAR PONTO');
  const sheetStatus = h('p', { className: 'mapa__sheet-status', role: 'status' }, 'Ative uma rota para registrar o caminho no aparelho.');
  const routeButton = h('button', { className: 'mapa__route-button', type: 'button' }, 'INICIAR ROTA');
  const centerButton = h('button', { className: 'mapa__quick-button', type: 'button' }, '⌾ CENTRAR');
  const clearButton = h('button', { className: 'mapa__quick-button mapa__quick-button--quiet', type: 'button' }, 'LIMPAR TRILHA');
  const offlineButton = h('button', { className: 'mapa__offline-button', type: 'button' }, 'PREPARAR ÁREA OFFLINE');
  const offlineStatus = h('p', { className: 'mapa__offline-status', role: 'status' }, 'Baixe a área visível antes de sair sem internet.');
  const selectBase = h('select', { className: 'mapa__select', ariaLabel: 'Base cartográfica' },
    ...CAMADAS_BASE.map((base) => h('option', { value: base.id }, base.nome.toUpperCase()))
  );
  selectBase.value = 'terreno' in BASES ? 'terreno' : Object.keys(BASES)[0];
  const selectUso = h('select', { className: 'mapa__select', ariaLabel: 'Modo de uso' },
    h('option', { value: 'trilha' }, 'TRILHA / EXPEDIÇÃO'),
    h('option', { value: 'cidade' }, 'CIDADE / DIA A DIA')
  );
  selectUso.value = estado.get(CHAVES.MODO_USO, 'trilha');
  const destinoInput = h('input', { className: 'mapa__destino-input', type: 'text', inputMode: 'decimal', placeholder: 'LAT, LON  ·  ex.: -23.55, -46.63', ariaLabel: 'Coordenadas do destino' });
  const destinoButton = h('button', { className: 'mapa__destino-button', type: 'button' }, 'DEFINIR DESTINO');
  const destinoMapButton = h('button', { className: 'mapa__destino-map-button', type: 'button' }, 'TOCAR NO MAPA');
  const destinoInfo = h('p', { className: 'mapa__destino-info' }, 'Cole coordenadas ou toque no mapa para definir um destino.');

  const sheet = h('aside', { className: 'mapa__sheet' },
    h('div', { className: 'mapa__sheet-handle', ariaHidden: 'true' }),
    h('div', { className: 'mapa__sheet-header' },
      h('div', null, h('span', { className: 'mapa__kicker' }, 'NAVEGAÇÃO MULTIUSO'), h('h1', null, 'Mapa de campo')),
      h('label', { className: 'mapa__base-label' }, h('span', null, 'BASE'), selectBase)
    ),
    h('label', { className: 'mapa__uso-label' }, h('span', null, 'MODO DE USO'), selectUso),
    h('div', { className: 'mapa__quick-actions' }, centerButton, clearButton),
    h('div', { className: 'mapa__offline-card' }, offlineButton, offlineStatus),
    h('div', { className: 'mapa__destino-card' },
      h('div', { className: 'mapa__route-card-head' }, h('span', { className: 'mapa__kicker' }, 'DESTINO'), h('span', { className: 'mapa__privacy' }, '⌖ NO APARELHO')),
      destinoInput,
      h('div', { className: 'mapa__destino-actions' }, destinoButton, destinoMapButton),
      destinoInfo
    ),
    h('div', { className: 'mapa__route-card' },
      h('div', { className: 'mapa__route-card-head' },
        h('span', { className: 'mapa__kicker' }, 'ROTA LOCAL'),
        h('span', { className: 'mapa__privacy' }, '⌖ SEM ENVIO')
      ),
      h('strong', { className: 'mapa__route-distance' }, '0 m'),
      h('span', { className: 'mapa__route-caption' }, 'distância registrada'),
      routeButton,
      sheetStatus
    ),
    h('div', { className: 'mapa__map-actions' }, modoBotao, h('button', { className: 'mapa__socorro-button', type: 'button', onclick: () => { location.hash = '#/socorro'; } }, 'MODO SOCORRO →'))
  );

  const hud = h('div', { className: 'mapa__hud' },
    h('div', { className: 'mapa__hud-card' },
      h('div', { className: 'mapa__hud-label' }, 'FIXO ATUAL · MGRS'),
      topoLocal,
      topoMeta
    ),
    h('div', { className: 'mapa__gps-pill' }, h('span', { className: 'mapa__gps-dot' }), estadoGps)
  );
  const markerHint = h('div', { className: 'mapa__hint' }, 'Toque no mapa para marcar um ponto');
  canvas.append(rotulos);
  raiz.append(canvas, hud, markerHint, sheet);

  let mapa = null;
  let posicao = estado.get(CHAVES.LOCAL, null);
  let trilha = estado.get(CHAVES.TRILHA, []);
  let waypoints = estado.get(CHAVES.WAYPOINTS, []);
  let destino = estado.get(CHAVES.DESTINO, null);
  let rotaAtiva = Boolean(estado.get(CHAVES.ROTA_ATIVA, false));
  let marcando = false;
  let marcandoDestino = false;
  let primeiraPosicao = !posicao;
  let desmontado = false;
  let gradeAtual = { type: 'FeatureCollection', features: [], passo: 1000 };

  function distanciaTrilha() {
    let total = 0;
    for (let i = 1; i < trilha.length; i++) total += haversine(trilha[i - 1], trilha[i]);
    return total;
  }

  function atualizarHud() {
    if (!posicao) {
      topoLocal.textContent = 'AGUARDANDO GPS';
      topoMeta.textContent = 'POSIÇÃO NÃO CONFIRMADA';
      estadoGps.textContent = 'GPS DESLIGADO';
      return;
    }
    try { topoLocal.textContent = latLonParaMGRS(posicao.lat, posicao.lon, 5, true); } catch { topoLocal.textContent = `${num(posicao.lat, 5)}, ${num(posicao.lon, 5)}`; }
    topoMeta.textContent = `${num(posicao.lat, 5)}, ${num(posicao.lon, 5)} · ${precisaoLabel(posicao.accuracy)}`;
    estadoGps.textContent = `GPS ${precisaoLabel(posicao.accuracy)}`;
  }

  function atualizarDestino() {
    if (!destino) {
      destinoInfo.textContent = 'Cole latitude e longitude para ver direção e distância.';
      return;
    }
    if (!posicao) {
      destinoInfo.textContent = `DESTINO SALVO · ${num(destino.lat, 5)}, ${num(destino.lon, 5)} · aguardando GPS`;
      return;
    }
    const medida = vincentyInverse(posicao, destino);
    const rumo = bearingTo(posicao, destino);
    destinoInfo.textContent = medida
      ? `${dist(medida.distancia)} · rumo ${String(Math.round(rumo)).padStart(3, '0')}° · destino salvo`
      : 'Destino salvo; distância indisponível nesta geometria.';
  }

  function atualizarSheet() {
    sheet.querySelector('.mapa__route-distance').textContent = dist(distanciaTrilha());
    routeButton.textContent = rotaAtiva ? 'PAUSAR ROTA' : 'INICIAR ROTA';
    routeButton.classList.toggle('is-active', rotaAtiva);
    sheetStatus.textContent = rotaAtiva
      ? `Gravando no aparelho · ${trilha.length} pontos · ${velocidadeLabel(posicao?.speed)}`
      : trilha.length
        ? `${trilha.length} pontos guardados localmente · pronto para continuar`
        : 'Ative uma rota para registrar o caminho no aparelho.';
    modoBotao.textContent = marcando ? 'CANCELAR MARCAÇÃO' : 'MARCAR PONTO';
    modoBotao.classList.toggle('is-active', marcando);
    destinoMapButton.textContent = marcandoDestino ? 'CANCELAR TOQUE' : 'TOCAR NO MAPA';
    destinoMapButton.classList.toggle('is-active', marcandoDestino);
    atualizarDestino();
  }

  function definirDestino() {
    const partes = destinoInput.value.trim().split(/[;,\s]+/).filter(Boolean).map(Number);
    const [lat, lon] = partes;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      destinoInfo.textContent = 'Formato inválido. Use latitude e longitude, por exemplo: -23.55, -46.63.';
      return;
    }
    destino = { id: `d-${Date.now()}`, nome: 'Destino', lat, lon, createdAt: Date.now() };
    estado.set(CHAVES.DESTINO, destino);
    destinoInput.value = '';
    destinoButton.textContent = 'DESTINO ATUALIZADO';
    atualizarDestino();
    atualizarMarcadores();
  }

  function atualizarMarcadores() {
    if (!mapa || !mapa.getSource('vanguard-marcadores')) return;
    const features = [];
    if (posicao) features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [posicao.lon, posicao.lat] }, properties: { tipo: 'voce' } });
    for (const ponto of waypoints) features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [ponto.lon, ponto.lat] }, properties: { tipo: 'ponto' } });
    if (destino) features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [destino.lon, destino.lat] }, properties: { tipo: 'destino' } });
    mapa.getSource('vanguard-marcadores').setData({ type: 'FeatureCollection', features });
    mapa.getSource('vanguard-trilha').setData({ type: 'FeatureCollection', features: trilha.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: trilha.map((p) => [p.lon, p.lat]) }, properties: {} }] : [] });
    mapa.getSource('vanguard-destino').setData({ type: 'FeatureCollection', features: posicao && destino ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[posicao.lon, posicao.lat], [destino.lon, destino.lat]] }, properties: {} }] : [] });
  }

  function centralizar() {
    if (mapa && posicao) mapa.flyTo({ center: [posicao.lon, posicao.lat], zoom: Math.max(mapa.getZoom(), 15), duration: 500 });
    else if (mapa) solicitarPosicao({ onPosition: (pos) => { posicao = pos; atualizarHud(); mapa.flyTo({ center: [pos.lon, pos.lat], zoom: 15 }); }, onError: () => { sheetStatus.textContent = 'Permita o GPS nas configurações do aparelho para centralizar.'; } });
  }

  function alternarRota() {
    if (!posicao) {
      sheetStatus.textContent = 'Aguardando GPS. Toque em centralizar e permita a localização primeiro.';
      centralizar();
      return;
    }
    rotaAtiva = !rotaAtiva;
    estado.set(CHAVES.ROTA_ATIVA, rotaAtiva);
    if (rotaAtiva && trilha.length === 0) {
      trilha = [posicao];
      estado.set(CHAVES.TRILHA, trilha);
    }
    atualizarSheet();
    atualizarMarcadores();
  }

  function limparTrilha() {
    if (!trilha.length && !waypoints.length) return;
    trilha = [];
    waypoints = [];
    rotaAtiva = false;
    estado.set(CHAVES.TRILHA, trilha);
    estado.set(CHAVES.WAYPOINTS, waypoints);
    estado.set(CHAVES.ROTA_ATIVA, false);
    sheetStatus.textContent = 'Trilha e pontos removidos deste aparelho.';
    atualizarSheet();
    atualizarMarcadores();
  }

  function adicionarPonto(e) {
    if (marcandoDestino) {
      destino = { id: `d-${Date.now()}`, nome: 'Destino', lat: e.lngLat.lat, lon: e.lngLat.lng, createdAt: Date.now() };
      estado.set(CHAVES.DESTINO, destino);
      marcandoDestino = false;
      markerHint.classList.remove('is-visible');
      sheetStatus.textContent = `Destino salvo localmente · ${num(destino.lat, 5)}, ${num(destino.lon, 5)}`;
      atualizarSheet();
      atualizarMarcadores();
      return;
    }
    if (!marcando) return;
    const ponto = { id: `p-${Date.now()}`, nome: `Ponto ${String(waypoints.length + 1).padStart(2, '0')}`, lat: e.lngLat.lat, lon: e.lngLat.lng, createdAt: Date.now() };
    waypoints = [...waypoints, ponto];
    estado.set(CHAVES.WAYPOINTS, waypoints);
    marcando = false;
    markerHint.classList.remove('is-visible');
    sheetStatus.textContent = `${ponto.nome} salvo localmente · ${num(ponto.lat, 5)}, ${num(ponto.lon, 5)}`;
    atualizarSheet();
    atualizarMarcadores();
  }

  routeButton.onclick = alternarRota;
  centerButton.onclick = centralizar;
  clearButton.onclick = limparTrilha;
  destinoButton.onclick = definirDestino;
  destinoMapButton.onclick = () => {
    marcandoDestino = !marcandoDestino;
    marcando = false;
    markerHint.textContent = marcandoDestino ? 'Toque no mapa para definir o destino' : 'Toque no mapa para marcar um ponto';
    markerHint.classList.toggle('is-visible', marcandoDestino);
    atualizarSheet();
  };
  destinoInput.onkeydown = (event) => { if (event.key === 'Enter') definirDestino(); };
  selectUso.onchange = () => {
    estado.set(CHAVES.MODO_USO, selectUso.value);
    pararGps?.setMode(selectUso.value === 'cidade' ? 'cidade' : 'trilha');
    sheetStatus.textContent = selectUso.value === 'cidade'
      ? 'Modo cidade: defina um destino para ver rumo e distância.'
      : 'Modo trilha: registre sua rota e pontos de referência localmente.';
  };
  modoBotao.onclick = () => {
    marcando = !marcando;
    marcandoDestino = false;
    markerHint.textContent = 'Toque no mapa para marcar um ponto';
    markerHint.classList.toggle('is-visible', marcando);
    atualizarSheet();
  };

  const pararGps = iniciarAcompanhamento({
    mode: estado.get(CHAVES.MODO_USO, 'trilha') === 'cidade' ? 'cidade' : 'trilha',
    onPosition: (nova) => {
      const anterior = posicao;
      posicao = nova;
      if (rotaAtiva && (!anterior || haversine(anterior, nova) >= 5)) {
        trilha = [...trilha, nova].slice(-4000);
        estado.set(CHAVES.TRILHA, trilha);
      }
      atualizarHud();
      atualizarSheet();
      atualizarMarcadores();
      if (mapa && primeiraPosicao) { primeiraPosicao = false; mapa.flyTo({ center: [nova.lon, nova.lat], zoom: 15, duration: 700 }); }
    },
    onError: (erro) => {
      estadoGps.textContent = erro?.code === 1 ? 'PERMISSÃO NEGADA' : 'GPS INDISPONÍVEL';
      sheetStatus.textContent = erro?.code === 1 ? 'Ative a permissão de localização para usar o mapa ao vivo.' : 'Não foi possível obter um fixo agora.';
    }
  });

  (async () => {
    const maplibregl = await carregarMapLibre();
    if (desmontado) return;
    if (!maplibregl) {
      canvas.append(h('div', { className: 'mapa__falha' }, 'O motor de mapa não carregou. A bússola e o registro local continuam disponíveis.'));
      return;
    }
    const base = BASES[selectBase.value];
    mapa = new maplibregl.Map({
      container: canvas,
      style: { version: 8, sources: { base: { type: 'raster', tiles: base.tiles, tileSize: base.tileSize ?? 256, maxzoom: base.maxzoom, attribution: base.creditos } }, layers: [{ id: 'base', type: 'raster', source: 'base' }] },
      center: posicao ? [posicao.lon, posicao.lat] : CENTRO_FALLBACK,
      zoom: posicao ? 15 : 12,
      attributionControl: { compact: true }
    });
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapa.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    offlineButton.onclick = async () => {
      if (!navigator.serviceWorker) {
        offlineStatus.textContent = 'Service worker indisponível neste navegador; a rota local continua disponível.';
        return;
      }
      const baseAtual = BASES[selectBase.value];
      const urls = tilesDoViewport(mapa.getBounds(), { ...baseAtual, zoomAtual: mapa.getZoom() });
      if (!urls.length) {
        offlineStatus.textContent = 'Não foi possível calcular tiles para esta área.';
        return;
      }
      offlineButton.disabled = true;
      offlineButton.textContent = 'PREPARANDO…';
      offlineStatus.textContent = `${urls.length} tiles serão guardados no aparelho. Não feche a tela.`;
      try {
        const registro = await navigator.serviceWorker.ready;
        const alvo = navigator.serviceWorker.controller || registro.active;
        if (!alvo) throw new Error('service worker ainda não está ativo');
        const canal = new MessageChannel();
        canal.port1.onmessage = (event) => {
          const salvos = Number(event.data?.salvos ?? 0);
          offlineStatus.textContent = `${salvos}/${urls.length} tiles preparados para ${baseAtual.nome}. Mova o mapa e prepare outra área se necessário.`;
          offlineButton.disabled = false;
          offlineButton.textContent = 'PREPARAR ÁREA OFFLINE';
        };
        alvo.postMessage({ type: 'CACHE_TILES', urls }, [canal.port2]);
      } catch {
        offlineStatus.textContent = 'Não foi possível preparar a área agora. Abra o app uma vez online e tente novamente.';
        offlineButton.disabled = false;
        offlineButton.textContent = 'TENTAR PREPARAR NOVAMENTE';
      }
    };

    mapa.on('load', () => {
      if (desmontado) return;
      mapa.addSource('vanguard-grade', { type: 'geojson', data: gradeAtual });
      mapa.addSource('vanguard-trilha', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapa.addSource('vanguard-destino', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapa.addSource('vanguard-marcadores', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapa.addLayer({ id: 'vanguard-grade', type: 'line', source: 'vanguard-grade', paint: { 'line-color': '#b6c59b', 'line-opacity': 0.28, 'line-width': ['case', ['get', 'forte'], 1.5, 0.7] } });
      mapa.addLayer({ id: 'vanguard-trilha', type: 'line', source: 'vanguard-trilha', paint: { 'line-color': '#8bff3f', 'line-width': 4, 'line-opacity': 0.85 } });
      mapa.addLayer({ id: 'vanguard-destino', type: 'line', source: 'vanguard-destino', paint: { 'line-color': '#ffb000', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.9 } });
      mapa.addLayer({ id: 'vanguard-marcadores', type: 'circle', source: 'vanguard-marcadores', paint: { 'circle-radius': ['match', ['get', 'tipo'], 'voce', 8, 'destino', 7, 6], 'circle-color': ['match', ['get', 'tipo'], 'voce', '#80e0ff', 'destino', '#ffb000', '#ffb000'], 'circle-stroke-color': '#11150e', 'circle-stroke-width': 2 } });
      redesenharGrade();
      atualizarMarcadores();
    });

    function redesenharGrade() {
      if (!mapa?.getSource('vanguard-grade')) return;
      try { gradeAtual = gerarGrade(mapa.getBounds(), mapa.getZoom()); } catch { gradeAtual = { type: 'FeatureCollection', features: [] }; }
      mapa.getSource('vanguard-grade').setData(gradeAtual);
    }

    function desenharRotulos() {
      if (!mapa) return;
      const largura = canvas.clientWidth;
      const altura = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      rotulos.width = largura * dpr;
      rotulos.height = altura * dpr;
      const ctx = rotulos.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largura, altura);
      ctx.font = '700 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const feature of gradeAtual.features) {
        const coords = feature.geometry.coordinates;
        const label = rotuloDaLinha(feature.properties.valor, gradeAtual.passo ?? 1000);
        const ponto = feature.properties.eixo === 'E' ? mapa.project(coords.at(-1)) : mapa.project(coords[0]);
        const x = feature.properties.eixo === 'E' ? ponto.x : 16;
        const y = feature.properties.eixo === 'E' ? 18 : ponto.y;
        if (x > 10 && x < largura - 10 && y > 10 && y < altura - 10) {
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10, 14, 8, .8)'; ctx.strokeText(label, x, y);
          ctx.fillStyle = '#ffb000'; ctx.fillText(label, x, y);
        }
      }
    }

    mapa.on('moveend', redesenharGrade);
    mapa.on('zoomend', redesenharGrade);
    mapa.on('render', desenharRotulos);
    mapa.on('click', adicionarPonto);
    selectBase.onchange = () => {
      const novaBase = BASES[selectBase.value];
      if (!novaBase || !mapa.getSource('base')) return;
      mapa.removeLayer('base');
      mapa.removeSource('base');
      mapa.addSource('base', { type: 'raster', tiles: novaBase.tiles, tileSize: novaBase.tileSize ?? 256, maxzoom: novaBase.maxzoom, attribution: novaBase.creditos });
      mapa.addLayer({ id: 'base', type: 'raster', source: 'base' }, 'vanguard-grade');
    };
  })();

  atualizarHud();
  atualizarDestino();
  atualizarSheet();
  return { elemento: raiz, desmontar: () => { desmontado = true; pararGps(); if (mapa) mapa.remove(); } };
}
