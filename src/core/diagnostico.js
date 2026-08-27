const UNAVAILABLE = 'INDISPONÍVEL';

export function formatarBytes(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) return UNAVAILABLE;
  if (numero < 1024) return `${Math.round(numero)} B`;
  if (numero < 1024 ** 2) return `${(numero / 1024).toFixed(1)} KiB`;
  if (numero < 1024 ** 3) return `${(numero / (1024 ** 2)).toFixed(1)} MiB`;
  return `${(numero / (1024 ** 3)).toFixed(2)} GiB`;
}

export function formatarBateria(bateria) {
  if (!bateria || typeof bateria !== 'object') return UNAVAILABLE;
  const nivel = Number(bateria.level);
  const percentual = Number.isFinite(nivel) && nivel >= 0 && nivel <= 1
    ? `${Math.round(nivel * 100)}%`
    : UNAVAILABLE;
  const estado = bateria.charging === true ? 'carregando' : bateria.charging === false ? 'não carregando' : 'estado indisponível';
  return `${percentual} · ${estado}`;
}

export function formatarMilissegundos(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? `${Math.round(numero)} ms` : UNAVAILABLE;
}

export function desempenhoResumo(performanceApi = globalThis.performance) {
  let entradas = [];
  try {
    entradas = typeof performanceApi?.getEntriesByType === 'function'
      ? performanceApi.getEntriesByType('navigation')
      : [];
  } catch {
    entradas = [];
  }
  const navegacao = Array.from(entradas || []).find((entrada) => entrada && typeof entrada === 'object');
  const memoria = performanceApi?.memory;
  const usados = Number(memoria?.usedJSHeapSize);
  const limite = Number(memoria?.jsHeapSizeLimit);
  return {
    navegacao: formatarMilissegundos(navegacao?.domContentLoadedEventEnd),
    carga: formatarMilissegundos(navegacao?.loadEventEnd),
    memoria: Number.isFinite(usados) && usados >= 0
      ? `${formatarBytes(usados)} usados${Number.isFinite(limite) && limite >= 0 ? ` · ${formatarBytes(limite)} limite reportado` : ''}`
      : UNAVAILABLE,
    fonte: navegacao ? 'NAVIGATION TIMING' : 'INDISPONÍVEL',
  };
}

export function statusRede(online) {
  return online === true ? 'ONLINE' : online === false ? 'OFFLINE' : UNAVAILABLE;
}

export function statusServiceWorker({ controller = false, waiting = false } = {}) {
  if (waiting) return 'ATUALIZAÇÃO AGUARDANDO';
  if (controller) return 'ATIVO';
  return UNAVAILABLE;
}

export function statusPosicao(posicao, agora = Date.now()) {
  const latitude = posicao?.lat ?? posicao?.latitude;
  const longitude = posicao?.lon ?? posicao?.longitude;
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return { estado: 'UNAVAILABLE', detalhe: 'Nenhum fixo válido salvo no aparelho.' };
  }
  const timestamp = Number(posicao.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > agora) {
    return { estado: 'STALE', detalhe: 'Fixo válido, mas a idade não está disponível.' };
  }
  const idadeMs = Math.max(0, agora - timestamp);
  if (idadeMs >= 5 * 60 * 1000) return { estado: 'STALE', detalhe: 'O último fixo tem cinco minutos ou mais.' };
  return { estado: 'AVAILABLE', detalhe: idadeMs < 10_000 ? 'Fixo recebido agora.' : 'Fixo recente.' };
}

export function diagnosticoResumo({
  versao,
  plataforma,
  rede,
  posicao,
  serviceWorker,
  armazenamento,
  bateria,
  bussola,
  agora = Date.now(),
}) {
  const estadoPosicao = statusPosicao(posicao, agora);
  return [
    { grupo: 'APLICAÇÃO', nome: 'Versão', valor: versao || UNAVAILABLE, estado: versao ? 'ok' : 'atencao' },
    { grupo: 'APLICAÇÃO', nome: 'Plataforma', valor: plataforma || UNAVAILABLE, estado: plataforma ? 'ok' : 'atencao' },
    { grupo: 'CONECTIVIDADE', nome: 'Rede', valor: statusRede(rede), estado: rede === true ? 'ok' : rede === false ? 'atencao' : 'atencao' },
    { grupo: 'LOCALIZAÇÃO', nome: 'GPS/GNSS', valor: estadoPosicao.estado, estado: estadoPosicao.estado === 'AVAILABLE' ? 'ok' : 'atencao' },
    { grupo: 'LOCALIZAÇÃO', nome: 'Frescor', valor: estadoPosicao.detalhe, estado: estadoPosicao.estado === 'AVAILABLE' ? 'ok' : 'atencao' },
    { grupo: 'SISTEMA', nome: 'Service worker', valor: statusServiceWorker(serviceWorker), estado: serviceWorker?.controller ? 'ok' : 'atencao' },
    { grupo: 'SISTEMA', nome: 'Armazenamento', valor: armazenamento || UNAVAILABLE, estado: armazenamento ? 'ok' : 'atencao' },
    { grupo: 'SISTEMA', nome: 'Bateria', valor: formatarBateria(bateria), estado: bateria ? 'ok' : 'atencao' },
    { grupo: 'SENSORES', nome: 'Bússola', valor: bussola || UNAVAILABLE, estado: bussola === 'DISPONÍVEL' ? 'ok' : 'atencao' },
  ];
}
