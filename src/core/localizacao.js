import { estado, CHAVES } from './estado.js';

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
    timestamp: leitura?.timestamp ?? Date.now()
  };
}

export function precisaoLabel(accuracy) {
  return Number.isFinite(accuracy) ? `±${Math.round(accuracy)} m` : 'precisão indisponível';
}

export function velocidadeLabel(speed) {
  if (!Number.isFinite(speed) || speed < 0) return '—';
  return `${(speed * 3.6).toFixed(1)} km/h`;
}

export function iniciarAcompanhamento({ onPosition = () => {}, onError = () => {} } = {}) {
  if (!('geolocation' in navigator)) {
    const erro = new Error('Este dispositivo não oferece geolocalização.');
    onError(erro);
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (leitura) => {
      const posicao = normalizarPosicao(leitura);
      if (!Number.isFinite(posicao.lat) || !Number.isFinite(posicao.lon)) return;
      estado.set(CHAVES.LOCAL, posicao);
      onPosition(posicao);
    },
    (erro) => onError(erro),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
  );

  return () => navigator.geolocation.clearWatch(id);
}

export function solicitarPosicao({ onPosition = () => {}, onError = () => {} } = {}) {
  if (!('geolocation' in navigator)) {
    onError(new Error('Este dispositivo não oferece geolocalização.'));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (leitura) => {
      const posicao = normalizarPosicao(leitura);
      estado.set(CHAVES.LOCAL, posicao);
      onPosition(posicao);
    },
    onError,
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
  );
}
