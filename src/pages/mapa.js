import '../styles/mapa.css';
import { h, empty, dist, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { iniciarAcompanhamento, solicitarPosicao, precisaoLabel, velocidadeLabel } from '../core/localizacao.js';
import { haversine, vincentyInverse, bearingTo } from '../engine/geo.js';
import { latLonParaMGRS, latLonParaUTM, utmParaLatLon, fusoDe } from '../engine/mgrs.js';
import { CAMADAS_BASE } from '../data/camadas-mapa.js';
import { planejarTilesDoViewport } from '../core/mapa-offline.js';
import { exportarRegistroLocal, exportarRegistroGpx, importarRegistroGpx, importarRegistroLocal } from '../core/registro-offline.js';

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
  const wakeButton = h('button', { className: 'mapa__wake-button', type: 'button', 'aria-pressed': 'false' }, 'MANTER TELA ATIVA: DESLIGADO');
  const centerButton = h('button', { className: 'mapa__quick-button', type: 'button' }, '⌾ CENTRAR');
  const clearButton = h('button', { className: 'mapa__quick-button mapa__quick-button--quiet', type: 'button' }, 'LIMPAR TRILHA');
  const offlineButton = h('button', { className: 'mapa__offline-button', type: 'button' }, 'PREPARAR ÁREA OFFLINE');
  const offlineStatus = h('p', { className: 'mapa__offline-status', role: 'status' }, 'Baixe a área visível antes de sair sem internet.');
  const offlineClearButton = h('button', { className: 'mapa__offline-clear', type: 'button' }, 'LIMPAR ÁREA PREPARADA');
  const registroExportarButton = h('button', { className: 'mapa__quick-button', type: 'button' }, 'EXPORTAR JSON');
  const registroGpxButton = h('button', { className: 'mapa__quick-button', type: 'button' }, 'EXPORTAR GPX');
  const registroImportarButton = h('button', { className: 'mapa__quick-button', type: 'button' }, 'IMPORTAR JSON/GPX');
  const registroArquivo = h('input', { className: 'mapa__registro-file', type: 'file', accept: 'application/json,.json,application/gpx+xml,.gpx', 'aria-label': 'Importar registro local JSON ou GPX' });
  const registroStatus = h('p', { className: 'mapa__registro-status', role: 'status' }, 'Backup local de rota, pontos e destino; sem sincronização.');
  const selectBase = h('select', { className: 'mapa__select', 'aria-label': 'Base cartográfica' },
    ...CAMADAS_BASE.map((base) => h('option', { value: base.id }, base.nome.toUpperCase()))
  );
  selectBase.value = 'terreno' in BASES ? 'terreno' : Object.keys(BASES)[0];
  const selectUso = h('select', { className: 'mapa__select', 'aria-label': 'Modo de uso' },
    h('option', { value: 'trilha' }, 'TRILHA / EXPEDIÇÃO'),
    h('option', { value: 'cidade' }, 'CIDADE / DIA A DIA')
  );
  selectUso.value = estado.get(CHAVES.MODO_USO, 'trilha');
  const destinoInput = h('input', { className: 'mapa__destino-input', type: 'text', inputMode: 'decimal', placeholder: 'LAT, LON  ·  ex.: -23.55, -46.63', 'aria-label': 'Coordenadas do destino' });
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
    h('div', { className: 'mapa__offline-card' }, offlineButton, offlineStatus, offlineClearButton),
    h('div', { className: 'mapa__registro-card' },
      h('div', { className: 'mapa__route-card-head' }, h('span', { className: 'mapa__kicker' }, 'DADOS LOCAIS'), h('span', { className: 'mapa__privacy' }, '⌖ JSON')),
      h('div', { className: 'mapa__registro-actions' }, registroExportarButton, registroImportarButton),
      registroArquivo,
      registroStatus
    ),
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
      wakeButton,
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
  let wakeLock = null;
  let wakeAtivo = false;

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
    wakeButton.disabled = !rotaAtiva || !('wakeLock' in navigator);
    wakeButton.textContent = !('wakeLock' in navigator)
      ? 'TELA ATIVA INDISPONÍVEL NESTE APARELHO'
      : `MANTER TELA ATIVA: ${wakeAtivo ? 'LIGADO' : 'DESLIGADO'}`;
    wakeButton.setAttribute('aria-pressed', String(wakeAtivo));
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

  async function configurarWakeLock(ativo) {
    if (!ativo || !('wakeLock' in navigator)) {
      if (wakeLock) await wakeLock.release().catch(() => {});
      wakeLock = null;
      wakeAtivo = false;
      atualizarSheet();
      return;
    }
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeAtivo = true;
      wakeLock.addEventListener?.('release', () => {
        wakeLock = null;
        wakeAtivo = false;
        atualizarSheet();
      });
    } catch {
      wakeLock = null;
      wakeAtivo = false;
    }
    atualizarSheet();
  }

  function alternarRota() {
    if (!posicao) {
      sheetStatus.textContent = 'Aguardando GPS. Toque em centralizar e permita a localização primeiro.';
      centralizar();
      return;
    }
    rotaAtiva = !rotaAtiva;
    estado.set(CHAVES.ROTA_ATIVA, rotaAtiva);
    pararGps?.setMode(rotaAtiva ? 'trilha' : 'cidade');
    if (!rotaAtiva) configurarWakeLock(false);
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
    configurarWakeLock(false);
    pararGps?.setMode('cidade');
    sheetStatus.textContent = 'Trilha e pontos removidos deste aparelho.';
    atualizarSheet();
    atualizarMarcadores();
  }

  function exportarRegistro() {
    try {
      const conteudo = exportarRegistroLocal({ trilha, waypoints, destino });
      const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `vanguard-registro-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      registroStatus.textContent = `${trilha.length} pontos de trilha, ${waypoints.length} waypoints e ${destino ? '1 destino' : 'nenhum destino'} exportados para este aparelho.`;
    } catch (erro) {
      registroStatus.textContent = erro?.message ?? 'Não foi possível exportar o registro local.';
    }
  }

  async   function exportarRegistroGpxLocal() {
    try {
      const conteudo = exportarRegistroGpx({ trilha, waypoints, destino });
      const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/gpx+xml;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `vanguard-trilha-${new Date().toISOString().slice(0, 10)}.gpx`;
      link.click();
      URL.revokeObjectURL(url);
      registroStatus.textContent = `${trilha.length} pontos de trilha e ${waypoints.length + (destino ? 1 : 0)} waypoints exportados em GPX para este aparelho.`;
    } catch (erro) {
      registroStatus.textContent = erro?.message ?? 'Não foi possível exportar o GPX local.';
    }
  }

  async function importarRegistro(arquivo) {
    if (!arquivo) return;
    try {
      const texto = await arquivo.text();
      const registro = /\.gpx$/i.test(arquivo.name ?? '') ? importarRegistroGpx(texto) : importarRegistroLocal(texto);
      if (!window.confirm('Substituir a rota, os waypoints e o destino atuais pelo registro importado?')) return;
      trilha = registro.trilha;
      waypoints = registro.waypoints;
      destino = registro.destino;
      rotaAtiva = false;
      estado.set(CHAVES.TRILHA, trilha);
      estado.set(CHAVES.WAYPOINTS, waypoints);
      estado.set(CHAVES.DESTINO, destino);
      estado.set(CHAVES.ROTA_ATIVA, false);
      pararGps?.setMode('cidade');
      await configurarWakeLock(false);
      registroStatus.textContent = `${trilha.length} pontos de trilha e ${waypoints.length} waypoints importados localmente. A rota foi deixada pausada por segurança.`;
      atualizarSheet();
      atualizarMarcadores();
    } catch (erro) {
      registroStatus.textContent = erro?.message ?? 'Não foi possível importar este registro.';
    } finally {
      registroArquivo.value = '';
    }
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
  wakeButton.onclick = () => configurarWakeLock(!wakeAtivo);
  centerButton.onclick = centralizar;
  clearButton.onclick = limparTrilha;
  registroExportarButton.onclick = exportarRegistro;
  registroGpxButton.onclick = exportarRegistroGpxLocal;
  registroImportarButton.onclick = () => registroArquivo.click();
  registroArquivo.onchange = () => importarRegistro(registroArquivo.files?.[0]);
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
    pararGps?.setMode(rotaAtiva ? 'trilha' : 'cidade');
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
    mode: 'cidade',
    onPosition: (nova) => {
      const anterior = posicao;
      posicao = nova;
      if (rotaAtiva && (!anterior || haversine(anterior, nova) >= 5)) {
        trilha = [...trilha, nova].slice(-4000);
        estado.set(CHAVES.TRILHA, trilha);
      }
      if (!document.hidden) {
        atualizarHud();
        atualizarSheet();
        atualizarMarcadores();
        if (mapa && primeiraPosicao) { primeiraPosicao = false; mapa.flyTo({ center: [nova.lon, nova.lat], zoom: 15, duration: 700 }); }
      }
    },
    onError: (erro) => {
      estadoGps.textContent = erro?.code === 1 ? 'PERMISSÃO NEGADA' : 'GPS INDISPONÍVEL';
      sheetStatus.textContent = erro?.code === 1 ? 'Ative a permissão de localização para usar o mapa ao vivo.' : 'Não foi possível obter um fixo agora.';
    }
  });

  if (rotaAtiva) pararGps.setMode('trilha');

  const aoMudarVisibilidade = () => {
    if (document.hidden) {
      mapa?.stop();
      return;
    }
    mapa?.resize();
    atualizarHud();
    atualizarSheet();
    atualizarMarcadores();
    if (rotaAtiva && wakeAtivo) configurarWakeLock(true);
  };
  document.addEventListener('visibilitychange', aoMudarVisibilidade);

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

    async function mensagemOffline(type, dados = {}) {
      if (!navigator.serviceWorker) return null;
      const registro = await navigator.serviceWorker.ready;
      const alvo = navigator.serviceWorker.controller || registro.active;
      if (!alvo) return null;
      const canal = new MessageChannel();
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('service worker sem resposta')), 15000);
        canal.port1.onmessage = (event) => { window.clearTimeout(timer); resolve(event.data); };
        alvo.postMessage({ type, ...dados }, [canal.port2]);
      });
    }

    async function atualizarCacheOffline() {
      try {
        const status = await mensagemOffline('CACHE_STATUS');
        const meta = estado.get(CHAVES.MAPAS_OFFLINE, null);
        if (Number(status?.tiles) > 0) {
          const ultima = meta?.preparadoEm ? ` Última preparação: ${new Date(meta.preparadoEm).toLocaleString()}.` : '';
          offlineStatus.textContent = `${status.tiles} tiles preparados neste aparelho.${ultima} Prepare novamente ao mudar de área ou base.`;
        } else if (meta?.preparadoEm) {
          offlineStatus.textContent = `O último registro de preparo é de ${new Date(meta.preparadoEm).toLocaleString()}, mas o cache está vazio; ele pode ter sido limpo pelo sistema. Prepare novamente.`;
        }
      } catch { /* o preparo continuará disponível quando o worker responder */ }
    }

    offlineButton.onclick = async () => {
      if (!navigator.serviceWorker) {
        offlineStatus.textContent = 'Service worker indisponível neste navegador; a rota local continua disponível.';
        return;
      }
      const baseAtual = BASES[selectBase.value];
      const plano = planejarTilesDoViewport(mapa.getBounds(), { ...baseAtual, zoomAtual: mapa.getZoom() });
      const urls = plano.urls;
      if (!urls.length) {
        offlineStatus.textContent = 'Não foi possível calcular tiles para esta área.';
        return;
      }
      offlineButton.disabled = true;
      offlineClearButton.disabled = true;
      offlineButton.textContent = 'PREPARANDO…';
      offlineStatus.textContent = plano.limitado
        ? `${urls.length} de ${plano.totalEstimado} tiles serão preparados (limite desta versão). Não feche a tela.`
        : `${urls.length} tiles serão guardados no aparelho. Não feche a tela.`;
      try {
        const resposta = await mensagemOffline('CACHE_TILES', { urls });
        const salvos = Number(resposta?.salvos ?? 0);
        estado.set(CHAVES.MAPAS_OFFLINE, {
          schema: 'vanguard-mapas-offline',
          version: 1,
          base: baseAtual.id,
          baseNome: baseAtual.nome,
          bounds: {
            west: mapa.getBounds().getWest(),
            east: mapa.getBounds().getEast(),
            south: mapa.getBounds().getSouth(),
            north: mapa.getBounds().getNorth(),
          },
          zoom: { atual: mapa.getZoom(), minimo: Math.max(5, Math.floor(mapa.getZoom()) - 1), maximo: Math.min(Number(baseAtual.maxzoom ?? 16), Math.floor(mapa.getZoom()) + 1, 16) },
          preparadoEm: new Date().toISOString(),
          urlsSolicitadas: urls.length,
          tilesSalvos: salvos,
        });
        offlineStatus.textContent = plano.limitado
          ? `${salvos}/${urls.length} tiles preparados para ${baseAtual.nome}; a área foi reduzida ao limite local. Aproxime o mapa e prepare novamente.`
          : `${salvos}/${urls.length} tiles preparados para ${baseAtual.nome}. Mova o mapa e prepare outra área se necessário.`;
      } catch {
        offlineStatus.textContent = 'Não foi possível preparar a área agora. Abra o app uma vez online e tente novamente.';
      } finally {
        offlineButton.disabled = false;
        offlineClearButton.disabled = false;
        offlineButton.textContent = 'PREPARAR ÁREA OFFLINE';
      }
    };

    offlineClearButton.onclick = async () => {
      if (!window.confirm('Limpar todos os mapas offline guardados neste aparelho?')) return;
      offlineClearButton.disabled = true;
      try {
        await mensagemOffline('CLEAR_TILES');
        estado.remover(CHAVES.MAPAS_OFFLINE);
        offlineStatus.textContent = 'Cache de mapas removido. Prepare novamente antes de sair sem internet.';
      } catch {
        offlineStatus.textContent = 'Não foi possível limpar o cache de mapas agora.';
      } finally {
        offlineClearButton.disabled = false;
      }
    };

    atualizarCacheOffline();

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
  return { elemento: raiz, desmontar: () => { desmontado = true; document.removeEventListener('visibilitychange', aoMudarVisibilidade); configurarWakeLock(false); pararGps(); if (mapa) mapa.remove(); } };
}
