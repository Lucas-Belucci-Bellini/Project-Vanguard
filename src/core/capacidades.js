export const ESTADOS_CAPACIDADE = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  DENIED: 'DENIED',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
});

const ESTADOS_VALIDOS = new Set(Object.values(ESTADOS_CAPACIDADE));

export function estadoCapacidade({ supported = false, available = false, denied = false } = {}) {
  if (!supported) return ESTADOS_CAPACIDADE.NOT_SUPPORTED;
  if (denied) return ESTADOS_CAPACIDADE.DENIED;
  return available ? ESTADOS_CAPACIDADE.AVAILABLE : ESTADOS_CAPACIDADE.UNAVAILABLE;
}

function resultado(id, nome, estado, detalhe) {
  return { id, nome, estado: ESTADOS_VALIDOS.has(estado) ? estado : ESTADOS_CAPACIDADE.UNAVAILABLE, detalhe };
}

function plataformaNativa(capacitorApi) {
  try {
    return capacitorApi?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function possuiGeolocation(navigatorApi, capacitorApi) {
  return plataformaNativa(capacitorApi) || Boolean(navigatorApi && 'geolocation' in navigatorApi);
}

function estadoStorage(storageApi) {
  if (!storageApi || typeof storageApi.getItem !== 'function') return ESTADOS_CAPACIDADE.NOT_SUPPORTED;
  try {
    storageApi.getItem('__vanguard_capability_probe__');
    return ESTADOS_CAPACIDADE.AVAILABLE;
  } catch {
    return ESTADOS_CAPACIDADE.UNAVAILABLE;
  }
}

/**
 * Detecta apenas capacidades observáveis pelo ambiente atual.
 * A presença da API não prova que o hardware, sinal, permissão ou quota
 * estejam disponíveis; os detalhes deixam essa fronteira explícita.
 */
export function detectarCapacidades({
  navigatorApi = globalThis.navigator,
  capacitorApi = globalThis.Capacitor,
  storageApi = globalThis.localStorage,
  orientationApi = globalThis.DeviceOrientationEvent,
  gpsPermission,
} = {}) {
  const gpsSupported = possuiGeolocation(navigatorApi, capacitorApi);
  const gpsDenied = gpsPermission === 'NEGADA' || gpsPermission === 'DENIED';
  const gpsFonte = plataformaNativa(capacitorApi)
    ? 'bridge Capacitor foreground'
    : 'API Web de geolocalização';
  const orientationSupported = typeof orientationApi !== 'undefined';
  const networkSupported = typeof navigatorApi?.onLine === 'boolean';
  const batterySupported = typeof navigatorApi?.getBattery === 'function';
  const shareSupported = typeof navigatorApi?.share === 'function';
  const storageState = estadoStorage(storageApi);

  return [
    resultado(
      'gps',
      'GPS/GNSS',
      estadoCapacidade({ supported: gpsSupported, available: gpsSupported, denied: gpsDenied }),
      gpsSupported ? `${gpsFonte}; permissão e sinal dependem do aparelho` : 'API de geolocalização ausente',
    ),
    resultado(
      'compass',
      'Bússola / orientação',
      estadoCapacidade({ supported: orientationSupported, available: orientationSupported }),
      orientationSupported ? 'API detectada; sensor físico e calibração dependem do aparelho' : 'API de orientação ausente',
    ),
    resultado(
      'storage',
      'Armazenamento local',
      storageState,
      storageState === ESTADOS_CAPACIDADE.AVAILABLE ? 'localStorage consultável; quota física não confirmada' : 'localStorage indisponível ou bloqueado',
    ),
    resultado(
      'network',
      'Rede',
      estadoCapacidade({ supported: networkSupported, available: navigatorApi?.onLine === true }),
      networkSupported ? (navigatorApi.onLine ? 'conectividade indicada pelo navegador' : 'aparelho sem conectividade indicada agora') : 'estado de rede não exposto pelo ambiente',
    ),
    resultado(
      'battery',
      'Bateria',
      estadoCapacidade({ supported: batterySupported, available: batterySupported }),
      batterySupported ? 'API de bateria disponível; consumo de campo não inferido' : 'API de bateria não suportada',
    ),
    resultado(
      'share',
      'Compartilhamento',
      estadoCapacidade({ supported: shareSupported, available: shareSupported }),
      shareSupported ? 'Web Share disponível; ação exige confirmação da pessoa' : 'Web Share não suportado neste ambiente',
    ),
  ];
}
