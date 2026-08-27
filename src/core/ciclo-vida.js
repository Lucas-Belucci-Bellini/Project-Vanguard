let estadoAtual = typeof document !== 'undefined'
  ? (document.hidden ? 'BACKGROUND' : 'FOREGROUND')
  : 'UNAVAILABLE';
let fonteAtual = typeof document !== 'undefined' ? 'VISIBILITY API' : 'INDISPONÍVEL';

export function formatarCicloVida(estado, fonte = fonteAtual) {
  const normalizado = estado === 'FOREGROUND' || estado === 'BACKGROUND' ? estado : 'UNAVAILABLE';
  return `${normalizado} · ${fonte || 'INDISPONÍVEL'}`;
}

export function estadoCicloVidaAtual() {
  return { estado: estadoAtual, fonte: fonteAtual, rotulo: formatarCicloVida(estadoAtual, fonteAtual) };
}

function plataformaNativa() {
  return globalThis.Capacitor?.isNativePlatform?.() === true;
}

export function observarCicloVida({ onState = () => {} } = {}) {
  let encerrado = false;
  let removeWeb = () => {};
  const listenersNativos = [];

  function emitir(estado, fonte) {
    if (encerrado) return;
    estadoAtual = estado === 'FOREGROUND' || estado === 'BACKGROUND' ? estado : 'UNAVAILABLE';
    fonteAtual = fonte || fonteAtual;
    onState(estadoCicloVidaAtual());
  }

  if (typeof document !== 'undefined') {
    const aoMudarVisibilidade = () => emitir(document.hidden ? 'BACKGROUND' : 'FOREGROUND', 'VISIBILITY API');
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    removeWeb = () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    emitir(document.hidden ? 'BACKGROUND' : 'FOREGROUND', 'VISIBILITY API');
  } else {
    emitir('UNAVAILABLE', 'INDISPONÍVEL');
  }

  if (plataformaNativa()) {
    import('@capacitor/app').then(async ({ App }) => {
      if (encerrado) return;
      const listener = await App.addListener('appStateChange', ({ isActive }) => {
        emitir(isActive ? 'FOREGROUND' : 'BACKGROUND', 'CAPACITOR APP');
      });
      listenersNativos.push(listener);
      if (encerrado) await listener.remove().catch(() => {});
    }).catch(() => {
      /* O estado da Visibility API continua sendo a fonte disponível. */
    });
  }

  return () => {
    encerrado = true;
    removeWeb();
    for (const listener of listenersNativos) listener.remove().catch(() => {});
  };
}
