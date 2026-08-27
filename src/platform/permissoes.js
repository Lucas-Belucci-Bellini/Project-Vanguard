export const ESTADOS_PERMISSAO = Object.freeze({
  CONCEDIDA: 'CONCEDIDA',
  NEGADA: 'NEGADA',
  NAO_SOLICITADA: 'NÃO SOLICITADA',
  INDISPONIVEL: 'INDISPONÍVEL',
  BROWSER_DEPENDENT: 'BROWSER DEPENDENT',
});

function nativo(capacitorApi) {
  try {
    return capacitorApi?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function normalizarPermissaoGps(status) {
  const localizacao = status?.location;
  if (localizacao === 'granted') return ESTADOS_PERMISSAO.CONCEDIDA;
  if (localizacao === 'denied') return ESTADOS_PERMISSAO.NEGADA;
  if (localizacao === 'prompt' || localizacao === 'prompt-with-rationale') return ESTADOS_PERMISSAO.NAO_SOLICITADA;
  return ESTADOS_PERMISSAO.INDISPONIVEL;
}

async function apiGeolocationNativa(geolocationApi) {
  if (geolocationApi) return geolocationApi;
  try {
    const modulo = await import('@capacitor/geolocation');
    /* O proxy Capacitor pode expor `then`; envolvê-lo evita assimilação como Promise. */
    return { checkPermissions: (...args) => modulo.Geolocation.checkPermissions(...args) };
  } catch {
    return null;
  }
}

/**
 * Apenas lê a permissão atual; nunca dispara prompt ou requestPermissions.
 * No Capacitor, a fonte é checkPermissions do plugin nativo. Na Web, usa a
 * Permissions API quando o navegador a expõe.
 */
export async function lerPermissaoGps({
  navigatorApi = globalThis.navigator,
  capacitorApi = globalThis.Capacitor,
  geolocationApi,
} = {}) {
  if (nativo(capacitorApi)) {
    const api = await apiGeolocationNativa(geolocationApi);
    if (!api || typeof api.checkPermissions !== 'function') return ESTADOS_PERMISSAO.INDISPONIVEL;
    try {
      return normalizarPermissaoGps(await api.checkPermissions());
    } catch {
      return ESTADOS_PERMISSAO.INDISPONIVEL;
    }
  }

  if (typeof navigatorApi?.permissions?.query !== 'function') return ESTADOS_PERMISSAO.BROWSER_DEPENDENT;
  try {
    const resultado = await navigatorApi.permissions.query({ name: 'geolocation' });
    if (resultado?.state === 'granted') return ESTADOS_PERMISSAO.CONCEDIDA;
    if (resultado?.state === 'denied') return ESTADOS_PERMISSAO.NEGADA;
    if (resultado?.state === 'prompt') return ESTADOS_PERMISSAO.NAO_SOLICITADA;
  } catch {
    return ESTADOS_PERMISSAO.BROWSER_DEPENDENT;
  }
  return ESTADOS_PERMISSAO.BROWSER_DEPENDENT;
}
