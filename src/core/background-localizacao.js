export const ESTADOS_BACKGROUND = Object.freeze({
  IDLE: 'IDLE',
  STARTING: 'STARTING',
  ACTIVE: 'ACTIVE',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR',
  UNAVAILABLE: 'UNAVAILABLE',
});

export const OPCOES_BACKGROUND = Object.freeze({
  backgroundMessage: 'Vanguard Field está registrando sua trilha em segundo plano. Toque para parar e economizar bateria.',
  backgroundTitle: 'Vanguard Field · trilha ativa',
  requestPermissions: true,
  stale: false,
  distanceFilter: 5,
  minIntervalMs: 5_000,
});

function plataformaNativa(capacitorApi) {
  try {
    return capacitorApi?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function normalizarPosicaoBackground(leitura) {
  const c = leitura?.coords ?? leitura;
  return {
    lat: Number(c?.latitude ?? c?.lat),
    lon: Number(c?.longitude ?? c?.lon),
    accuracy: Number.isFinite(c?.accuracy) ? c.accuracy : null,
    altitude: Number.isFinite(c?.altitude) ? c.altitude : null,
    speed: Number.isFinite(c?.speed) && c.speed >= 0 ? c.speed : null,
    heading: Number.isFinite(c?.bearing) && c.bearing >= 0
      ? c.bearing
      : Number.isFinite(c?.heading) && c.heading >= 0 ? c.heading : null,
    timestamp: Number.isFinite(leitura?.time)
      ? leitura.time
      : Number.isFinite(leitura?.timestamp) ? leitura.timestamp : Date.now(),
    simulated: leitura?.simulated === true,
  };
}

function erroMensagem(erro) {
  if (typeof erro?.message === 'string' && erro.message) return erro.message;
  if (typeof erro?.code === 'string' && erro.code) return erro.code;
  return 'O serviço de localização em segundo plano não respondeu.';
}

/**
 * Controlador nativo de background tracking.
 *
 * O controlador não envia posições para servidor: `url` nunca é configurada.
 * O armazenamento da trilha continua pertencendo à página do mapa; por isso o
 * resultado exige validação física quando o WebView é suspenso pelo sistema.
 */
export function criarControleBackground({
  plugin = null,
  pluginLoader = async () => {
    const modulo = await import('@capgo/background-geolocation');
    return modulo.BackgroundGeolocation ?? modulo.default ?? modulo;
  },
  capacitorApi = globalThis.Capacitor,
  onPosition = () => {},
  onState = () => {},
  onError = () => {},
} = {}) {
  let api = plugin;
  let estado = ESTADOS_BACKGROUND.IDLE;
  let encerrado = false;
  let iniciando = false;
  let ativo = false;
  let ciclo = 0;

  function emitir(status, extras = {}) {
    estado = status;
    if (!encerrado) onState({ status, ...extras });
  }

  async function carregarApi() {
    if (api) return api;
    api = await pluginLoader();
    if (!api || typeof api.start !== 'function' || typeof api.stop !== 'function') {
      throw new Error('Plugin de localização em segundo plano indisponível.');
    }
    return api;
  }

  function callbackDaSessao(token) {
    return (leitura, erro) => {
      if (encerrado || token !== ciclo) return;
      if (erro) {
        ativo = false;
        const mensagem = erroMensagem(erro);
        emitir(ESTADOS_BACKGROUND.ERROR, { erro: mensagem, codigo: erro?.code ?? null });
        onError(erro);
        return;
      }
      if (!leitura) return;
      const posicao = normalizarPosicaoBackground(leitura);
      if (!Number.isFinite(posicao.lat) || !Number.isFinite(posicao.lon)) return;
      ativo = true;
      emitir(ESTADOS_BACKGROUND.ACTIVE, { fonte: 'BACKGROUND_GEOLOCATION' });
      onPosition(posicao);
    };
  }

  async function iniciar() {
    if (encerrado || iniciando || ativo) return false;
    if (!plataformaNativa(capacitorApi)) {
      emitir(ESTADOS_BACKGROUND.UNAVAILABLE, { motivo: 'NATIVE_ONLY' });
      return false;
    }

    iniciando = true;
    const token = ++ciclo;
    emitir(ESTADOS_BACKGROUND.STARTING, { fonte: 'BACKGROUND_GEOLOCATION' });
    try {
      const pluginAtual = await carregarApi();
      if (encerrado || token !== ciclo) return false;
      await pluginAtual.start({ ...OPCOES_BACKGROUND }, callbackDaSessao(token));
      if (encerrado || token !== ciclo) {
        await pluginAtual.stop().catch(() => {});
        return false;
      }
      ativo = true;
      emitir(ESTADOS_BACKGROUND.ACTIVE, { fonte: 'BACKGROUND_GEOLOCATION', aguardandoFixo: true });
      return true;
    } catch (erro) {
      if (encerrado || token !== ciclo) return false;
      ativo = false;
      emitir(ESTADOS_BACKGROUND.ERROR, { erro: erroMensagem(erro), codigo: erro?.code ?? null });
      onError(erro);
      return false;
    } finally {
      iniciando = false;
    }
  }

  async function parar() {
    if (!api || (!ativo && !iniciando)) {
      if (!encerrado && estado !== ESTADOS_BACKGROUND.IDLE) emitir(ESTADOS_BACKGROUND.STOPPED);
      ativo = false;
      iniciando = false;
      return false;
    }
    ciclo += 1;
    const pluginAtual = api;
    ativo = false;
    iniciando = false;
    try {
      await pluginAtual.stop();
    } catch (erro) {
      if (!encerrado) {
        emitir(ESTADOS_BACKGROUND.ERROR, { erro: erroMensagem(erro), codigo: erro?.code ?? null });
        onError(erro);
      }
      return false;
    }
    if (!encerrado) emitir(ESTADOS_BACKGROUND.STOPPED);
    return true;
  }

  function desmontar() {
    if (encerrado) return;
    encerrado = true;
    ciclo += 1;
    ativo = false;
    iniciando = false;
    api?.stop?.().catch?.(() => {});
  }

  return {
    iniciar,
    parar,
    desmontar,
    estado: () => estado,
    estaAtivo: () => ativo,
    podeIniciar: () => plataformaNativa(capacitorApi),
  };
}

export const __internals = { plataformaNativa, erroMensagem };

export default criarControleBackground;

