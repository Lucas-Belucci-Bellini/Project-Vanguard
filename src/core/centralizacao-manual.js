export const ESTADOS_CENTRALIZACAO = Object.freeze({
  LIVRE: 'LIVRE',
  BUSCANDO: 'BUSCANDO',
  ENCERRADA: 'ENCERRADA',
});

/**
 * Coordena a janela visual da solicitação manual de posição.
 * O controlador não obtém GPS por conta própria: recebe um adaptador para
 * `solicitarPosicao`, impede reentrada e ignora callbacks depois do cleanup.
 */
export function criarControleCentralizacao({
  solicitar = () => {},
  definirTemporizador = globalThis.setTimeout,
  limparTemporizador = globalThis.clearTimeout,
  duracaoMs = 21_000,
  onInicio = () => {},
  onPosition = () => {},
  onError = () => {},
  onFim = () => {},
} = {}) {
  let estado = ESTADOS_CENTRALIZACAO.LIVRE;
  let temporizador = null;

  function limparTimer() {
    if (temporizador === null) return;
    limparTemporizador(temporizador);
    temporizador = null;
  }

  function finalizarBusca() {
    if (estado !== ESTADOS_CENTRALIZACAO.BUSCANDO) return false;
    temporizador = null;
    estado = ESTADOS_CENTRALIZACAO.LIVRE;
    onFim();
    return true;
  }

  function iniciar() {
    if (estado !== ESTADOS_CENTRALIZACAO.LIVRE) return false;
    estado = ESTADOS_CENTRALIZACAO.BUSCANDO;
    onInicio();
    temporizador = definirTemporizador(finalizarBusca, duracaoMs);
    solicitar({
      mode: 'manual',
      onPosition: (posicao) => {
        if (estado === ESTADOS_CENTRALIZACAO.BUSCANDO) onPosition(posicao);
      },
      onError: (erro) => {
        if (estado === ESTADOS_CENTRALIZACAO.BUSCANDO) onError(erro);
      },
    });
    return true;
  }

  function cancelar() {
    const estavaBuscando = estado === ESTADOS_CENTRALIZACAO.BUSCANDO;
    limparTimer();
    if (estavaBuscando) estado = ESTADOS_CENTRALIZACAO.LIVRE;
    return estavaBuscando;
  }

  function desmontar() {
    limparTimer();
    estado = ESTADOS_CENTRALIZACAO.ENCERRADA;
  }

  return {
    iniciar,
    cancelar,
    desmontar,
    finalizarBusca,
    get estado() {
      return estado;
    },
  };
}
