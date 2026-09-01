import '../styles/mapa.css';
import { h, empty, dist, num } from '../ui/helpers.js';
import { estado, CHAVES } from '../core/estado.js';
import { iniciarAcompanhamento, solicitarPosicao, precisaoLabel, velocidadeLabel, idadePosicaoLabel, frescorPosicao } from '../core/localizacao.js';
import { vincentyInverse, bearingTo } from '../engine/geo.js';
import { latLonParaMGRS, latLonParaUTM, utmParaLatLon, fusoDe } from '../engine/mgrs.js';
import { CAMADAS_BASE, CAMADAS_OVERLAY } from '../data/camadas-mapa.js';
import { ROTAS_PEREGRINACAO, rotaPorId, statusRotaLabel } from '../data/rotas-peregrinacao.js';
import { contextoPorId, detectarContexto } from '../core/contexto.js';
import { resumoTrilha } from '../core/trilha.js';
import { distancia3D, medirTrilha } from '../engine/odometro.js';
import { estadoTrilha, transicionarTrilha, ESTADOS_TRILHA } from '../core/trilha-sessao.js';
import { planejarTilesDoViewport } from '../core/mapa-offline.js';
import { criarControleCentralizacao } from '../core/centralizacao-manual.js';
import { criarControleBackground, ESTADOS_BACKGROUND } from '../core/background-localizacao.js';
import { chaveDesenhoGrade } from '../core/chave-renderizacao.js';
import { exportarRegistroLocal, exportarRegistroGpx, exportarRegistroKml, importarRegistroGpx, importarRegistroKml, importarRegistroLocal } from '../core/registro-offline.js';
import { detectarFormatoRegistro, FORMATOS_REGISTRO } from '../core/registro-arquivo.js';
import { compartilharArquivo, ESTADOS_COMPARTILHAMENTO } from '../platform/compartilhamento.js';
import { criarMotorMapa } from '../core/map-engine.js';
import { criarRegistroFotoParada, avaliarPosicaoParada, fotosParadaComoWaypoints, PRECISAO_PARADA_PADRAO_M } from '../core/foto-parada.js';
import { criarStorageFotos } from '../core/foto-storage.js';
import { iniciarTrajeto, encerrarTrajeto, iniciarParada, encerrarParada, resumoTrajeto, paradaAberta, TIPOS_PARADA } from '../core/trajeto.js';
import { classificarDeslocamento, sugerirModoAtual, MODOS_DESLOCAMENTO, CONFIANCA } from '../core/deslocamento.js';
import { avaliarExposicao, NIVEIS_EXPOSICAO } from '../core/exposicao.js';
import { dispararAlerta } from '../core/alertas-tateis.js';
import { capturarFotoDaParada, cameraNativaDisponivel, RESULTADOS_CAPTURA } from '../platform/camera.js';
import { montarPacotePeregrinacao } from '../core/pacote-peregrinacao.js';

const BASES = Object.fromEntries(CAMADAS_BASE.map((camada) => [camada.id, camada]));
const ROTULOS = CAMADAS_OVERLAY.find((camada) => camada.id === 'labels') ?? null;
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
  function exibirEstadoGps({ status, fonte } = {}) {
    const prefixo = fonte === 'FOREGROUND_ONLY' ? ' · FOREGROUND' : '';
    estadoGps.textContent = status === 'ACTIVE'
      ? `GPS ATIVO${prefixo}`
      : status === 'PAUSED'
        ? 'GPS PAUSADO · APP OCULTO'
        : status === 'STARTING'
          ? 'GPS BUSCANDO'
          : status === 'STOPPED'
            ? 'GPS ENCERRADO'
            : status === 'UNAVAILABLE'
              ? 'GPS INDISPONÍVEL'
              : status === 'ERROR'
                ? 'GPS COM ERRO'
                : estadoGps.textContent;
  }
  const modoBotao = h('button', { className: 'mapa__mode-button', type: 'button' }, 'MARCAR PONTO');
  const sheetStatus = h('p', { className: 'mapa__sheet-status', role: 'status' }, 'Ative uma rota para registrar o caminho no aparelho.');
  const routeButton = h('button', { className: 'mapa__route-button', type: 'button' }, 'INICIAR ROTA');
  const stopRouteButton = h('button', { className: 'mapa__quick-button mapa__quick-button--quiet', type: 'button' }, 'PARAR E GUARDAR');
  const wakeButton = h('button', { className: 'mapa__wake-button', type: 'button', 'aria-pressed': 'false' }, 'MANTER TELA ATIVA: DESLIGADO');
  const backgroundButton = h('button', { className: 'mapa__background-button', type: 'button', 'aria-pressed': 'false' }, 'ATIVAR GPS EM 2º PLANO');
  const backgroundStatus = h('p', { className: 'mapa__background-status', role: 'status' }, 'Disponível no APK de teste; não envia localização para servidor.');
  const centerButton = h('button', { className: 'mapa__quick-button', type: 'button' }, '⌾ CENTRAR');
  const clearButton = h('button', { className: 'mapa__quick-button mapa__quick-button--quiet', type: 'button' }, 'LIMPAR TRILHA');
  const offlineButton = h('button', { className: 'mapa__offline-button', type: 'button' }, 'PREPARAR ÁREA OFFLINE');
  const offlineStatus = h('p', { className: 'mapa__offline-status', role: 'status' }, 'Baixe a área visível antes de sair sem internet.');
  const offlineClearButton = h('button', { className: 'mapa__offline-clear', type: 'button' }, 'LIMPAR ÁREA PREPARADA');
  const registroExportarButton = h('button', { className: 'mapa__quick-button', type: 'button' }, 'EXPORTAR JSON');
  const registroGpxButton = h('button', { className: 'mapa__quick-button', type: 'button' }, 'EXPORTAR GPX');
  const registroKmlButton = h('button', { className: 'mapa__quick-button', type: 'button' }, 'EXPORTAR KML');
  const registroImportarButton = h('button', { className: 'mapa__quick-button', type: 'button' }, 'IMPORTAR JSON/GPX/KML');
  const registroArquivo = h('input', { className: 'mapa__registro-file', type: 'file', accept: 'application/json,.json,application/gpx+xml,.gpx,application/vnd.google-earth.kml+xml,.kml', 'aria-label': 'Importar registro local JSON, GPX ou KML' });
  const registroStatus = h('p', { className: 'mapa__registro-status', role: 'status' }, 'Backup local de rota, pontos e destino; sem sincronização.');
  const fotoButton = h('button', { className: 'mapa__foto-button', type: 'button' }, '⏺ FOTO DA PARADA');
  const fotoArquivo = h('input', { className: 'mapa__registro-file', type: 'file', accept: 'image/*', capture: 'environment', 'aria-label': 'Foto da parada atual' });
  const fotoStatus = h('p', { className: 'mapa__foto-status', role: 'status' }, `A foto é guardada com a coordenada da captura; a parada pede precisão de ${PRECISAO_PARADA_PADRAO_M} m ou melhor.`);
  const fotoLista = h('ul', { className: 'mapa__foto-lista' });
  const pacoteBotao = h('button', { className: 'mapa__quick-button', type: 'button' }, '⤓ PACOTE DA CAMINHADA');
  const visorImagem = h('img', { className: 'mapa__visor-imagem', alt: 'Foto da parada' });
  const visorLegenda = h('p', { className: 'mapa__visor-legenda' });
  const visorContador = h('span', { className: 'mapa__visor-contador' });
  const visorAnterior = h('button', { className: 'mapa__quick-button', type: 'button' }, '‹ ANTERIOR');
  const visorProxima = h('button', { className: 'mapa__quick-button', type: 'button' }, 'PRÓXIMA ›');
  const visorRemover = h('button', { className: 'mapa__quick-button mapa__quick-button--quiet', type: 'button' }, 'REMOVER');
  const visorFechar = h('button', { className: 'mapa__visor-fechar', type: 'button', 'aria-label': 'Fechar a foto' }, '✕');
  const visor = h('div', { className: 'mapa__visor', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Foto da parada' },
    h('div', { className: 'mapa__visor-topo' }, visorContador, visorFechar),
    visorImagem,
    visorLegenda,
    h('div', { className: 'mapa__visor-acoes' }, visorAnterior, visorProxima, visorRemover),
  );
  const trajetoBotao = h('button', { className: 'mapa__route-button', type: 'button' }, 'INICIAR TRAJETO');
  const paradaBotao = h('button', { className: 'mapa__quick-button', type: 'button' }, 'REGISTRAR PARADA');
  const pernoiteBotao = h('button', { className: 'mapa__quick-button mapa__quick-button--quiet', type: 'button' }, 'PERNOITE');
  const trajetoResumo = h('div', { className: 'mapa__trajeto-resumo', role: 'status' }, 'Nenhum trajeto iniciado.');
  const deslocamentoResumo = h('p', { className: 'mapa__trajeto-modos' }, '');
  const veiculoPergunta = h('div', { className: 'mapa__veiculo-pergunta' });
  const exposicaoAviso = h('p', { className: 'mapa__exposicao', role: 'status' }, '');
  const selectBase = h('select', { className: 'mapa__select', 'aria-label': 'Base cartográfica' },
    ...CAMADAS_BASE.map((base) => h('option', { value: base.id }, base.nome.toUpperCase()))
  );
  selectBase.value = 'terreno' in BASES ? 'terreno' : Object.keys(BASES)[0];
  const selectUso = h('select', { className: 'mapa__select', 'aria-label': 'Modo de uso' },
    h('option', { value: 'trilha' }, 'TRILHA / EXPEDIÇÃO'),
    h('option', { value: 'cidade' }, 'CIDADE / DIA A DIA'),
    h('option', { value: 'mar' }, 'MAR / REFERÊNCIA')
  );
  selectUso.value = estado.get(CHAVES.MODO_USO, 'trilha');
  const selectRota = h('select', { className: 'mapa__select', 'aria-label': 'Rota de peregrinação' },
    ...ROTAS_PEREGRINACAO.map((rota) => h('option', { value: rota.id }, rota.nome.toUpperCase()))
  );
  selectRota.value = 'caminhos-dos-anjos';
  const rotaReferenciaStatus = h('p', { className: 'mapa__rota-reference-status', role: 'note' });
  function atualizarRotaReferencia() {
    const rota = rotaPorId(selectRota.value);
    const cidades = rota.cidades.length ? ` Cidades: ${rota.cidades.join(', ')}.` : '';
    rotaReferenciaStatus.textContent = `${rota.tipo} · ${statusRotaLabel(rota)}. ${rota.resumo}${cidades}`;
    rotaReferenciaStatus.classList.toggle('is-unconfirmed', rota.estado === 'NAO_CONFIRMADA');
  }
  selectRota.onchange = atualizarRotaReferencia;
  atualizarRotaReferencia();
  const modoMarInfo = h('aside', { className: 'mapa__mar-info', role: 'note', 'aria-label': 'Limites do modo Mar' },
    h('strong', null, 'MODO MAR · REFERÊNCIA'),
    h('p', null, 'Satélite e topografia ajudam a orientar, mas não mostram profundidade segura nem substituem carta náutica oficial atualizada, avisos aos navegantes, marés, sonar ou julgamento local.')
  );
  const contextoStatus = h('p', { className: 'mapa__contexto-status', role: 'status' }, 'Contexto local: aguardando posição. Não há alerta oficial automático.');
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
    modoMarInfo,
    h('div', { className: 'mapa__rota-reference-card' },
      h('span', { className: 'mapa__kicker' }, 'ROTAS DE PEREGRINAÇÃO'),
      h('label', { className: 'mapa__rota-reference-label' }, h('span', null, 'ROTA DE REFERÊNCIA'), selectRota),
      rotaReferenciaStatus
    ),
    h('div', { className: 'mapa__contexto-card' },
      h('span', { className: 'mapa__kicker' }, 'CONTEXTO CIVIL'),
      contextoStatus
    ),
    h('div', { className: 'mapa__quick-actions' }, centerButton, clearButton),
    h('div', { className: 'mapa__offline-card' }, offlineButton, offlineStatus, offlineClearButton),
    h('div', { className: 'mapa__registro-card' },
      h('div', { className: 'mapa__route-card-head' }, h('span', { className: 'mapa__kicker' }, 'DADOS LOCAIS'), h('span', { className: 'mapa__privacy' }, '⌖ JSON')),
      h('div', { className: 'mapa__registro-actions' }, registroExportarButton, registroGpxButton, registroKmlButton, registroImportarButton),
      registroArquivo,
      registroStatus
    ),
    h('div', { className: 'mapa__trajeto-card' },
      h('div', { className: 'mapa__route-card-head' }, h('span', { className: 'mapa__kicker' }, 'TRAJETO'), h('span', { className: 'mapa__privacy' }, '⌖ NO APARELHO')),
      trajetoResumo,
      deslocamentoResumo,
      trajetoBotao,
      h('div', { className: 'mapa__trajeto-acoes' }, paradaBotao, pernoiteBotao),
      veiculoPergunta,
      exposicaoAviso
    ),
    h('div', { className: 'mapa__foto-card' },
      h('div', { className: 'mapa__route-card-head' }, h('span', { className: 'mapa__kicker' }, 'PARADAS COM FOTO'), h('span', { className: 'mapa__privacy' }, '⌖ NO APARELHO')),
      fotoButton,
      fotoArquivo,
      pacoteBotao,
      fotoStatus,
      fotoLista
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
      h('span', { className: 'mapa__route-stats', role: 'status' }, '0 pontos · tempo indisponível · velocidade média indisponível'),
        routeButton,
        stopRouteButton,
        wakeButton,
        backgroundButton,
        backgroundStatus,
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
  raiz.append(canvas, hud, markerHint, sheet, visor);

  let mapa = null;
  let motorMapa = null;
  const storageFotos = criarStorageFotos();
  let paradas = [];
  let trajeto = estado.get(CHAVES.TRAJETO, null);
  let modoConfirmado = null;
  let sugestaoRecusada = null;
  let ultimoAvisoExposicaoEm = null;
  let avisosPorTipo = {};
  let tickTrajeto = null;
  let posicao = estado.get(CHAVES.LOCAL, null);
  let trilha = estado.get(CHAVES.TRILHA, []);
  let waypoints = estado.get(CHAVES.WAYPOINTS, []);
  let destino = estado.get(CHAVES.DESTINO, null);
  let rotaAtiva = Boolean(estado.get(CHAVES.ROTA_ATIVA, false));
  let rotaPausada = Boolean(estado.get(CHAVES.ROTA_PAUSADA, false)) && rotaAtiva;
  let marcando = false;
  let marcandoDestino = false;
  let primeiraPosicao = !posicao;
  let ultimoRegistrado = trilha.length ? trilha[trilha.length - 1] : null;
  let desmontado = false;
  let gradeAtual = { type: 'FeatureCollection', features: [], passo: 1000 };
  let versaoGrade = 0;
  let ultimaChaveRotulos = null;
  let wakeLock = null;
  let wakeAtivo = false;
  let backgroundEstado = ESTADOS_BACKGROUND.IDLE;
  let backgroundMensagem = 'Disponível no APK de teste; não envia localização para servidor.';

  /**
   * Decide se o fixo entra na trilha.
   *
   * O portão antigo era `haversine(anterior, nova) >= 5`: distância **no
   * plano**. Subindo escada a pessoa anda dois metros na horizontal e dez na
   * vertical, então nada entrava — foi assim que uma caminhada real virou
   * "quase no mesmo lugar". Três mudanças:
   *
   * 1. A distância considera o **desnível**.
   * 2. O limiar cai de 5 m para 2 m: gravar é barato, e trilha esparsa é o que
   *    faz o traçado sair reto de esquina em esquina.
   * 3. **O tempo também abre o portão.** Parado num ponto de vista ou subindo
   *    devagar, um ponto a cada 10 s mantém o registro vivo — sem isso o
   *    traçado tem buracos exatamente onde o trecho foi mais difícil.
   *
   * Gravar generoso e peneirar na hora de somar é de propósito: `odometro.js`
   * decide o que conta como distância, e a trilha guarda o formato do caminho.
   */
  function deveRegistrar(anterior, nova) {
    if (!anterior) return true;
    const medida = distancia3D(anterior, nova);
    if (medida && medida.totalM >= 2) return true;
    const decorridoMs = Number(nova?.timestamp) - Number(anterior?.timestamp);
    return Number.isFinite(decorridoMs) && decorridoMs >= 10_000;
  }

  function registrarPosicao(nova) {
    const anterior = posicao;
    posicao = nova;
    if (rotaAtiva && !rotaPausada && deveRegistrar(ultimoRegistrado, nova)) {
      // O modo confirmado pela pessoa viaja com o ponto: é o que separa
      // quilômetro andado de quilômetro de ônibus no registro.
      trilha = [...trilha, modoConfirmado ? { ...nova, modo: modoConfirmado } : nova].slice(-12000);
      ultimoRegistrado = nova;
      estado.set(CHAVES.TRILHA, trilha);
    }
    if (!document.hidden) {
      atualizarHud();
      atualizarSheet();
      atualizarMarcadores();
      atualizarTrajeto();
      perguntarSobreVeiculo();
      avaliarExposicaoAtual();
      if (mapa && primeiraPosicao) {
        primeiraPosicao = false;
        mapa.flyTo({ center: [nova.lon, nova.lat], zoom: 15, duration: 700 });
      }
    }
  }

  const controleCentralizacao = criarControleCentralizacao({
    solicitar: solicitarPosicao,
    onInicio: () => {
      centerButton.disabled = true;
      centerButton.textContent = 'BUSCANDO FIXO…';
    },
    onPosition: (pos) => {
      if (desmontado) return;
      posicao = pos;
      atualizarHud();
      atualizarSheet();
      atualizarMarcadores();
      mapa?.flyTo({ center: [pos.lon, pos.lat], zoom: Math.max(mapa.getZoom(), 15), duration: 500 });
      sheetStatus.textContent = `Novo fixo recebido · ${precisaoLabel(pos.accuracy)} · confirme o ponto no aparelho.`;
    },
    onError: (erro) => {
      if (desmontado) return;
      sheetStatus.textContent = erro?.code === 1
        ? 'Permita o GPS nas configurações do aparelho para centralizar.'
        : 'Não foi possível obter um novo fixo de maior precisão.';
    },
    onFim: () => {
      if (desmontado) return;
      centerButton.disabled = false;
      centerButton.textContent = '⌾ CENTRAR';
    },
  });

  const backgroundControle = criarControleBackground({
    onPosition: registrarPosicao,
    onState: ({ status, erro } = {}) => {
      backgroundEstado = status ?? backgroundEstado;
      if (status === ESTADOS_BACKGROUND.STARTING) backgroundMensagem = 'Solicitando permissões e iniciando serviço nativo; mantenha a sessão ativa.';
      if (status === ESTADOS_BACKGROUND.ACTIVE) backgroundMensagem = 'GPS em segundo plano ativo. O sistema exibirá uma notificação; pontos continuam locais.';
      if (status === ESTADOS_BACKGROUND.STOPPED) backgroundMensagem = 'GPS em segundo plano encerrado; o registro continua no aparelho.';
      if (status === ESTADOS_BACKGROUND.UNAVAILABLE) backgroundMensagem = 'Background tracking disponível somente no APK nativo de teste.';
      if (status === ESTADOS_BACKGROUND.ERROR) backgroundMensagem = `Background tracking com erro${erro ? `: ${erro}` : '.'}`;
      if (status === ESTADOS_BACKGROUND.ACTIVE || status === ESTADOS_BACKGROUND.STARTING) atualizarWatcherForeground();
      if ([ESTADOS_BACKGROUND.ERROR, ESTADOS_BACKGROUND.UNAVAILABLE, ESTADOS_BACKGROUND.STOPPED].includes(status) && !document.hidden) atualizarWatcherForeground();
      if (!desmontado) atualizarSheet();
    },
    onError: (erro) => {
      if (desmontado) return;
      backgroundMensagem = `Não foi possível iniciar o background tracking${erro?.message ? `: ${erro.message}` : '.'}`;
      atualizarSheet();
    },
  });

  function atualizarWatcherForeground() {
    if (!pararGps?.setPaused) return;
    const manterPausado = document.hidden || backgroundEstado === ESTADOS_BACKGROUND.STARTING || backgroundEstado === ESTADOS_BACKGROUND.ACTIVE;
    pararGps.setPaused(manterPausado);
  }

  /**
   * Segunda soma 2D que existia aqui: somava `haversine` ponto a ponto, sem
   * desnível e sem peneira de ruído. Passa pelo mesmo odômetro do resumo, para
   * a tela não mostrar dois números diferentes para a mesma caminhada.
   */
  function distanciaTrilha() {
    return medirTrilha(trilha).distanciaM;
  }

  function atualizarHud() {
    if (!posicao) {
      topoLocal.textContent = 'AGUARDANDO GPS';
      topoMeta.textContent = 'POSIÇÃO NÃO CONFIRMADA';
      estadoGps.classList.remove('is-stale');
      estadoGps.textContent = 'GPS DESLIGADO';
      return;
    }
    try { topoLocal.textContent = latLonParaMGRS(posicao.lat, posicao.lon, 5, true); } catch { topoLocal.textContent = `${num(posicao.lat, 5)}, ${num(posicao.lon, 5)}`; }
    const frescor = frescorPosicao(posicao);
    topoMeta.textContent = `${num(posicao.lat, 5)}, ${num(posicao.lon, 5)} · ${precisaoLabel(posicao.accuracy)} · ${idadePosicaoLabel(posicao)}`;
    estadoGps.classList.toggle('is-stale', frescor === 'antigo' || frescor === 'muito antigo');
    estadoGps.textContent = `GPS ${precisaoLabel(posicao.accuracy)} · ${frescor}`;
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

  function atualizarContextoMapa() {
    const padrao = estado.get(CHAVES.CONTEXTO, 'cidade');
    const resultado = detectarContexto(posicao, estado.get(CHAVES.ZONAS, []), padrao);
    const contexto = contextoPorId(resultado.contexto?.id ?? padrao);
    contextoStatus.classList.toggle('is-zone', Boolean(resultado.zona));
    if (resultado.zona) {
      const validade = resultado.zona.validadeEm ? ` · válido até ${new Date(resultado.zona.validadeEm).toLocaleDateString()}` : ' · sem expiração informada';
      contextoStatus.textContent = `${contexto.nome} · ${resultado.zona.nome} · fonte: ${resultado.zona.fonte}${validade}. Confirme com a autoridade local; não é alerta oficial automático.`;
      return;
    }
    contextoStatus.textContent = `${contexto.nome} · ${resultado.confianca}. Sem zona local ativa e sem alerta oficial automático.`;
  }

  function atualizarSheet() {
    modoMarInfo.classList.toggle('is-visible', selectUso.value === 'mar');
    atualizarContextoMapa();
    const resumo = resumoTrilha(trilha);
    sheet.querySelector('.mapa__route-distance').textContent = dist(resumo.distanciaM);
    sheet.querySelector('.mapa__route-stats').textContent = `${resumo.pontos} pontos · ${resumo.duracaoLabel} · ${resumo.velocidadeMediaLabel}`;
    const estadoAtualRota = estadoTrilha({ ativa: rotaAtiva, pausada: rotaPausada });
    routeButton.textContent = estadoAtualRota === ESTADOS_TRILHA.GRAVANDO
      ? 'PAUSAR ROTA'
      : estadoAtualRota === ESTADOS_TRILHA.PAUSADA
        ? 'RETOMAR ROTA'
        : 'INICIAR ROTA';
    routeButton.classList.toggle('is-active', estadoAtualRota === ESTADOS_TRILHA.GRAVANDO);
    stopRouteButton.disabled = estadoAtualRota === ESTADOS_TRILHA.PARADA;
    sheetStatus.textContent = estadoAtualRota === ESTADOS_TRILHA.GRAVANDO
      ? `Gravando no aparelho · ${trilha.length} pontos · ${velocidadeLabel(posicao?.speed)}`
      : estadoAtualRota === ESTADOS_TRILHA.PAUSADA
        ? `${trilha.length} pontos guardados localmente · rota pausada`
        : trilha.length
          ? `${trilha.length} pontos guardados localmente · pronto para continuar`
          : 'Ative uma rota para registrar o caminho no aparelho.';
    wakeButton.disabled = estadoAtualRota !== ESTADOS_TRILHA.GRAVANDO || !('wakeLock' in navigator);
    wakeButton.textContent = !('wakeLock' in navigator)
      ? 'TELA ATIVA INDISPONÍVEL NESTE APARELHO'
      : `MANTER TELA ATIVA: ${wakeAtivo ? 'LIGADO' : 'DESLIGADO'}`;
    wakeButton.setAttribute('aria-pressed', String(wakeAtivo));
    const backgroundDisponivel = backgroundControle.podeIniciar();
    const backgroundAtivo = backgroundEstado === ESTADOS_BACKGROUND.STARTING || backgroundEstado === ESTADOS_BACKGROUND.ACTIVE;
    backgroundButton.disabled = !rotaAtiva || rotaPausada || !backgroundDisponivel || backgroundEstado === ESTADOS_BACKGROUND.STARTING;
    backgroundButton.textContent = backgroundAtivo
      ? 'PARAR GPS EM 2º PLANO'
      : backgroundDisponivel ? 'ATIVAR GPS EM 2º PLANO' : 'GPS EM 2º PLANO: SOMENTE APK';
    backgroundButton.setAttribute('aria-pressed', String(backgroundEstado === ESTADOS_BACKGROUND.ACTIVE));
    backgroundStatus.textContent = backgroundMensagem;
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
    for (const parada of paradas) {
      if (!Number.isFinite(Number(parada?.lat)) || !Number.isFinite(Number(parada?.lon))) continue;
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [Number(parada.lon), Number(parada.lat)] }, properties: { tipo: 'parada' } });
    }
    mapa.getSource('vanguard-marcadores').setData({ type: 'FeatureCollection', features });
    mapa.getSource('vanguard-trilha').setData({ type: 'FeatureCollection', features: trilha.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: trilha.map((p) => [p.lon, p.lat]) }, properties: {} }] : [] });
    mapa.getSource('vanguard-destino').setData({ type: 'FeatureCollection', features: posicao && destino ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[posicao.lon, posicao.lat], [destino.lon, destino.lat]] }, properties: {} }] : [] });
  }

  function centralizar() {
    if (!mapa || desmontado) return;
    controleCentralizacao.iniciar();
  }

  async function alternarBackground() {
    if (!rotaAtiva || rotaPausada) {
      backgroundMensagem = 'Inicie uma rota ativa antes de usar o GPS em segundo plano.';
      atualizarSheet();
      return;
    }
    const ativo = backgroundEstado === ESTADOS_BACKGROUND.ACTIVE || backgroundEstado === ESTADOS_BACKGROUND.STARTING;
    if (ativo) {
      await backgroundControle.parar();
      atualizarWatcherForeground();
      return;
    }
    if (!window.confirm('Ativar GPS/trilha em segundo plano? O aparelho exibirá uma notificação, consumirá mais bateria e o sistema pode interromper o serviço. Nenhuma posição será enviada para servidor.')) return;
    backgroundMensagem = 'Preparando o serviço nativo; aceite as permissões exibidas pelo aparelho.';
    pararGps.setPaused?.(true);
    atualizarSheet();
    const iniciou = await backgroundControle.iniciar();
    if (!iniciou) {
      atualizarWatcherForeground();
      return;
    }
    atualizarSheet();
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
        if (!desmontado) atualizarSheet();
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
    const atual = estadoTrilha({ ativa: rotaAtiva, pausada: rotaPausada });
    const proximoEvento = atual === ESTADOS_TRILHA.PARADA ? 'START' : atual === ESTADOS_TRILHA.GRAVANDO ? 'PAUSE' : 'RESUME';
    const proximo = transicionarTrilha(atual, proximoEvento);
    rotaAtiva = proximo.ativa;
    rotaPausada = proximo.pausada;
    estado.set(CHAVES.ROTA_ATIVA, rotaAtiva);
    estado.set(CHAVES.ROTA_PAUSADA, rotaPausada);
    pararGps?.setMode(rotaAtiva ? 'trilha' : 'cidade');
    if (rotaAtiva && trilha.length === 0) {
      trilha = [posicao];
      estado.set(CHAVES.TRILHA, trilha);
    }
    if (!rotaAtiva || rotaPausada) {
      configurarWakeLock(false);
      void backgroundControle.parar();
    }
    if (rotaAtiva && !rotaPausada) sheetStatus.textContent = 'Rota iniciada: gravação local ativa.';
    if (rotaAtiva && rotaPausada) sheetStatus.textContent = 'Rota pausada. Os pontos já registrados permanecem no aparelho.';
    atualizarSheet();
    atualizarMarcadores();
  }

  async function pararRota() {
    if (!rotaAtiva) return;
    await backgroundControle.parar();
    const proximo = transicionarTrilha(estadoTrilha({ ativa: rotaAtiva, pausada: rotaPausada }), 'STOP');
    rotaAtiva = proximo.ativa;
    rotaPausada = proximo.pausada;
    estado.set(CHAVES.ROTA_ATIVA, rotaAtiva);
    estado.set(CHAVES.ROTA_PAUSADA, rotaPausada);
    pararGps?.setMode('cidade');
    configurarWakeLock(false);
    atualizarWatcherForeground();
    sheetStatus.textContent = `${trilha.length} pontos guardados localmente. Rota parada sem apagar o registro.`;
    atualizarSheet();
  }

  function limparTrilha() {
    if (!trilha.length && !waypoints.length && !rotaAtiva && backgroundEstado === ESTADOS_BACKGROUND.IDLE) return;
    trilha = [];
    waypoints = [];
    rotaAtiva = false;
    rotaPausada = false;
    estado.set(CHAVES.TRILHA, trilha);
    estado.set(CHAVES.WAYPOINTS, waypoints);
    estado.set(CHAVES.ROTA_ATIVA, false);
    estado.set(CHAVES.ROTA_PAUSADA, false);
    configurarWakeLock(false);
    void backgroundControle.parar();
    pararGps?.setMode('cidade');
    sheetStatus.textContent = 'Trilha e pontos removidos deste aparelho.';
    atualizarSheet();
    atualizarMarcadores();
  }

  function textoResultadoCompartilhamento(resultado, tipo) {
    const prefixo = tipo === 'JSON'
      ? `${trilha.length} pontos de trilha, ${waypoints.length} waypoints e ${destino ? '1 destino' : 'nenhum destino'}`
      : `${trilha.length} pontos de trilha e ${waypoints.length + (destino ? 1 : 0)} waypoints`;
    if (resultado.estado === ESTADOS_COMPARTILHAMENTO.COMPARTILHADO) return `${prefixo} compartilhados pelo sistema. Confirme o destino no aparelho.`;
    if (resultado.estado === ESTADOS_COMPARTILHAMENTO.BAIXADO) return `${prefixo} disponibilizados para download local. Confirme onde o aparelho salvou o arquivo.`;
    if (resultado.estado === ESTADOS_COMPARTILHAMENTO.CANCELADO) return 'Compartilhamento cancelado. Nenhum arquivo foi confirmado como enviado.';
    return `${resultado.detalhe} O registro continua somente no aparelho.`;
  }

  async function exportarRegistro() {
    try {
      const conteudo = exportarRegistroLocal({ trilha, waypoints: [...waypoints, ...fotosParadaComoWaypoints(paradas)], destino });
      const resultado = await compartilharArquivo({
        blob: new Blob([conteudo], { type: 'application/json;charset=utf-8' }),
        fileName: `vanguard-registro-${new Date().toISOString().slice(0, 10)}.json`,
        title: 'Registro local Vanguard Field',
        texto: 'Backup local de navegação Vanguard Field.',
      });
      registroStatus.textContent = textoResultadoCompartilhamento(resultado, 'JSON');
    } catch (erro) {
      registroStatus.textContent = erro?.message ?? 'Não foi possível exportar o registro local.';
    }
  }

  async function exportarRegistroKmlLocal() {
    try {
      const conteudo = exportarRegistroKml({ trilha, waypoints: [...waypoints, ...fotosParadaComoWaypoints(paradas)], destino });
      const resultado = await compartilharArquivo({
        blob: new Blob([conteudo], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' }),
        fileName: `vanguard-trilha-${new Date().toISOString().slice(0, 10)}.kml`,
        title: 'Trilha Vanguard Field',
        texto: 'Backup KML local de navegação Vanguard Field.',
      });
      registroStatus.textContent = textoResultadoCompartilhamento(resultado, 'KML');
    } catch (erro) {
      registroStatus.textContent = erro?.message ?? 'Não foi possível exportar o KML local.';
    }
  }

  async function exportarRegistroGpxLocal() {
    try {
      const conteudo = exportarRegistroGpx({ trilha, waypoints: [...waypoints, ...fotosParadaComoWaypoints(paradas)], destino });
      const resultado = await compartilharArquivo({
        blob: new Blob([conteudo], { type: 'application/gpx+xml;charset=utf-8' }),
        fileName: `vanguard-trilha-${new Date().toISOString().slice(0, 10)}.gpx`,
        title: 'Trilha Vanguard Field',
        texto: 'Backup GPX local de navegação Vanguard Field.',
      });
      registroStatus.textContent = textoResultadoCompartilhamento(resultado, 'GPX');
    } catch (erro) {
      registroStatus.textContent = erro?.message ?? 'Não foi possível exportar o GPX local.';
    }
  }

  function textoModos() {
    const analise = classificarDeslocamento(trilha);
    if (!analise.segmentos.length) return '';
    const km = (metros) => `${(metros / 1000).toFixed(1)} km`;
    const partes = [`${km(analise.distanciaAPeM)} a pé`];
    if (analise.distanciaVeiculoM > 0) partes.push(`${km(analise.distanciaVeiculoM)} em veículo`);
    if (analise.distanciaIndefinidaM > 0) partes.push(`${km(analise.distanciaIndefinidaM)} sem classificar`);
    return `${partes.join(' · ')} — estimado pela velocidade; confirme o que for veículo.`;
  }

  function atualizarTrajeto() {
    const resumo = resumoTrajeto(trajeto);
    trajetoBotao.textContent = resumo.ativo ? 'ENCERRAR TRAJETO' : 'INICIAR TRAJETO';
    paradaBotao.disabled = !resumo.ativo;
    pernoiteBotao.disabled = !resumo.ativo || resumo.emParada;
    paradaBotao.textContent = resumo.emParada ? 'RETOMAR CAMINHADA' : 'REGISTRAR PARADA';

    if (!trajeto) {
      trajetoResumo.textContent = 'Nenhum trajeto iniciado.';
      deslocamentoResumo.textContent = '';
      return;
    }
    const inicio = new Date(resumo.iniciadoEm).toLocaleString();
    const fim = resumo.encerradoEm ? new Date(resumo.encerradoEm).toLocaleString() : null;
    empty(trajetoResumo).append(
      h('div', { className: 'mapa__trajeto-linha' }, `TOTAL ${resumo.duracaoTotalLabel}`),
      h('div', { className: 'mapa__trajeto-linha' }, `EM MARCHA ${resumo.tempoEmMarchaLabel} · DESCANSO ${resumo.tempoDescansandoLabel}`),
      h('div', { className: 'mapa__trajeto-meta' }, `INÍCIO ${inicio}${fim ? ` · FIM ${fim}` : ''}`),
      h('div', { className: 'mapa__trajeto-meta' }, `${resumo.paradas} parada(s) · ${resumo.pernoites} pernoite(s)${resumo.emParada ? ` · EM ${resumo.tipoParadaAtual}` : ''}`),
    );
    deslocamentoResumo.textContent = textoModos();
  }

  function aplicarTrajeto(resultado) {
    if (!resultado.ok) {
      trajetoResumo.textContent = resultado.motivo;
      return false;
    }
    trajeto = resultado.trajeto;
    estado.set(CHAVES.TRAJETO, trajeto);
    atualizarTrajeto();
    return true;
  }

  function alternarTrajeto() {
    if (resumoTrajeto(trajeto).ativo) {
      if (!window.confirm('Encerrar o trajeto e congelar o tempo total?')) return;
      aplicarTrajeto(encerrarTrajeto(trajeto));
      return;
    }
    aplicarTrajeto(iniciarTrajeto({ agora: Date.now() }));
  }

  function alternarParada(tipo = TIPOS_PARADA.DESCANSO) {
    if (!trajeto) return;
    if (paradaAberta(trajeto)) {
      aplicarTrajeto(encerrarParada(trajeto));
      return;
    }
    aplicarTrajeto(iniciarParada(trajeto, { tipo, posicao }));
  }

  function instanteUltimaParada() {
    const paradasDoTrajeto = trajeto?.paradas ?? [];
    const ultima = paradasDoTrajeto[paradasDoTrajeto.length - 1];
    const referencia = ultima?.encerradaEm ?? ultima?.iniciadaEm ?? trajeto?.iniciadoEm ?? null;
    const valor = referencia ? Date.parse(referencia) : NaN;
    return Number.isFinite(valor) ? valor : null;
  }

  function marcarModo(modo) {
    modoConfirmado = modo;
    sugestaoRecusada = modo == null ? Date.now() : null;
    empty(veiculoPergunta);
    atualizarTrajeto();
  }

  function perguntarSobreVeiculo() {
    if (!resumoTrajeto(trajeto).ativo || modoConfirmado === MODOS_DESLOCAMENTO.VEICULO) return;
    if (sugestaoRecusada && Date.now() - sugestaoRecusada < 10 * 60_000) return;
    const sugestao = sugerirModoAtual(trilha, { agora: Date.now() });
    if (sugestao.modo !== MODOS_DESLOCAMENTO.VEICULO || sugestao.confianca === CONFIANCA.BAIXA) {
      if (veiculoPergunta.childElementCount) empty(veiculoPergunta);
      return;
    }
    if (veiculoPergunta.childElementCount) return;
    veiculoPergunta.append(
      h('p', { className: 'mapa__veiculo-texto' }, `${sugestao.motivo} Você está em veículo?`),
      h('div', { className: 'mapa__trajeto-acoes' },
        h('button', { className: 'mapa__quick-button', type: 'button', onclick: () => marcarModo(MODOS_DESLOCAMENTO.VEICULO) }, 'SIM, EM VEÍCULO'),
        h('button', { className: 'mapa__quick-button mapa__quick-button--quiet', type: 'button', onclick: () => marcarModo(null) }, 'NÃO, A PÉ'),
      ),
    );
  }

  function avaliarExposicaoAtual() {
    const avaliacao = avaliarExposicao({
      posicao,
      agora: Date.now(),
      ultimaParadaEm: instanteUltimaParada(),
      ultimoAvisoEm: ultimoAvisoExposicaoEm,
    });
    exposicaoAviso.classList.toggle('is-alerta', avaliacao.nivel === NIVEIS_EXPOSICAO.ALTO || avaliacao.nivel === NIVEIS_EXPOSICAO.CRITICO);
    exposicaoAviso.textContent = avaliacao.nivel === NIVEIS_EXPOSICAO.NORMAL && !resumoTrajeto(trajeto).ativo
      ? ''
      : `${avaliacao.nivel} · ${avaliacao.motivos.join(' ')} ${avaliacao.recomendacao}`;
    if (avaliacao.vibrar && resumoTrajeto(trajeto).ativo) {
      // O ritmo identifica o aviso sem tirar o aparelho do bolso, e o intervalo
      // é por tipo: um aviso de sol não pode calar outro tipo de aviso.
      const disparo = dispararAlerta({
        tipo: avaliacao.tipoAlerta,
        gravidade: avaliacao.gravidadeAlerta,
        ultimoAvisoPorTipo: avisosPorTipo,
      });
      avisosPorTipo = disparo.ultimoAvisoPorTipo;
      ultimoAvisoExposicaoEm = Date.now();
    }
  }

  async function exportarPacoteDaCaminhada() {
    pacoteBotao.disabled = true;
    const rotulo = pacoteBotao.textContent;
    pacoteBotao.textContent = 'MONTANDO O PACOTE…';
    try {
      const pacote = await montarPacotePeregrinacao({
        paradas,
        trilha,
        waypoints,
        destino,
        lerImagem: (id) => storageFotos.lerImagem(id),
      });
      if (desmontado) return;
      const resultado = await compartilharArquivo({
        blob: new Blob([pacote.bytes], { type: 'application/zip' }),
        fileName: pacote.nomeArquivo,
        title: 'Caminhada Vanguard Field',
        texto: `${pacote.fotosIncluidas} foto(s) de parada e a trilha, com as coordenadas ao lado.`,
      });
      if (desmontado) return;
      const faltaram = pacote.fotosAusentes.length
        ? ` ${pacote.fotosAusentes.length} foto(s) não puderam ser lidas e ficaram de fora — estão listadas no LEIA-ME.`
        : '';
      fotoStatus.textContent = `${textoResultadoCompartilhamento(resultado, 'pacote')} ${pacote.fotosIncluidas} foto(s) e a trilha, em ${(pacote.tamanhoBytes / 1048576).toFixed(1)} MB.${faltaram}`;
    } catch (erro) {
      fotoStatus.textContent = erro?.message ?? 'Não foi possível montar o pacote da caminhada.';
    } finally {
      pacoteBotao.disabled = false;
      pacoteBotao.textContent = rotulo;
    }
  }

  const MIME_POR_EXTENSAO = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };

  function mimeDaFoto(arquivo) {
    if (arquivo?.type) return arquivo.type;
    // Parte dos Android devolve `type` vazio para o arquivo da câmera; sem esse
    // resgate a foto seria recusada como "não é imagem".
    const extensao = String(arquivo?.name ?? '').split('.').pop()?.toLowerCase();
    return MIME_POR_EXTENSAO[extensao] ?? '';
  }

  /** Fixo dedicado da parada: alta precisão e sem reaproveitar leitura velha. */
  function posicaoDaParada() {
    return new Promise((resolve) => {
      solicitarPosicao({
        mode: 'manual',
        onPosition: (leitura) => resolve(leitura),
        onError: () => resolve(null),
      });
    });
  }

  function descreverParada(parada) {
    const precisao = parada.precisaoM == null ? 'precisão não informada' : `±${Math.round(parada.precisaoM)} m`;
    const horario = Number.isFinite(Date.parse(parada.capturadaEm)) ? new Date(parada.capturadaEm).toLocaleString() : 'horário não registrado';
    return `${parada.mgrs ?? `${num(parada.lat, 5)}, ${num(parada.lon, 5)}`} · ${precisao}${parada.dentroDoLimite === false ? ' · FORA DO LIMITE' : ''} · ${horario}`;
  }

  let visorIndice = -1;
  let visorUrl = null;

  function liberarUrlDoVisor() {
    if (!visorUrl) return;
    // Sem revogar, cada foto aberta deixa os bytes presos na memória do
    // navegador até a página morrer.
    URL.revokeObjectURL(visorUrl);
    visorUrl = null;
  }

  function fecharVisor() {
    liberarUrlDoVisor();
    visorImagem.removeAttribute('src');
    visor.hidden = true;
    visorIndice = -1;
  }

  async function abrirVisor(indice) {
    const parada = paradas[indice];
    if (!parada) return;
    visorIndice = indice;
    visor.hidden = false;
    visorContador.textContent = `${indice + 1} de ${paradas.length}`;
    visorLegenda.textContent = descreverParada(parada);
    visorAnterior.disabled = indice <= 0;
    visorProxima.disabled = indice >= paradas.length - 1;

    liberarUrlDoVisor();
    visorImagem.removeAttribute('src');
    // Uma imagem por vez: carregar todas de uma peregrinação inteira encheria
    // a memória do aparelho sem necessidade.
    const leitura = await storageFotos.lerImagem(parada.id);
    if (desmontado || visorIndice !== indice) return;
    if (!leitura.ok) {
      visorLegenda.textContent = `${descreverParada(parada)} — a imagem não pôde ser lida: ${leitura.motivo}`;
      return;
    }
    visorUrl = URL.createObjectURL(new Blob([leitura.bytes], { type: parada.imagem?.mime ?? 'image/jpeg' }));
    visorImagem.src = visorUrl;
  }

  async function removerParadaAtual() {
    const parada = paradas[visorIndice];
    if (!parada) return;
    if (!window.confirm('Apagar esta foto de parada do aparelho? A ação não pode ser desfeita.')) return;
    const remocao = await storageFotos.remover(parada.id);
    if (desmontado) return;
    if (!remocao.ok) {
      fotoStatus.textContent = `A foto não pôde ser apagada: ${remocao.motivo}`;
      return;
    }
    paradas = paradas.filter((item) => item.id !== parada.id);
    fotoStatus.textContent = `Parada apagada. ${paradas.length} parada(s) no aparelho.`;
    fecharVisor();
    atualizarParadas();
  }

  function atualizarParadas() {
    empty(fotoLista);
    // A lista mostra as últimas; o visor navega por todas.
    for (const parada of paradas.slice(-8).reverse()) {
      const indice = paradas.indexOf(parada);
      fotoLista.append(h('li', { className: 'mapa__foto-linha' },
        h('button', {
          className: parada.dentroDoLimite === false ? 'mapa__foto-item is-alerta' : 'mapa__foto-item',
          type: 'button',
          onclick: () => abrirVisor(indice),
        }, `⛶ ${descreverParada(parada)}`),
      ));
    }
    atualizarMarcadores();
  }

  async function carregarParadas() {
    const resultado = await storageFotos.listar();
    if (desmontado) return;
    if (!resultado.ok) {
      fotoStatus.textContent = `As fotos guardadas não puderam ser lidas: ${resultado.motivo}`;
      return;
    }
    paradas = resultado.fotos;
    if (paradas.length) fotoStatus.textContent = `${paradas.length} parada(s) com foto no aparelho.`;
    atualizarParadas();
  }

  async function abrirCameraDaParada() {
    const avaliacaoAtual = avaliarPosicaoParada({ posicao });
    if (!avaliacaoAtual.utilizavel) {
      fotoStatus.textContent = 'Buscando um fixo antes de abrir a câmera; a foto precisa saber onde você está.';
      const obtida = await posicaoDaParada();
      if (desmontado) return;
      if (!obtida) {
        fotoStatus.textContent = 'Sem fixo de GPS. Ligue a localização, espere o fixo e tente de novo — a foto não é gravada sem coordenada.';
        return;
      }
      posicao = obtida;
      atualizarHud();
      atualizarMarcadores();
    }
    if (cameraNativaDisponivel()) {
      const captura = await capturarFotoDaParada();
      if (desmontado) return;
      if (captura.estado === RESULTADOS_CAPTURA.CAPTURADA) {
        await guardarFotoDaParada(captura.bytes, captura.mime, { salvouNaGaleria: captura.salvouNaGaleria });
        return;
      }
      if (captura.estado === RESULTADOS_CAPTURA.CANCELADA) {
        fotoStatus.textContent = 'Captura cancelada; nenhuma parada foi registrada.';
        return;
      }
      // Plugin ausente ou com falha: o `<input capture>` é o caminho provado, e
      // perder a foto porque um plugin faltou seria inaceitável em campo.
      fotoStatus.textContent = 'Câmera nativa indisponível; abrindo a câmera do navegador.';
    }
    fotoArquivo.value = '';
    fotoArquivo.click();
  }

  async function registrarFotoDaParada(arquivo) {
    if (!arquivo) return;
    try {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      await guardarFotoDaParada(bytes, mimeDaFoto(arquivo));
    } catch (erro) {
      fotoStatus.textContent = erro?.message ?? 'Não foi possível registrar esta foto de parada.';
    } finally {
      fotoArquivo.value = '';
    }
  }

  async function guardarFotoDaParada(bytes, mime, { salvouNaGaleria = null } = {}) {
    try {
      fotoStatus.textContent = 'Confirmando a posição da parada…';
      const fresca = await posicaoDaParada();
      if (desmontado) return;
      if (fresca) { posicao = fresca; atualizarHud(); }
      const resultado = criarRegistroFotoParada({
        id: `parada-${new Date().toISOString().replace(/[:.]/g, '-')}`,
        posicao,
        imagem: { mime, sizeBytes: bytes.byteLength },
        capturadaEm: Date.now(),
      });
      if (!resultado.ok) {
        fotoStatus.textContent = resultado.motivo;
        return;
      }
      const gravacao = await storageFotos.salvarFoto(resultado.registro, bytes);
      if (desmontado) return;
      if (!gravacao.ok) {
        fotoStatus.textContent = `A foto não foi guardada: ${gravacao.motivo}`;
        return;
      }
      paradas = [...paradas, { ...resultado.registro, sizeBytes: gravacao.sizeBytes }];
      // Só afirmamos a galeria quando o sistema confirmou a gravação.
      const notaGaleria = salvouNaGaleria === true
        ? ' Também foi salva na galeria do celular.'
        : salvouNaGaleria === false ? ' Não foi possível salvá-la na galeria; ela está guardada no app.' : '';
      fotoStatus.textContent = (resultado.registro.dentroDoLimite
        ? `Parada guardada em ${resultado.registro.mgrs ?? 'coordenada local'} com ${Math.round(resultado.registro.precisaoM)} m de precisão.`
        : `Parada guardada, mas com ${resultado.registro.precisaoM == null ? 'precisão desconhecida' : `${Math.round(resultado.registro.precisaoM)} m`} — acima dos ${resultado.registro.precisaoMaximaM} m pedidos. A foto não se perde; a ressalva fica no registro.`) + notaGaleria;
      atualizarParadas();
      // Abre a foto recém-guardada: a pessoa quer ver como ficou antes de seguir.
      abrirVisor(paradas.length - 1);
    } catch (erro) {
      fotoStatus.textContent = erro?.message ?? 'Não foi possível registrar esta foto de parada.';
    }
  }

  async function importarRegistro(arquivo) {
    if (!arquivo) return;
    try {
      const formato = detectarFormatoRegistro(arquivo).formato;
      const texto = await arquivo.text();
      const registro = formato === FORMATOS_REGISTRO.GPX
        ? importarRegistroGpx(texto)
        : formato === FORMATOS_REGISTRO.KML
          ? importarRegistroKml(texto)
          : importarRegistroLocal(texto);
      if (!window.confirm('Substituir a rota, os waypoints e o destino atuais pelo registro importado?')) return;
      trilha = registro.trilha;
      waypoints = registro.waypoints;
      destino = registro.destino;
      rotaAtiva = false;
      rotaPausada = false;
      await backgroundControle.parar();
      estado.set(CHAVES.TRILHA, trilha);
      estado.set(CHAVES.WAYPOINTS, waypoints);
      estado.set(CHAVES.DESTINO, destino);
      estado.set(CHAVES.ROTA_ATIVA, false);
      estado.set(CHAVES.ROTA_PAUSADA, false);
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
  stopRouteButton.onclick = pararRota;
  wakeButton.onclick = () => configurarWakeLock(!wakeAtivo);
  backgroundButton.onclick = alternarBackground;
  centerButton.onclick = centralizar;
  clearButton.onclick = limparTrilha;
  registroExportarButton.onclick = exportarRegistro;
  registroGpxButton.onclick = exportarRegistroGpxLocal;
  registroKmlButton.onclick = exportarRegistroKmlLocal;
  registroImportarButton.onclick = () => registroArquivo.click();
  registroArquivo.onchange = () => importarRegistro(registroArquivo.files?.[0]);
  trajetoBotao.onclick = alternarTrajeto;
  paradaBotao.onclick = () => alternarParada(TIPOS_PARADA.DESCANSO);
  pernoiteBotao.onclick = () => alternarParada(TIPOS_PARADA.PERNOITE);
  visorFechar.onclick = fecharVisor;
  visorAnterior.onclick = () => abrirVisor(visorIndice - 1);
  visorProxima.onclick = () => abrirVisor(visorIndice + 1);
  visorRemover.onclick = removerParadaAtual;
  fotoButton.onclick = abrirCameraDaParada;
  pacoteBotao.onclick = exportarPacoteDaCaminhada;
  fotoArquivo.onchange = () => registrarFotoDaParada(fotoArquivo.files?.[0]);
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
      : selectUso.value === 'mar'
        ? 'Modo Mar: use a posição como referência; confirme a navegação em carta e avisos oficiais.'
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
    onPosition: registrarPosicao,
    onError: (erro) => {
      estadoGps.textContent = erro?.code === 1 ? 'PERMISSÃO NEGADA' : 'GPS INDISPONÍVEL';
      sheetStatus.textContent = erro?.code === 1 ? 'Ative a permissão de localização para usar o mapa ao vivo.' : 'Não foi possível obter um fixo agora.';
    },
    onState: exibirEstadoGps,
  });

  if (rotaAtiva) pararGps.setMode('trilha');

  const aoMudarVisibilidade = () => {
    if (document.hidden) {
      mapa?.stop();
      atualizarWatcherForeground();
      return;
    }
    mapa?.resize();
    atualizarWatcherForeground();
    atualizarHud();
    atualizarSheet();
    atualizarMarcadores();
    if (rotaAtiva && wakeAtivo) configurarWakeLock(true);
  };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
  const intervaloFrescor = window.setInterval(() => {
    if (!document.hidden) atualizarHud();
  }, 10_000);
  (async () => {
    const base = BASES[selectBase.value];
    const fontesIniciais = {
      base: { type: 'raster', tiles: base.tiles, tileSize: base.tileSize ?? 256, maxzoom: base.maxzoom, attribution: base.creditos },
    };
    const camadasIniciais = [{ id: 'base', type: 'raster', source: 'base', paint: base.paint ?? {} }];
    if (ROTULOS) {
      fontesIniciais.rotulos = { type: 'raster', tiles: ROTULOS.tiles, tileSize: ROTULOS.tileSize ?? 256, maxzoom: ROTULOS.maxzoom, attribution: ROTULOS.creditos };
      camadasIniciais.push({ id: 'rotulos', type: 'raster', source: 'rotulos', paint: { 'raster-opacity': 0.9 } });
    }
    // A página descreve a vista; quem instancia o motor é o Map Engine.
    try {
      motorMapa = await criarMotorMapa({ providerId: selectBase.value, carregarMapLibre });
    } catch {
      motorMapa = null;
    }
    if (desmontado) { motorMapa?.desmontar(); motorMapa = null; return; }
    if (!motorMapa) {
      canvas.append(h('div', { className: 'mapa__falha' }, 'O motor de mapa não carregou. A bússola e o registro local continuam disponíveis.'));
      return;
    }
    mapa = motorMapa.montar({
      container: canvas,
      style: { version: 8, sources: fontesIniciais, layers: camadasIniciais },
      center: posicao ? [posicao.lon, posicao.lat] : CENTRO_FALLBACK,
      zoom: posicao ? 15 : 12,
      attributionControl: { compact: true }
    });
    const MapLibre = motorMapa.MapLibre;
    if (MapLibre?.NavigationControl) mapa.addControl(new MapLibre.NavigationControl({ showCompass: false }), 'bottom-right');
    if (MapLibre?.ScaleControl) mapa.addControl(new MapLibre.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

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

    function resumoUltimaPreparacao(meta) {
      if (!meta?.preparadoEm) return '';
      const data = new Date(meta.preparadoEm).toLocaleString();
      const base = meta.baseNome || meta.base || 'base não identificada';
      const salvos = Number(meta.tilesSalvos);
      const solicitados = Number(meta.urlsSolicitadas);
      const proporcao = Number.isFinite(salvos) && Number.isFinite(solicitados) ? ` · ${salvos}/${solicitados} salvos na última tentativa` : '';
      const bounds = meta.bounds && [meta.bounds.south, meta.bounds.west, meta.bounds.north, meta.bounds.east].every((valor) => Number.isFinite(Number(valor)))
        ? ` · área ${num(meta.bounds.south, 2)},${num(meta.bounds.west, 2)} → ${num(meta.bounds.north, 2)},${num(meta.bounds.east, 2)}`
        : '';
      const zoom = meta.zoom ? ` · zoom ${num(meta.zoom.minimo, 0)}–${num(meta.zoom.maximo, 0)}` : '';
      return `Último preparo: ${base}${proporcao}${zoom}${bounds} · ${data}.`;
    }

    async function atualizarCacheOffline() {
      try {
        const status = await mensagemOffline('CACHE_STATUS');
        const meta = estado.get(CHAVES.MAPAS_OFFLINE, null);
        const tiles = Number(status?.tiles) || 0;
        if (tiles > 0) {
          offlineStatus.textContent = `${tiles} tiles no cache local deste aparelho. ${resumoUltimaPreparacao(meta)} O total é agregado; prepare novamente ao mudar de área ou base.`;
        } else if (meta?.preparadoEm) {
          offlineStatus.textContent = `${resumoUltimaPreparacao(meta)} O cache está vazio; ele pode ter sido limpo pelo sistema. Prepare novamente.`;
        } else {
          offlineStatus.textContent = 'Nenhum tile confirmado no cache local. Prepare a área visível enquanto estiver conectado.';
        }
      } catch {
        offlineStatus.textContent = 'Status do cache indisponível. A preparação de área continuará disponível quando o worker responder.';
      }
    }

    offlineButton.onclick = async () => {
      if (!navigator.serviceWorker) {
        offlineStatus.textContent = 'Service worker indisponível neste navegador; a rota local continua disponível.';
        return;
      }
      const baseAtual = BASES[selectBase.value];
      const tilesOffline = ROTULOS
        ? [...(baseAtual.tiles ?? []), ...(ROTULOS.tiles ?? [])]
        : baseAtual.tiles;
      const plano = planejarTilesDoViewport(mapa.getBounds(), { ...baseAtual, tiles: tilesOffline, zoomAtual: mapa.getZoom() });
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
          camadas: ROTULOS ? [baseAtual.id, ROTULOS.id] : [baseAtual.id],
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
          ? `${salvos}/${urls.length} tiles preparados para ${baseAtual.nome} e nomes/limites; a área foi reduzida ao limite local. Aproxime o mapa e prepare novamente.`
          : `${salvos}/${urls.length} tiles preparados para ${baseAtual.nome} e nomes/limites. Mova o mapa e prepare outra área se necessário.`;
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
      mapa.addLayer({ id: 'vanguard-marcadores', type: 'circle', source: 'vanguard-marcadores', paint: { 'circle-radius': ['match', ['get', 'tipo'], 'voce', 8, 'destino', 7, 'parada', 7, 6], 'circle-color': ['match', ['get', 'tipo'], 'voce', '#80e0ff', 'destino', '#ffb000', 'parada', '#8bff3f', '#ffb000'], 'circle-stroke-color': '#11150e', 'circle-stroke-width': 2 } });
      redesenharGrade();
      atualizarMarcadores();
    });

    function redesenharGrade() {
      if (!mapa?.getSource('vanguard-grade')) return;
      try { gradeAtual = gerarGrade(mapa.getBounds(), mapa.getZoom()); } catch { gradeAtual = { type: 'FeatureCollection', features: [] }; }
      versaoGrade += 1;
      mapa.getSource('vanguard-grade').setData(gradeAtual);
    }

    function desenharRotulos() {
      if (!mapa) return;
      const largura = canvas.clientWidth;
      const altura = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const centro = mapa.getCenter?.() || {};
      const chave = chaveDesenhoGrade({
        center: centro,
        zoom: mapa.getZoom?.(),
        bearing: mapa.getBearing?.(),
        pitch: mapa.getPitch?.(),
        largura,
        altura,
        dpr,
        versaoGrade,
      });
      if (chave === ultimaChaveRotulos) return;
      rotulos.width = largura * dpr;
      rotulos.height = altura * dpr;
      const ctx = rotulos.getContext('2d');
      if (!ctx) return;
      ultimaChaveRotulos = chave;
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
      mapa.addLayer({ id: 'base', type: 'raster', source: 'base', paint: novaBase.paint ?? {} }, 'vanguard-grade');
    };
  })();

  atualizarHud();
  atualizarDestino();
  atualizarSheet();
  atualizarTrajeto();
  carregarParadas();
  // O cronômetro mostra segundos na primeira hora; um tique por segundo só
  // enquanto há trajeto aberto e a tela está visível.
  tickTrajeto = window.setInterval(() => {
    if (document.hidden || !resumoTrajeto(trajeto).ativo) return;
    atualizarTrajeto();
    avaliarExposicaoAtual();
  }, 1000);
  return { elemento: raiz, desmontar: () => { desmontado = true; liberarUrlDoVisor(); window.clearInterval(tickTrajeto); controleCentralizacao.desmontar(); backgroundControle.desmontar(); window.clearInterval(intervaloFrescor); document.removeEventListener('visibilitychange', aoMudarVisibilidade); configurarWakeLock(false); pararGps(); if (motorMapa) { try { motorMapa.desmontar(); } catch {} motorMapa = null; mapa = null; } else if (mapa) { try { mapa.remove(); } catch {} mapa = null; } } };
}
