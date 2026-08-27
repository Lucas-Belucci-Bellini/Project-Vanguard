import { estado, CHAVES } from './estado.js';

/**
 * Política de energia compartilhada pela PWA e pela camada Capacitor.
 * Os valores são preferências para o sistema operacional, não intervalos
 * garantidos. Alta precisão só é usada quando a pessoa inicia uma trilha ou
 * pede uma posição de emergência.
 */
export const POLITICA_LOCALIZACAO = {
  consulta: { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000, minDistanceM: 0 },
  cidade: { enableHighAccuracy: false, maximumAge: 15000, timeout: 12000, minDistanceM: 12 },
  trilha: { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000, minDistanceM: 3 },
  bussola: { enableHighAccuracy: false, maximumAge: 5000, timeout: 12000, minDistanceM: 0 },
  emergencia: { enableHighAccuracy: true, maximumAge: 0, timeout: 20000, minDistanceM: 0 },
};

let pluginNativoPromise;

export function opcoesLocalizacao(modo = 'cidade') {
  return { ...(POLITICA_LOCALIZACAO[modo] ?? POLITICA_LOCALIZACAO.cidade) };
}

function capacitorNativo() {
  return globalThis.Capacitor?.isNativePlatform?.() === true;
}

export function fonteLocalizacao() {
  if (capacitorNativo()) return 'CAPACITOR GEOLOCATION · FOREGROUND';
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) return 'WEB GEOLOCATION';
  return 'INDISPONÍVEL';
}

async function geolocationNativo() {
  pluginNativoPromise ??= import('@capacitor/geolocation').then(({ Geolocation }) => Geolocation);
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

export function iniciarAcompanhamento({ mode = 'cidade', onPosition = () => {}, onError = () => {}, onState = () => {} } = {}) {
  const possuiWeb = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const podeTentarNativo = capacitorNativo();
  if (!possuiWeb && !podeTentarNativo) {
    onError(erroSemGeolocalizacao());
    return () => {};
  }

  let modoAtual = mode;
  let ultimaAceita = null;
  let webId = null;
  let nativeId = null;
  let nativeApi = null;
  let encerrado = false;
  let ciclo = 0;

  function aceitarPosicao(leitura, opcoes) {
    const posicao = normalizarPosicao(leitura);
    if (!Number.isFinite(posicao.lat) || !Number.isFinite(posicao.lon)) return;
    if (ultimaAceita && opcoes.minDistanceM > 0 && distanciaLocalM(ultimaAceita, posicao) < opcoes.minDistanceM) return;
    ultimaAceita = posicao;
    estado.set(CHAVES.LOCAL, posicao);
    onPosition(posicao);
  }

  async function iniciarWatch() {
    if (encerrado) return;
    const token = ++ciclo;
    const opcoes = opcoesLocalizacao(modoAtual);
    if (podeTentarNativo) {
      try {
        const geolocation = await geolocationNativo();
        await garantirPermissaoNativa(geolocation);
        if (encerrado || token !== ciclo) return;
        nativeApi = geolocation;
        onState({ modo: modoAtual, opcoes, fonte: 'CAPACITOR_GEOLOCATION' });
        nativeId = await geolocation.watchPosition({
          enableHighAccuracy: opcoes.enableHighAccuracy,
          maximumAge: opcoes.maximumAge,
          timeout: opcoes.timeout,
        }, (leitura, erro) => {
          if (erro) onError(erro);
          if (leitura) aceitarPosicao(leitura, opcoes);
        });
        if (encerrado || token !== ciclo) {
          await geolocation.clearWatch({ id: nativeId }).catch(() => {});
          nativeId = null;
        }
        return;
      } catch (erro) {
        if (encerrado || token !== ciclo) return;
        if (erro?.code === 1 || !possuiWeb) {
          onError(erro);
          return;
        }
        /* Se o bridge nativo não responder, o WebView tenta seu fallback. */
      }
    }
    if (!possuiWeb || encerrado || token !== ciclo) {
      if (!podeTentarNativo) onError(erroSemGeolocalizacao());
      return;
    }
    onState({ modo: modoAtual, opcoes, fonte: 'WEB_GEOLOCATION' });
    webId = navigator.geolocation.watchPosition(
      (leitura) => aceitarPosicao(leitura, opcoes),
      (erro) => onError(erro),
      {
        enableHighAccuracy: opcoes.enableHighAccuracy,
        maximumAge: opcoes.maximumAge,
        timeout: opcoes.timeout,
      },
    );
  }

  iniciarWatch();

  const parar = () => {
    encerrado = true;
    ciclo += 1;
    if (webId !== null && possuiWeb) navigator.geolocation.clearWatch(webId);
    webId = null;
    if (nativeApi && nativeId !== null) nativeApi.clearWatch({ id: nativeId }).catch(() => {});
    nativeId = null;
  };

  parar.setMode = (novoModo = 'cidade') => {
    if (encerrado || novoModo === modoAtual) return;
    if (webId !== null && possuiWeb) navigator.geolocation.clearWatch(webId);
    if (nativeApi && nativeId !== null) nativeApi.clearWatch({ id: nativeId }).catch(() => {});
    webId = null;
    nativeId = null;
    modoAtual = novoModo;
    ultimaAceita = null;
    iniciarWatch();
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
