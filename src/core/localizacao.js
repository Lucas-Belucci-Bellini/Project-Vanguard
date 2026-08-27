import { estado, CHAVES } from './estado.js';

/**
 * Política de energia compartilhada pela PWA e pela futura camada Capacitor.
 * Os valores são conservadores: alta precisão só é usada quando a pessoa
 * inicia uma trilha ou pede uma posição de emergência.
 */
export const POLITICA_LOCALIZACAO = {
  consulta: { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000, minDistanceM: 0 },
  cidade: { enableHighAccuracy: false, maximumAge: 15000, timeout: 12000, minDistanceM: 12 },
  trilha: { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000, minDistanceM: 3 },
  bussola: { enableHighAccuracy: false, maximumAge: 5000, timeout: 12000, minDistanceM: 0 },
  emergencia: { enableHighAccuracy: true, maximumAge: 0, timeout: 20000, minDistanceM: 0 },
};

export function opcoesLocalizacao(modo = 'cidade') {
  return { ...(POLITICA_LOCALIZACAO[modo] ?? POLITICA_LOCALIZACAO.cidade) };
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
  if (!('geolocation' in navigator)) {
    const erro = new Error('Este dispositivo não oferece geolocalização.');
    onError(erro);
    return () => {};
  }

  let modoAtual = mode;
  let ultimaAceita = null;
  let id = null;
  let encerrado = false;

  function iniciarWatch() {
    if (encerrado) return;
    const opcoes = opcoesLocalizacao(modoAtual);
    onState({ modo: modoAtual, opcoes });
    id = navigator.geolocation.watchPosition(
      (leitura) => {
        const posicao = normalizarPosicao(leitura);
        if (!Number.isFinite(posicao.lat) || !Number.isFinite(posicao.lon)) return;
        if (ultimaAceita && opcoes.minDistanceM > 0 && distanciaLocalM(ultimaAceita, posicao) < opcoes.minDistanceM) return;
        ultimaAceita = posicao;
        estado.set(CHAVES.LOCAL, posicao);
        onPosition(posicao);
      },
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
    if (id !== null) navigator.geolocation.clearWatch(id);
    id = null;
  };

  parar.setMode = (novoModo = 'cidade') => {
    if (encerrado || novoModo === modoAtual) return;
    if (id !== null) navigator.geolocation.clearWatch(id);
    id = null;
    modoAtual = novoModo;
    ultimaAceita = null;
    iniciarWatch();
  };

  return parar;
}

export function solicitarPosicao({ mode = 'consulta', onPosition = () => {}, onError = () => {} } = {}) {
  if (!('geolocation' in navigator)) {
    onError(new Error('Este dispositivo não oferece geolocalização.'));
    return;
  }
  const opcoes = opcoesLocalizacao(mode);
  navigator.geolocation.getCurrentPosition(
    (leitura) => {
      const posicao = normalizarPosicao(leitura);
      if (!Number.isFinite(posicao.lat) || !Number.isFinite(posicao.lon)) return;
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
}
