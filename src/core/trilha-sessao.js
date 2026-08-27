export const ESTADOS_TRILHA = {
  PARADA: 'STOPPED',
  GRAVANDO: 'ACTIVE',
  PAUSADA: 'PAUSED',
};

export function estadoTrilha({ ativa = false, pausada = false } = {}) {
  if (!ativa) return ESTADOS_TRILHA.PARADA;
  return pausada ? ESTADOS_TRILHA.PAUSADA : ESTADOS_TRILHA.GRAVANDO;
}

export function transicionarTrilha(estadoAtual, evento) {
  switch (evento) {
    case 'START':
      return { ativa: true, pausada: false };
    case 'PAUSE':
      return estadoAtual === ESTADOS_TRILHA.GRAVANDO ? { ativa: true, pausada: true } : estadoBooleans(estadoAtual);
    case 'RESUME':
      return estadoAtual === ESTADOS_TRILHA.PAUSADA ? { ativa: true, pausada: false } : estadoBooleans(estadoAtual);
    case 'STOP':
      return { ativa: false, pausada: false };
    default:
      return estadoBooleans(estadoAtual);
  }
}

function estadoBooleans(estadoAtual) {
  return {
    ativa: estadoAtual === ESTADOS_TRILHA.GRAVANDO || estadoAtual === ESTADOS_TRILHA.PAUSADA,
    pausada: estadoAtual === ESTADOS_TRILHA.PAUSADA,
  };
}
