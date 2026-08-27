import { estado, CHAVES } from './estado.js';

/**
 * Política de energia compartilhada pela PWA e pela camada Capacitor.
 * Os valores são preferências para o sistema operacional, não intervalos
 * garantidos. Alta precisão só é usada quando a pessoa inicia uma trilha ou
 * pede uma posição de emergência ou usa a centralização manual para tentar um
 * novo fixo de maior precisão.
 */
export const POLITICA_LOCALIZACAO = {
  consulta: { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000, minDistanceM: 0 },
  manual: { enableHighAccuracy: true, maximumAge: 0, timeout: 20000, minDistanceM: 0 },
  cidade: { enableHighAccuracy: false, maximumAge: 15000, timeout: 12000, minDistanceM: 12 },
  trilha: { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000, minDistanceM: 3 },
  bussola: { enableHighAccuracy: false, maximumAge: 5000, timeout: 12000, minDistanceM: 0 },
  emergencia: { enableHighAccuracy: true, maximumAge: 0, timeout: 20000, minDistanceM: 0 },
};

let pluginNativoPromise;

export function opcoesLocalizacao(modo = 'cidade') {
  return { ...(POLITICA_LOCALIZACAO[modo] ?? POLITICA_LOCALIZACAO.cidade) };
}

function capacitorNativo(capacitorApi = globalThis.Capacitor) {
  try {
    return capacitorApi?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function fonteLocalizacao() {
  if (capacitorNativo()) return 'CAPACITOR GEOLOCATION · FOREGROUND';
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) return 'WEB GEOLOCATION';
  return 'INDISPONÍVEL';
}

async function geolocationNativo(override) {
  if (override) return override;
  pluginNativoPromise ??= import('@capacitor/geolocation').then(({ Geolocation }) => ({
    checkPermissions: (...args) => Geolocation.checkPermissions(...args),
    requestPermissions: (...args) => Geolocation.requestPermissions(...args),
    getCurrentPosition: (...args) => Geolocation.getCurrentPosition(...args),
    watchPosition: (...args) => Geolocation.watchPosition(...args),
    clearWatch: (...args) => Geolocation.clearWatch(...args),
  }));
  return pluginNativoPromise;
}

async function garantirPermissaoNativa(geolocation) {
  let status = await geolocation.checkPermissions();
  if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
    status = await geolocation.requestPermissions({ permissions: ['location'] });
  }
  if (status.location !== 'granted') {
    const erro = new Error('Permissão de localização não concedida no aparelho.');
    erro.code = 1;
    throw erro;
  }
  return status;
}

function erroSemGeolocalizacao() {
  return new Error('Este dispositivo não oferece geolocalização.');
}

/**
 * Normaliza a leitura nativa do aparelho para o contrato interno do Vanguard.
 * A posição contém apenas dados necessários à navegação local; o envio externo
 * nunca é automático.
 */
export function normalizarPosicao(leitura) {
  const c = leitura?.coords ?? leitura;
  return {
    lat: Number(c.latitude ?? c.lat),
    lon: Number(c.longitude ?? c.lon),
    accuracy: Number.isFinite(c.accuracy) ? c.accuracy : null,
    altitude: Number.isFinite(c.altitude) ? c.altitude : null,
    speed: Number.isFinite(c.speed) && c.speed >= 0 ? c.speed : null,
    heading: Number.isFinite(c.heading) && c.heading >= 0 ? c.heading : null,
    timestamp: leitura?.timestamp ?? Date.now(),
  };
}

export function precisaoLabel(accuracy) {
  return Number.isFinite(accuracy) ? `±${Math.round(accuracy)} m` : 'precisão indisponível';
}

export function velocidadeLabel(speed) {
  if (!Number.isFinite(speed) || speed < 0) return '—';
  return `${(speed * 3.6).toFixed(1)} km/h`;
}

export function idadePosicaoMs(posicao, agora = Date.now()) {
  const instante = Number(posicao?.timestamp ?? posicao?.createdAt);
  if (!Number.isFinite(instante) || !Number.isFinite(agora) || instante < 0 || agora < instante) return null;
  return agora - instante;
}

export function frescorPosicao(posicao, agora = Date.now()) {
  const idade = idadePosicaoMs(posicao, agora);
  if (idade == null) return 'indisponível';
  if (idade < 60_000) return 'atual';
  if (idade < 5 * 60_000) return 'recente';
  if (idade < 24 * 60 * 60_000) return 'antigo';
  return 'muito antigo';
}

export function idadePosicaoLabel(posicao, agora = Date.now()) {
  const idade = idadePosicaoMs(posicao, agora);
  if (idade == null) return 'idade indisponível';
  if (idade < 10_000) return 'agora';
  const minutos = Math.floor(idade / 60_000);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} d`;
}

export function distanciaLocalM(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lon) || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return Infinity;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function iniciarAcompanhamento({ mode = 'cidade', onPosition = () => {}, onError = () => {}, onState = () => {}, navigatorApi = globalThis.navigator, capacitorApi = globalThis.Capacitor, geolocationApi } = {}) {
  const possuiWeb = Boolean(navigatorApi && 'geolocation' in navigatorApi);
  const podeTentarNativo = capacitorNativo(capacitorApi);
  if (!possuiWeb && !podeTentarNativo) {
    const erro = erroSemGeolocalizacao();
    onState({ status: 'UNAVAILABLE', modo: mode, erro });
    onError(erro);
    return () => {};
  }

  let modoAtual = mode;
  let ultimaAceita = null;
  let webId = null;
  let nativeId = null;
  let nativeApi = null;
  let encerrado = false;
  let ciclo = 0;
  let pausado = false;

  function emitir(status, extras = {}) {
    if (encerrado) return;
    onState({ status, modo: modoAtual, ...extras });
  }

  function sinalizarErro(erro, fonte = 'INDISPONÍVEL') {
    if (encerrado || pausado) return;
    emitir('ERROR', { erro, fonte });
    onError(erro);
  }

  function aceitarPosicao(leitura, opcoes) {
    if (pausado || encerrado) return;

    const posicao = normalizarPosicao(leitura);
    if (!Number.isFinite(posicao.lat) || !Number.isFinite(posicao.lon)) return;
    if (ultimaAceita && opcoes.minDistanceM > 0 && distanciaLocalM(ultimaAceita, posicao) < opcoes.minDistanceM) return;
    ultimaAceita = posicao;
    estado.set(CHAVES.LOCAL, posicao);
    onPosition(posicao);
  }

  function limparWatchers() {
    if (webId !== null && possuiWeb) navigatorApi.geolocation.clearWatch(webId);
    webId = null;
    if (nativeApi && nativeId !== null) nativeApi.clearWatch({ id: nativeId }).catch(() => {});
    nativeId = null;
  }

  async function iniciarWatch() {
    if (encerrado || pausado) return;
    const token = ++ciclo;
    const opcoes = opcoesLocalizacao(modoAtual);
    if (podeTentarNativo) {
      try {
        const geolocation = await geolocationNativo(geolocationApi);
        await garantirPermissaoNativa(geolocation);
        if (encerrado || token !== ciclo) return;
        nativeApi = geolocation;
        emitir('STARTING', { opcoes, fonte: 'CAPACITOR_GEOLOCATION' });
        nativeId = await geolocation.watchPosition({
          enableHighAccuracy: opcoes.enableHighAccuracy,
          maximumAge: opcoes.maximumAge,
          timeout: opcoes.timeout,
        }, (leitura, erro) => {
          if (erro) sinalizarErro(erro, 'CAPACITOR_GEOLOCATION');
          if (leitura) aceitarPosicao(leitura, opcoes);
        });
        if (encerrado || token !== ciclo || pausado) {
          await geolocation.clearWatch({ id: nativeId }).catch(() => {});
          nativeId = null;
          return;
        }
        emitir('ACTIVE', { opcoes, fonte: 'CAPACITOR_GEOLOCATION' });
        return;
      } catch (erro) {
        if (encerrado || token !== ciclo) return;
        if (erro?.code === 1 || !possuiWeb) {
          sinalizarErro(erro, 'CAPACITOR_GEOLOCATION');
          return;
        }
        /* Se o bridge nativo não responder, o WebView tenta seu fallback. */
      }
    }
    if (!possuiWeb || encerrado || token !== ciclo) {
      if (!podeTentarNativo) sinalizarErro(erroSemGeolocalizacao(), 'WEB_GEOLOCATION');
      return;
    }
    emitir('STARTING', { opcoes, fonte: 'WEB_GEOLOCATION' });
    webId = navigatorApi.geolocation.watchPosition(
      (leitura) => aceitarPosicao(leitura, opcoes),
      (erro) => sinalizarErro(erro, 'WEB_GEOLOCATION'),
      {
        enableHighAccuracy: opcoes.enableHighAccuracy,
        maximumAge: opcoes.maximumAge,
        timeout: opcoes.timeout,
      },
    );
    emitir('ACTIVE', { opcoes, fonte: 'WEB_GEOLOCATION' });
  }

  iniciarWatch();

  const parar = () => {
    if (encerrado) return;
    encerrado = true;
    ciclo += 1;
    limparWatchers();
    onState({ status: 'STOPPED', modo: modoAtual });
  };

  parar.setPaused = (novoEstado = true) => {
    if (encerrado || Boolean(novoEstado) === pausado) return;
    pausado = Boolean(novoEstado);
    ciclo += 1;
    limparWatchers();
    if (pausado) {
      onState({ status: 'PAUSED', modo: modoAtual, fonte: 'FOREGROUND_ONLY' });
      return;
    }
    ultimaAceita = null;
    emitir('STARTING', { fonte: 'FOREGROUND_ONLY' });
    iniciarWatch();
  };

  parar.setMode = (novoModo = 'cidade') => {
    if (encerrado || novoModo === modoAtual) return;
    ciclo += 1;
    limparWatchers();
    modoAtual = novoModo;
    ultimaAceita = null;
    if (!pausado) iniciarWatch();
  };

  return parar;
}

export function solicitarPosicao({ mode = 'consulta', onPosition = () => {}, onError = () => {} } = {}) {
  const possuiWeb = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const podeTentarNativo = capacitorNativo();
  if (!possuiWeb && !podeTentarNativo) {
    onError(erroSemGeolocalizacao());
    return;
  }
  const opcoes = opcoesLocalizacao(mode);

  (async () => {
    if (podeTentarNativo) {
      try {
        const geolocation = await geolocationNativo();
        await garantirPermissaoNativa(geolocation);
        const leitura = await geolocation.getCurrentPosition({
          enableHighAccuracy: opcoes.enableHighAccuracy,
          maximumAge: opcoes.maximumAge,
          timeout: opcoes.timeout,
        });
        const posicao = normalizarPosicao(leitura);
        if (!Number.isFinite(posicao.lat) || !Number.isFinite(posicao.lon)) throw new Error('O aparelho retornou uma posição inválida.');
        estado.set(CHAVES.LOCAL, posicao);
        onPosition(posicao);
        return;
      } catch (erro) {
        if (erro?.code === 1 || !possuiWeb) {
          onError(erro);
          return;
        }
      }
    }
    navigator.geolocation.getCurrentPosition(
      (leitura) => {
        const posicao = normalizarPosicao(leitura);
        if (!Number.isFinite(posicao.lat) || !Number.isFinite(posicao.lon)) {
          onError(new Error('O aparelho retornou uma posição inválida.'));
          return;
        }
        estado.set(CHAVES.LOCAL, posicao);
        onPosition(posicao);
      },
      onError,
      {
        enableHighAccuracy: opcoes.enableHighAccuracy,
        maximumAge: opcoes.maximumAge,
        timeout: opcoes.timeout,
      },
    );
  })().catch(onError);
}
