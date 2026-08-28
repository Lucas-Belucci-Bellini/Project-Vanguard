/**
 * Mapa tático topográfico com grade MGRS sobreposta.
 */

import '../styles/mapa.css';
import { h, empty, dist, mil, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { latLonParaUTM, utmParaLatLon, latLonParaMGRS, fusoDe, gridVector } from '../engine/mgrs.js';
import { radToMil } from '../engine/angles.js';
import { CAMADAS_BASE } from '../data/camadas-mapa.js';
import { criarMotorMapa } from '../core/map-engine.js';

const BASES = Object.fromEntries(CAMADAS_BASE.map((c) => [c.id, {
  nome: c.nome.toUpperCase(), tiles: c.tiles, max: c.maxzoom, creditos: c.creditos,
}]));

function intervaloGrade(zoom) {
  if (zoom >= 15) return 100;
  if (zoom >= 12.5) return 1000;
  if (zoom >= 9.5) return 10000;
  return 100000;
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

function gerarGrade(bounds, zoom) {
  const passo = intervaloGrade(zoom);
  const feats = [];
  const so = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const zona = fusoDe((so.lat + ne.lat) / 2, (so.lng + ne.lng) / 2);
  const cantos = [
    latLonParaUTM(so.lat, so.lng, zona), latLonParaUTM(ne.lat, ne.lng, zona),
    latLonParaUTM(so.lat, ne.lng, zona), latLonParaUTM(ne.lat, so.lng, zona)
  ];
  const eMin = Math.min(...cantos.map((c) => c.easting));
  const eMax = Math.max(...cantos.map((c) => c.easting));
  const nMin = Math.min(...cantos.map((c) => c.northing));
  const nMax = Math.max(...cantos.map((c) => c.northing));
  const maxLinhas = 80;
  if ((eMax - eMin) / passo > maxLinhas || (nMax - nMin) / passo > maxLinhas) {
    return { type: 'FeatureCollection', features: [] };
  }
  const hemisferio = so.lat < 0 ? 'S' : 'N';
  const amostras = 12;
  for (let e = Math.ceil(eMin / passo) * passo; e <= eMax; e += passo) {
    const coords = [];
    for (let i = 0; i <= amostras; i++) {
      const n = nMin + ((nMax - nMin) * i) / amostras;
      const p = utmParaLatLon({ zona, easting: e, northing: n, hemisferio });
      coords.push([p.lon, p.lat]);
    }
    feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { eixo: 'E', valor: e, forte: e % (passo * 10) === 0 } });
  }
  for (let n = Math.ceil(nMin / passo) * passo; n <= nMax; n += passo) {
    const coords = [];
    for (let i = 0; i <= amostras; i++) {
      const e = eMin + ((eMax - eMin) * i) / amostras;
      const p = utmParaLatLon({ zona, easting: e, northing: n, hemisferio });
      coords.push([p.lon, p.lat]);
    }
    feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { eixo: 'N', valor: n, forte: n % (passo * 10) === 0 } });
  }
  return { type: 'FeatureCollection', features: feats, passo, zona };
}

function rotuloDaLinha(valor, passo) {
  return String(Math.floor((valor % 100000) / passo) % 100).padStart(2, '0');
}

async function buscarAltitude(lat, lon) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j.elevation) ? j.elevation[0] : null;
  } catch {
    return null;
  }
}

export function mapaPage() {
  const raiz = h('div', { className: 'vg-pagina mapa' });
  const alvoMapa = h('div', { className: 'mapa__canvas' });
  const rotulos = h('canvas', { className: 'mapa__rotulos' });
  const hud = h('div', { className: 'mapa__hud' });
  const painel = h('aside', { className: 'mapa__painel' });
  alvoMapa.append(rotulos);
  raiz.append(alvoMapa, hud, painel);

  let mapa = null;
  let motorMapa = null;
  let watchId = null;
  let desmontado = false;
  let redesenhar = null;
  let peca = estado.get(CHAVES.PECA, null);
  let alvo = estado.get(CHAVES.ALVO, null);
  let modoClique = null;
  let posGps = null;

  const hudMgrs = h('span', { className: 'mapa__hud-valor' }, '—');
  const hudLatLon = h('span', { className: 'mapa__hud-sub' }, '—');
  const hudZona = h('span', { className: 'mapa__hud-sub' }, '—');
  hud.append(h('div', { className: 'mapa__hud-bloco' }, h('span', { className: 'mapa__hud-rot' }, 'CURSOR · MGRS'), hudMgrs, hudLatLon, hudZona));

  const selBase = h('select', { className: 'vg-modo' }, ...Object.entries(BASES).map(([k, v]) => h('option', { value: k }, v.nome)));
  selBase.value = BASES.terreno ? 'terreno' : Object.keys(BASES)[0];

  const btnPeca = h('button', { onclick: () => setModo('peca') }, '◈ MARCAR PEÇA');
  const btnAlvo = h('button', { onclick: () => setModo('alvo') }, '✱ MARCAR ALVO');
  const btnGps = h('button', { onclick: () => alternarGps() }, '⌖ RASTREAR GPS');
  const btnLimpar = h('button', { onclick: () => { peca = null; alvo = null; estado.remover(CHAVES.PECA); estado.remover(CHAVES.ALVO); atualizarMarcadores(); atualizarLeituras(); }}, '✕ LIMPAR');
  const infoPeca = h('div', { className: 'mapa__info' }, '—');
  const infoAlvo = h('div', { className: 'mapa__info' }, '—');
  const infoSolucao = h('div', { className: 'mapa__solucao' });
  const statusGps = h('div', { className: 'vg-dica' }, 'GPS parado.');
  const btnTiro = h('button', { className: 'primario', onclick: () => { location.hash = '#/tiro'; }}, '▶ LEVAR PARA O COMPUTADOR DE TIRO');

  painel.append(
    h('div', { className: 'vg-painel' }, h('div', { className: 'vg-painel__titulo' }, '◤ CAMADA'), h('div', { className: 'vg-painel__corpo' }, selBase)),
    h('div', { className: 'vg-painel' }, h('div', { className: 'vg-painel__titulo' }, '◤ MARCAÇÕES'), h('div', { className: 'vg-painel__corpo mapa__botoes' }, btnPeca, btnAlvo, btnGps, btnLimpar, statusGps)),
    h('div', { className: 'vg-painel' }, h('div', { className: 'vg-painel__titulo' }, '◤ PEÇA'), h('div', { className: 'vg-painel__corpo' }, infoPeca)),
    h('div', { className: 'vg-painel' }, h('div', { className: 'vg-painel__titulo' }, '◤ ALVO'), h('div', { className: 'vg-painel__corpo' }, infoAlvo)),
    h('div', { className: 'vg-painel' }, h('div', { className: 'vg-painel__titulo' }, '◤ VETOR DE TIRO'), h('div', { className: 'vg-painel__corpo' }, infoSolucao)), btnTiro);

  function setModo(m) {
    modoClique = modoClique === m ? null : m;
    btnPeca.classList.toggle('primario', modoClique === 'peca');
    btnAlvo.classList.toggle('primario', modoClique === 'alvo');
    if (mapa) mapa.getCanvas().style.cursor = modoClique ? 'crosshair' : '';
  }

  function descrever(p) {
    if (!p) return '—';
    return h('div', null, h('div', { className: 'mapa__info-mgrs' }, latLonParaMGRS(p.lat, p.lon, 5, true)), h('div', { className: 'u-mudo' }, `${num(p.lat, 6)}, ${num(p.lon, 6)} · ALT ${p.alt == null ? '—' : `${num(p.alt, 0)} m`}`));
  }

  function atualizarLeituras() {
    empty(infoPeca).append(descrever(peca)); empty(infoAlvo).append(descrever(alvo)); empty(infoSolucao);
    if (!peca || !alvo) { infoSolucao.append(h('div', { className: 'u-mudo' }, 'Marque peça e alvo.')); btnTiro.disabled = true; return; }
    btnTiro.disabled = false;
    const v = gridVector({ lat: peca.lat, lon: peca.lon, alt: peca.alt ?? 0 }, { lat: alvo.lat, lon: alvo.lon, alt: alvo.alt ?? 0 });
    const azMil = radToMil((v.azimuteGradeDeg * Math.PI) / 180, estado.get(CHAVES.MIL, 'nato'));
    infoSolucao.append(h('div', { className: 'vg-leitura' }, h('span', { className: 'vg-leitura__rotulo' }, 'AZIMUTE DE GRADE'), h('span', { className: 'vg-leitura__valor' }, mil(azMil)), h('span', { className: 'vg-leitura__unidade' }, `${num(v.azimuteGradeDeg, 2)}°`)), h('div', { className: 'vg-leitura vg-leitura--ambar' }, h('span', { className: 'vg-leitura__rotulo' }, 'DISTÂNCIA'), h('span', { className: 'vg-leitura__valor' }, dist(v.distanciaHorizontalM)), h('span', { className: 'vg-leitura__unidade' }, `Δalt ${num(v.deltaAltM, 0)} m · incl. ${dist(v.distanciaInclinadaM)}`)));
  }

  function atualizarMarcadores() {
    if (!mapa || !mapa.getSource('marcas')) return;
    const feats = [];
    if (peca) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [peca.lon, peca.lat] }, properties: { tipo: 'peca', rotulo: 'PEÇA' }});
    if (alvo) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [alvo.lon, alvo.lat] }, properties: { tipo: 'alvo', rotulo: 'ALVO' }});
    if (posGps) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [posGps.lon, posGps.lat] }, properties: { tipo: 'gps', rotulo: 'VOCÊ' }});
    mapa.getSource('marcas').setData({ type: 'FeatureCollection', features: feats });
    mapa.getSource('linha-tiro').setData({ type: 'FeatureCollection', features: peca && alvo ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[peca.lon, peca.lat], [alvo.lon, alvo.lat]] }, properties: {} }] : []});
    redesenhar?.();
  }

  async function marcar(tipo, lngLat) {
    const p = { lat: lngLat.lat, lon: lngLat.lng, alt: null };
    if (tipo === 'peca') peca = p; else alvo = p;
    atualizarMarcadores(); atualizarLeituras();
    const alt = await buscarAltitude(p.lat, p.lon);
    if (desmontado) return;
    p.alt = alt ?? 0;
    estado.set(tipo === 'peca' ? CHAVES.PECA : CHAVES.ALVO, p);
    estado.set(CHAVES.QUADRO, 'geo');
    atualizarLeituras();
  }

  function alternarGps() {
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; btnGps.classList.remove('primario'); statusGps.textContent = 'GPS parado.'; return; }
    if (!('geolocation' in navigator)) { statusGps.textContent = 'Geolocalização indisponível neste navegador.'; return; }
    btnGps.classList.add('primario'); statusGps.textContent = 'Aguardando fixo…';
    watchId = navigator.geolocation.watchPosition((pos) => {
      posGps = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
      statusGps.textContent = `Fixo · precisão ±${Math.round(posGps.acc)} m`;
      atualizarMarcadores();
      if (mapa && !mapa._jaCentrou) { mapa.jumpTo({ center: [posGps.lon, posGps.lat], zoom: 14 }); mapa._jaCentrou = true; }
    }, (err) => { statusGps.textContent = `GPS: ${err.message}`; }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  }

  (async () => {
    try {
      motorMapa = await criarMotorMapa({ providerId: selBase.value, carregarMapLibre });
      if (desmontado) { motorMapa.desmontar(); motorMapa = null; return; }
      mapa = motorMapa.montar({ container: alvoMapa, center: [-43.21, -22.95], zoom: 13, attributionControl: { compact: true } });
    } catch (erro) {
      if (desmontado) return;
      raiz.append(h('div', { className: 'vg-aviso vg-aviso--perigo mapa__falha' }, `Não foi possível carregar o motor de mapa: ${erro.message}`));
      return;
    }

    mapa.on('load', () => {
      if (desmontado) return;
      mapa.addSource('grade', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }});
      mapa.addSource('marcas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }});
      mapa.addSource('linha-tiro', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }});
      const css = getComputedStyle(document.documentElement);
      const corGrade = css.getPropertyValue('--grid-line').trim() || 'rgba(220,214,192,0.22)';
      const corGradeForte = css.getPropertyValue('--grid-line-forte').trim() || 'rgba(220,214,192,0.4)';
      mapa.addLayer({ id: 'grade', type: 'line', source: 'grade', paint: { 'line-color': ['case', ['get', 'forte'], corGradeForte, corGrade], 'line-width': ['case', ['get', 'forte'], 1.6, 0.8] }});
      mapa.addLayer({ id: 'linha-tiro', type: 'line', source: 'linha-tiro', paint: { 'line-color': '#ff4136', 'line-width': 2, 'line-dasharray': [3, 2] }});
      mapa.addLayer({ id: 'marcas', type: 'circle', source: 'marcas', paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'tipo'], 'peca', '#8bff3f', 'alvo', '#ff4136', 'gps', '#80e0ff', '#ffffff'], 'circle-stroke-width': 2, 'circle-stroke-color': '#0c0f0a' }});
      redesenharGrade(); atualizarMarcadores(); atualizarLeituras();
    });

    let gradeAtual = { type: 'FeatureCollection', features: [], passo: 1000 };
    function redesenharGrade() {
      if (!mapa || !mapa.getSource('grade')) return;
      try { gradeAtual = gerarGrade(mapa.getBounds(), mapa.getZoom()); } catch { gradeAtual = { type: 'FeatureCollection', features: [], passo: 1000 }; }
      mapa.getSource('grade').setData(gradeAtual);
    }
    function desenharRotulos() {
      if (!mapa) return;
      const dpr = window.devicePixelRatio || 1, largura = alvoMapa.clientWidth, altura = alvoMapa.clientHeight;
      if (!largura || !altura) return;
      if (rotulos.width !== largura * dpr || rotulos.height !== altura * dpr) { rotulos.width = largura * dpr; rotulos.height = altura * dpr; }
      const ctx = rotulos.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, largura, altura);
      const css = getComputedStyle(document.documentElement);
      const corGrid = css.getPropertyValue('--grid-label').trim() || '#ffb000';
      const corTexto = css.getPropertyValue('--color-text-primary').trim() || '#dcd6c0';
      const corFundo = css.getPropertyValue('--color-bg').trim() || '#0c0f0a';
      const fonte = css.getPropertyValue('--font-mono').trim() || 'monospace';
      const escrever = (txt, x, y, cor, tamanho = 11, peso = 700) => { ctx.font = `${peso} ${tamanho}px ${fonte}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = corFundo; ctx.strokeText(txt, x, y); ctx.fillStyle = cor; ctx.fillText(txt, x, y); };
      const passo = gradeAtual.passo ?? 1000;
      for (const f of gradeAtual.features) {
        const coords = f.geometry.coordinates, txt = rotuloDaLinha(f.properties.valor, passo);
        if (f.properties.eixo === 'E') {
          const topo = mapa.project(coords[coords.length - 1]), base = mapa.project(coords[0]);
          if (topo.x > 14 && topo.x < largura - 14) escrever(txt, topo.x, 14, corGrid);
          if (base.x > 14 && base.x < largura - 14) escrever(txt, base.x, altura - 12, corGrid);
        } else {
          const esq = mapa.project(coords[0]), dir = mapa.project(coords[coords.length - 1]);
          if (esq.y > 14 && esq.y < altura - 14) escrever(txt, 16, esq.y, corGrid);
          if (dir.y > 14 && dir.y < altura - 14) escrever(txt, largura - 16, dir.y, corGrid);
        }
      }
      const marcas = [peca && { p: peca, t: 'PEÇA' }, alvo && { p: alvo, t: 'ALVO' }, posGps && { p: posGps, t: 'VOCÊ' }].filter(Boolean);
      for (const m of marcas) {
        const pt = mapa.project([m.p.lon, m.p.lat]);
        if (pt.x < -50 || pt.x > largura + 50 || pt.y < -50 || pt.y > altura + 50) continue;
        escrever(m.t, pt.x, pt.y + 18, corTexto, 10);
      }
    }
    mapa.on('moveend', redesenharGrade); mapa.on('zoomend', redesenharGrade); mapa.on('render', desenharRotulos);
    redesenhar = desenharRotulos;
    mapa.on('mousemove', (e) => {
      try {
        hudMgrs.textContent = latLonParaMGRS(e.lngLat.lat, e.lngLat.lng, 5, true);
        hudLatLon.textContent = `${num(e.lngLat.lat, 6)}, ${num(e.lngLat.lng, 6)}`;
        const u = latLonParaUTM(e.lngLat.lat, e.lngLat.lng);
        hudZona.textContent = `FUSO ${u.zona}${u.banda} · E ${Math.round(u.easting)} N ${Math.round(u.northing)}`;
      } catch { hudMgrs.textContent = 'FORA DA COBERTURA UTM'; hudLatLon.textContent = ''; hudZona.textContent = ''; }
    });
    mapa.on('click', (e) => { if (!modoClique) return; marcar(modoClique, e.lngLat); setModo(null); });
    selBase.onchange = () => {
      const b = BASES[selBase.value];
      const source = mapa.getSource('base');
      if (source) {
        source.tiles = b.tiles;
        mapa.style.sourceCaches.base.clearTiles();
        mapa.style.sourceCaches.base.update(mapa.transform);
        mapa.triggerRepaint();
      }
    };
  })();

  function desmontar() {
    desmontado = true;
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (motorMapa) { try { motorMapa.desmontar(); } catch {} motorMapa = null; mapa = null; }
    else if (mapa) { try { mapa.remove(); } catch {} mapa = null; }
  }

  return { elemento: raiz, desmontar };
}
