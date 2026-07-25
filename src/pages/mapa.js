/**
 * `#/mapa` — Mapa tático topográfico com grade MGRS sobreposta.
 *
 * ── Por que MapLibre e não Mapbox/Google ──
 * A grade de coordenadas é o coração deste app, e ela precisa ser desenhada
 * POR CIMA do mapa, alinhada à projeção UTM, reagindo a zoom e rotação. Isso
 * exige acesso à câmera e a camadas customizadas. O Google Maps não dá isso;
 * o Mapbox dá, mas cobra e exige chave. O MapLibre é o fork livre do Mapbox
 * GL, sem chave e sem teto de uso — e o Projeto Baluarte já usa ele no
 * `/mapa`, então é a escolha coerente com o ecossistema.
 *
 * O MapLibre é dependência npm **empacotada localmente**, não CDN. Numa
 * ferramenta de campo, depender de CDN significa que a navegação morre junto
 * com o sinal — e a hora em que se precisa do mapa é exatamente a hora em que
 * a rede falha. Empacotado, o app abre offline; só os *tiles* precisam de
 * rede (e esses dá para pré-carregar por área). O Vite ainda code-splita o
 * MapLibre para dentro do chunk desta tela, então quem só abre o computador
 * de tiro continua sem baixar o motor de mapa.
 *
 * ── A grade ──
 * Não é um quadriculado decorativo em cima da tela. Cada linha é uma linha
 * real de easting/northing UTM convertida de volta para lat/lon ponto a
 * ponto — por isso ela *curva* conforme você se afasta do meridiano central,
 * exatamente como numa carta militar de verdade.
 */

import '../styles/mapa.css';
import { h, $, empty, dist, mil, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import {
  latLonParaUTM, utmParaLatLon, latLonParaMGRS, fusoDe, gridVector
} from '../engine/mgrs.js';
import { radToMil } from '../engine/angles.js';

/* Bases sem chave de API. A estética pedida (topográfico cru / satélite sem
 * enfeite) é justamente o que estas três entregam. */
const BASES = {
  topo: {
    nome: 'TOPOGRÁFICO',
    tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png'],
    max: 17,
    creditos: '© OpenTopoMap / OpenStreetMap contributors (CC-BY-SA)'
  },
  satelite: {
    nome: 'SATÉLITE',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    max: 19,
    creditos: '© Esri World Imagery'
  },
  tatico: {
    nome: 'TÁTICO',
    tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
    max: 19,
    creditos: '© CARTO / OpenStreetMap contributors'
  }
};

/** Intervalo da grade (m) conforme o zoom — mesma lógica de uma carta. */
function intervaloGrade(zoom) {
  if (zoom >= 15) return 100;
  if (zoom >= 12.5) return 1000;
  if (zoom >= 9.5) return 10000;
  return 100000;
}

/** Importa o MapLibre sob demanda (chunk próprio). `null` se falhar. */
async function carregarMapLibre() {
  try {
    await import('maplibre-gl/dist/maplibre-gl.css');
    const mod = await import('maplibre-gl');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

/**
 * Constrói as linhas de grade UTM visíveis como GeoJSON.
 * Amostra cada linha em vários pontos e converte de volta para lat/lon, o
 * que faz a linha acompanhar a curvatura real da projeção.
 */
function gerarGrade(bounds, zoom) {
  const passo = intervaloGrade(zoom);
  const feats = [];

  const so = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  /* Fuso do centro da tela: numa borda de fuso a grade fica levemente
   * inconsistente, o que é fiel à realidade (a carta também troca de fuso). */
  const zona = fusoDe((so.lat + ne.lat) / 2, (so.lng + ne.lng) / 2);

  const cantos = [
    latLonParaUTM(so.lat, so.lng, zona), latLonParaUTM(ne.lat, ne.lng, zona),
    latLonParaUTM(so.lat, ne.lng, zona), latLonParaUTM(ne.lat, so.lng, zona)
  ];
  const eMin = Math.min(...cantos.map((c) => c.easting));
  const eMax = Math.max(...cantos.map((c) => c.easting));
  const nMin = Math.min(...cantos.map((c) => c.northing));
  const nMax = Math.max(...cantos.map((c) => c.northing));

  /* Trava de segurança: em zoom muito baixo o número de linhas explodiria. */
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
    feats.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { eixo: 'E', valor: e, forte: e % (passo * 10) === 0 }
    });
  }

  for (let n = Math.ceil(nMin / passo) * passo; n <= nMax; n += passo) {
    const coords = [];
    for (let i = 0; i <= amostras; i++) {
      const e = eMin + ((eMax - eMin) * i) / amostras;
      const p = utmParaLatLon({ zona, easting: e, northing: n, hemisferio });
      coords.push([p.lon, p.lat]);
    }
    feats.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { eixo: 'N', valor: n, forte: n % (passo * 10) === 0 }
    });
  }

  return { type: 'FeatureCollection', features: feats, passo, zona };
}

/**
 * Rótulo de carta de uma linha de grade: os DOIS dígitos principais.
 * É assim que se lê grid numa carta militar — "um dois, três quatro" — e não
 * o easting inteiro de seis dígitos.
 */
function rotuloDaLinha(valor, passo) {
  return String(Math.floor((valor % 100000) / passo) % 100).padStart(2, '0');
}

/** Altitude via Open-Meteo (grátis, sem chave). Devolve null se falhar. */
async function buscarAltitude(lat, lon) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j.elevation) ? j.elevation[0] : null;
  } catch {
    return null; // offline: o operador digita a altitude na mão
  }
}

export function mapaPage() {
  const raiz = h('div', { className: 'vg-pagina mapa' });
  const alvoMapa = h('div', { className: 'mapa__canvas' });
  /* Camada de texto própria.
   *
   * Por que não usar `symbol` layer do MapLibre: layer de texto exige um
   * endpoint de `glyphs` (fontes em PBF) na especificação do estilo. Isso
   * seria mais uma dependência de rede — justamente o que este app não pode
   * ter — e ainda renderizaria numa fonte que não é a nossa. Desenhando os
   * rótulos num canvas 2D por cima, eles ficam na fonte Mil-Spec, funcionam
   * offline, e a gente controla exatamente onde cada um encosta na borda,
   * como numa carta de verdade. */
  const rotulos = h('canvas', { className: 'mapa__rotulos' });
  const hud = h('div', { className: 'mapa__hud' });
  const painel = h('aside', { className: 'mapa__painel' });
  alvoMapa.append(rotulos);
  raiz.append(alvoMapa, hud, painel);

  let mapa = null;
  let watchId = null;
  let desmontado = false;
  /* Preenchido quando o mapa monta; redesenha a camada de rótulos sob demanda. */
  let redesenhar = null;

  /* Estado da tela */
  let peca = estado.get(CHAVES.PECA, null);
  let alvo = estado.get(CHAVES.ALVO, null);
  let modoClique = null;   // 'peca' | 'alvo' | null
  let posGps = null;

  /* ── HUD (canto superior esquerdo) ── */
  const hudMgrs = h('span', { className: 'mapa__hud-valor' }, '—');
  const hudLatLon = h('span', { className: 'mapa__hud-sub' }, '—');
  const hudZona = h('span', { className: 'mapa__hud-sub' }, '—');
  hud.append(
    h('div', { className: 'mapa__hud-bloco' },
      h('span', { className: 'mapa__hud-rot' }, 'CURSOR · MGRS'),
      hudMgrs, hudLatLon, hudZona)
  );

  /* ── Painel lateral ── */
  const selBase = h('select', { className: 'vg-modo' },
    ...Object.entries(BASES).map(([k, v]) => h('option', { value: k }, v.nome)));
  selBase.value = 'topo';

  const btnPeca = h('button', { onclick: () => setModo('peca') }, '◈ MARCAR PEÇA');
  const btnAlvo = h('button', { onclick: () => setModo('alvo') }, '✱ MARCAR ALVO');
  const btnGps = h('button', { onclick: () => alternarGps() }, '⌖ RASTREAR GPS');
  const btnLimpar = h('button', {
    onclick: () => {
      peca = null; alvo = null;
      estado.remover(CHAVES.PECA); estado.remover(CHAVES.ALVO);
      atualizarMarcadores(); atualizarLeituras();
    }
  }, '✕ LIMPAR');

  const infoPeca = h('div', { className: 'mapa__info' }, '—');
  const infoAlvo = h('div', { className: 'mapa__info' }, '—');
  const infoSolucao = h('div', { className: 'mapa__solucao' });
  const statusGps = h('div', { className: 'vg-dica' }, 'GPS parado.');

  const btnTiro = h('button', {
    className: 'primario',
    onclick: () => { location.hash = '#/tiro'; }
  }, '▶ LEVAR PARA O COMPUTADOR DE TIRO');

  painel.append(
    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ CAMADA'),
      h('div', { className: 'vg-painel__corpo' }, selBase)),
    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ MARCAÇÕES'),
      h('div', { className: 'vg-painel__corpo mapa__botoes' },
        btnPeca, btnAlvo, btnGps, btnLimpar, statusGps)),
    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ PEÇA'),
      h('div', { className: 'vg-painel__corpo' }, infoPeca)),
    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ ALVO'),
      h('div', { className: 'vg-painel__corpo' }, infoAlvo)),
    h('div', { className: 'vg-painel' },
      h('div', { className: 'vg-painel__titulo' }, '◤ VETOR DE TIRO'),
      h('div', { className: 'vg-painel__corpo' }, infoSolucao)),
    btnTiro
  );

  function setModo(m) {
    modoClique = modoClique === m ? null : m;
    btnPeca.classList.toggle('primario', modoClique === 'peca');
    btnAlvo.classList.toggle('primario', modoClique === 'alvo');
    if (mapa) mapa.getCanvas().style.cursor = modoClique ? 'crosshair' : '';
  }

  /* ── Leituras do painel ── */
  function descrever(p) {
    if (!p) return '—';
    return h('div', null,
      h('div', { className: 'mapa__info-mgrs' }, latLonParaMGRS(p.lat, p.lon, 5, true)),
      h('div', { className: 'u-mudo' },
        `${num(p.lat, 6)}, ${num(p.lon, 6)} · ALT ${p.alt == null ? '—' : `${num(p.alt, 0)} m`}`));
  }

  function atualizarLeituras() {
    empty(infoPeca).append(descrever(peca));
    empty(infoAlvo).append(descrever(alvo));
    empty(infoSolucao);

    if (!peca || !alvo) {
      infoSolucao.append(h('div', { className: 'u-mudo' }, 'Marque peça e alvo.'));
      btnTiro.disabled = true;
      return;
    }
    btnTiro.disabled = false;

    const v = gridVector(
      { lat: peca.lat, lon: peca.lon, alt: peca.alt ?? 0 },
      { lat: alvo.lat, lon: alvo.lon, alt: alvo.alt ?? 0 }
    );
    const azMil = radToMil((v.azimuteGradeDeg * Math.PI) / 180, estado.get(CHAVES.MIL, 'nato'));

    infoSolucao.append(
      h('div', { className: 'vg-leitura' },
        h('span', { className: 'vg-leitura__rotulo' }, 'AZIMUTE DE GRADE'),
        h('span', { className: 'vg-leitura__valor' }, mil(azMil)),
        h('span', { className: 'vg-leitura__unidade' }, `${num(v.azimuteGradeDeg, 2)}°`)),
      h('div', { className: 'vg-leitura vg-leitura--ambar' },
        h('span', { className: 'vg-leitura__rotulo' }, 'DISTÂNCIA'),
        h('span', { className: 'vg-leitura__valor' }, dist(v.distanciaHorizontalM)),
        h('span', { className: 'vg-leitura__unidade' },
          `Δalt ${num(v.deltaAltM, 0)} m · incl. ${dist(v.distanciaInclinadaM)}`))
    );
  }

  /* ── Marcadores e linha de tiro ── */
  function atualizarMarcadores() {
    if (!mapa || !mapa.getSource('marcas')) return;
    const feats = [];
    if (peca) feats.push({
      type: 'Feature', geometry: { type: 'Point', coordinates: [peca.lon, peca.lat] },
      properties: { tipo: 'peca', rotulo: 'PEÇA' }
    });
    if (alvo) feats.push({
      type: 'Feature', geometry: { type: 'Point', coordinates: [alvo.lon, alvo.lat] },
      properties: { tipo: 'alvo', rotulo: 'ALVO' }
    });
    if (posGps) feats.push({
      type: 'Feature', geometry: { type: 'Point', coordinates: [posGps.lon, posGps.lat] },
      properties: { tipo: 'gps', rotulo: 'VOCÊ' }
    });
    mapa.getSource('marcas').setData({ type: 'FeatureCollection', features: feats });

    mapa.getSource('linha-tiro').setData({
      type: 'FeatureCollection',
      features: peca && alvo ? [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[peca.lon, peca.lat], [alvo.lon, alvo.lat]] },
        properties: {}
      }] : []
    });
    redesenhar?.();
  }

  async function marcar(tipo, lngLat) {
    const p = { lat: lngLat.lat, lon: lngLat.lng, alt: null };
    if (tipo === 'peca') { peca = p; } else { alvo = p; }
    atualizarMarcadores(); atualizarLeituras();

    /* Altitude é essencial para o cálculo balístico — busca em segundo plano
     * e não bloqueia a marcação. Se falhar, fica null e o operador digita. */
    const alt = await buscarAltitude(p.lat, p.lon);
    if (desmontado) return;
    p.alt = alt ?? 0;
    estado.set(tipo === 'peca' ? CHAVES.PECA : CHAVES.ALVO, p);
    estado.set(CHAVES.QUADRO, 'geo');
    atualizarLeituras();
  }

  /* ── GPS ── */
  function alternarGps() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      btnGps.classList.remove('primario');
      statusGps.textContent = 'GPS parado.';
      return;
    }
    if (!('geolocation' in navigator)) {
      statusGps.textContent = 'Geolocalização indisponível neste navegador.';
      return;
    }
    btnGps.classList.add('primario');
    statusGps.textContent = 'Aguardando fixo…';
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        posGps = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
        statusGps.textContent = `Fixo · precisão ±${Math.round(posGps.acc)} m`;
        atualizarMarcadores();
        if (mapa && !mapa._jaCentrou) { mapa.jumpTo({ center: [posGps.lon, posGps.lat], zoom: 14 }); mapa._jaCentrou = true; }
      },
      (err) => { statusGps.textContent = `GPS: ${err.message}`; },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  }

  /* ── Montagem do mapa ── */
  (async () => {
    const maplibregl = await carregarMapLibre();
    if (desmontado) return;
    if (!maplibregl) {
      raiz.append(h('div', { className: 'vg-aviso vg-aviso--perigo mapa__falha' },
        'Não foi possível carregar o motor de mapa (MapLibre). Verifique a conexão — o computador de tiro funciona offline.'));
      return;
    }

    const base = BASES[selBase.value];
    mapa = new maplibregl.Map({
      container: alvoMapa,
      style: {
        version: 8,
        sources: { base: { type: 'raster', tiles: base.tiles, tileSize: 256, maxzoom: base.max, attribution: base.creditos } },
        layers: [{ id: 'base', type: 'raster', source: 'base' }]
      },
      center: [-43.21, -22.95],
      zoom: 13,
      attributionControl: { compact: true }
    });

    mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    mapa.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-left');

    mapa.on('load', () => {
      if (desmontado) return;

      mapa.addSource('grade', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapa.addSource('marcas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapa.addSource('linha-tiro', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      const css = getComputedStyle(document.documentElement);
      const corGrade = css.getPropertyValue('--grid-line').trim() || 'rgba(220,214,192,0.22)';
      const corGradeForte = css.getPropertyValue('--grid-line-forte').trim() || 'rgba(220,214,192,0.4)';
      const corRotulo = css.getPropertyValue('--grid-label').trim() || '#ffb000';

      mapa.addLayer({
        id: 'grade', type: 'line', source: 'grade',
        paint: {
          'line-color': ['case', ['get', 'forte'], corGradeForte, corGrade],
          'line-width': ['case', ['get', 'forte'], 1.6, 0.8]
        }
      });

      mapa.addLayer({
        id: 'linha-tiro', type: 'line', source: 'linha-tiro',
        paint: { 'line-color': '#ff4136', 'line-width': 2, 'line-dasharray': [3, 2] }
      });

      mapa.addLayer({
        id: 'marcas', type: 'circle', source: 'marcas',
        paint: {
          'circle-radius': 7,
          'circle-color': ['match', ['get', 'tipo'],
            'peca', '#8bff3f', 'alvo', '#ff4136', 'gps', '#80e0ff', '#ffffff'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0c0f0a'
        }
      });

      redesenharGrade();
      atualizarMarcadores();
      atualizarLeituras();
    });

    let gradeAtual = { type: 'FeatureCollection', features: [], passo: 1000 };

    function redesenharGrade() {
      if (!mapa || !mapa.getSource('grade')) return;
      try {
        gradeAtual = gerarGrade(mapa.getBounds(), mapa.getZoom());
      } catch {
        /* Perto dos polos o UTM não existe; a grade simplesmente some. */
        gradeAtual = { type: 'FeatureCollection', features: [], passo: 1000 };
      }
      mapa.getSource('grade').setData(gradeAtual);
    }

    /**
     * Desenha os rótulos (grade + marcas) no canvas sobreposto.
     * Roda no evento `render` do MapLibre, que é o único momento em que a
     * câmera e a tela estão garantidamente em sincronia — usar `move` deixaria
     * o texto "nadando" atrás do mapa durante o arrasto.
     */
    function desenharRotulos() {
      if (!mapa) return;
      const dpr = window.devicePixelRatio || 1;
      const largura = alvoMapa.clientWidth;
      const altura = alvoMapa.clientHeight;
      if (!largura || !altura) return;

      if (rotulos.width !== largura * dpr || rotulos.height !== altura * dpr) {
        rotulos.width = largura * dpr;
        rotulos.height = altura * dpr;
      }
      const ctx = rotulos.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largura, altura);

      const css = getComputedStyle(document.documentElement);
      const corGrid = css.getPropertyValue('--grid-label').trim() || '#ffb000';
      const corTexto = css.getPropertyValue('--color-text-primary').trim() || '#dcd6c0';
      const corFundo = css.getPropertyValue('--color-bg').trim() || '#0c0f0a';
      const fonte = css.getPropertyValue('--font-mono').trim() || 'monospace';

      const escrever = (txt, x, y, cor, tamanho = 11, peso = 700) => {
        ctx.font = `${peso} ${tamanho}px ${fonte}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = corFundo;
        ctx.strokeText(txt, x, y);   // halo: legível sobre satélite claro ou escuro
        ctx.fillStyle = cor;
        ctx.fillText(txt, x, y);
      };

      /* Rótulos da grade, encostados nas bordas — como numa carta impressa. */
      const passo = gradeAtual.passo ?? 1000;
      for (const f of gradeAtual.features) {
        const coords = f.geometry.coordinates;
        const txt = rotuloDaLinha(f.properties.valor, passo);
        if (f.properties.eixo === 'E') {
          /* linha vertical: rotula em cima e embaixo */
          const topo = mapa.project(coords[coords.length - 1]);
          const base = mapa.project(coords[0]);
          if (topo.x > 14 && topo.x < largura - 14) escrever(txt, topo.x, 14, corGrid);
          if (base.x > 14 && base.x < largura - 14) escrever(txt, base.x, altura - 12, corGrid);
        } else {
          /* linha horizontal: rotula à esquerda e à direita */
          const esq = mapa.project(coords[0]);
          const dir = mapa.project(coords[coords.length - 1]);
          if (esq.y > 14 && esq.y < altura - 14) escrever(txt, 16, esq.y, corGrid);
          if (dir.y > 14 && dir.y < altura - 14) escrever(txt, largura - 16, dir.y, corGrid);
        }
      }

      /* Rótulos das marcas. */
      const marcas = [
        peca && { p: peca, t: 'PEÇA' },
        alvo && { p: alvo, t: 'ALVO' },
        posGps && { p: posGps, t: 'VOCÊ' }
      ].filter(Boolean);
      for (const m of marcas) {
        const pt = mapa.project([m.p.lon, m.p.lat]);
        if (pt.x < -50 || pt.x > largura + 50 || pt.y < -50 || pt.y > altura + 50) continue;
        escrever(m.t, pt.x, pt.y + 18, corTexto, 10);
      }
    }

    mapa.on('moveend', redesenharGrade);
    mapa.on('zoomend', redesenharGrade);
    mapa.on('render', desenharRotulos);
    redesenhar = desenharRotulos;

    mapa.on('mousemove', (e) => {
      try {
        hudMgrs.textContent = latLonParaMGRS(e.lngLat.lat, e.lngLat.lng, 5, true);
        hudLatLon.textContent = `${num(e.lngLat.lat, 6)}, ${num(e.lngLat.lng, 6)}`;
        const u = latLonParaUTM(e.lngLat.lat, e.lngLat.lng);
        hudZona.textContent = `FUSO ${u.zona}${u.banda} · E ${Math.round(u.easting)} N ${Math.round(u.northing)}`;
      } catch {
        hudMgrs.textContent = 'FORA DA COBERTURA UTM';
        hudLatLon.textContent = ''; hudZona.textContent = '';
      }
    });

    mapa.on('click', (e) => {
      if (!modoClique) return;
      marcar(modoClique, e.lngLat);
      setModo(null);
    });

    selBase.onchange = () => {
      const b = BASES[selBase.value];
      mapa.getSource('base').tiles = b.tiles;
      /* Trocar tiles exige limpar o cache interno e forçar o repaint. */
      mapa.style.sourceCaches.base.clearTiles();
      mapa.style.sourceCaches.base.update(mapa.transform);
      mapa.triggerRepaint();
    };
  })();

  /* Limpeza: sem isso, trocar de aba deixa o GPS ligado e o contexto WebGL vivo. */
  function desmontar() {
    desmontado = true;
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (mapa) { try { mapa.remove(); } catch { /* já removido */ } mapa = null; }
  }

  return { elemento: raiz, desmontar };
}
