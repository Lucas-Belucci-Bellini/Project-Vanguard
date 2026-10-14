/**
 * O rastreamento como serviço — fora das páginas.
 *
 * ## O defeito que isto conserta
 *
 * Até a 1.6.0 o gravador morava dentro de `src/pages/mapa.js`: o watcher de
 * GPS, o controle de background e o `registrarPosicao` eram variáveis da
 * página. O `desmontar()` dela chamava `backgroundControle.desmontar()` e
 * `pararGps()`.
 *
 * Consequência medida no código: **sair de `#/mapa` para `#/bussola` encerrava
 * o rastreamento** — sem sair do aplicativo, sem aviso, sem erro. A trilha
 * simplesmente parava de crescer enquanto a pessoa continuava andando.
 *
 * ## A regra deste módulo
 *
 * Página **observa**, não possui. Deixar de observar nunca para a gravação: só
 * `parar()` para, e `parar()` é uma decisão explícita de quem está usando o
 * aplicativo — nunca um efeito colateral de trocar de tela.
 *
 * ## Duas fontes, um gravador
 *
 * Primeiro plano e segundo plano entregam posição para o **mesmo** recorder. É
 * o Track Store, com a classificação de ponto, que decide o que fazer com um
 * fixo repetido — e é por isso que as duas fontes podem se sobrepor durante a
 * transição sem duplicar a trilha.
 *
 * Tudo é injetado: o serviço é a regra, e a regra é testada sem navegador.
 */

import { RESULTADO_PONTO, ESTADO_SESSAO } from './dados/track-store.js';

/** Onde o rastreamento está. Estado real, nunca decorativo. */
export const ESTADO_RASTREAMENTO = Object.freeze({
  PARADO: 'PARADO',
  GRAVANDO: 'GRAVANDO',
  PAUSADO: 'PAUSADO',
  /** Gravando, mas sem fixo utilizável há mais que o esperado. */
  SEM_SINAL: 'SEM_SINAL',
});

/** De onde veio a posição. Viaja com o ponto e some no relatório. */
export const FONTE_POSICAO = Object.freeze({
  PRIMEIRO_PLANO: 'PRIMEIRO_PLANO',
  SEGUNDO_PLANO: 'SEGUNDO_PLANO',
});

/** Sem fixo por mais que isto, o estado vira SEM_SINAL — e a interface diz. */
export const SILENCIO_ATE_SEM_SINAL_MS = 60_000;

export function criarRastreamento({
  store,
  /** `({ onPosition, onError, modo }) => () => void` — devolve o cancelador. */
  provedorPrimeiroPlano = null,
  /** `{ iniciar, parar, desmontar }` no formato de `background-localizacao.js`. */
  controleSegundoPlano = null,
  relogio = () => Date.now(),
} = {}) {
  if (!store) throw new TypeError('criarRastreamento exige o Track Store.');

  let estado = ESTADO_RASTREAMENTO.PARADO;
  let pararPrimeiroPlano = null;
  let ultimoFixoEm = null;
  let ultimaPosicao = null;
  const observadores = new Set();
  const contadores = { gravados: 0, recusados: 0, erros: 0, porFonte: {} };

  function avisar(evento) {
    // Um observador que explode não pode derrubar a gravação: quem está
    // andando não perde a trilha porque uma tela quebrou ao desenhar.
    for (const cb of [...observadores]) {
      try { cb(evento); } catch { /* a gravação continua */ }
    }
  }

  function instantaneo(extras = {}) {
    return {
      estado,
      ultimaPosicao,
      ultimoFixoEm,
      contadores: { ...contadores, porFonte: { ...contadores.porFonte } },
      ...extras,
    };
  }

  async function aoReceber(posicao, fonte) {
    if (estado === ESTADO_RASTREAMENTO.PARADO || estado === ESTADO_RASTREAMENTO.PAUSADO) return;

    const agora = relogio();
    ultimoFixoEm = agora;
    ultimaPosicao = posicao;
    if (estado === ESTADO_RASTREAMENTO.SEM_SINAL) estado = ESTADO_RASTREAMENTO.GRAVANDO;

    const r = await store.registrar({ ...posicao, provider: posicao?.provider ?? fonte });
    if (r.resultado === RESULTADO_PONTO.GRAVADO) contadores.gravados += 1;
    else contadores.recusados += 1;
    contadores.porFonte[fonte] = (contadores.porFonte[fonte] ?? 0) + 1;

    avisar({ tipo: 'PONTO', fonte, resultado: r, ...instantaneo() });
  }

  function aoErro(erro, fonte) {
    // Erro de provedor NÃO encerra a sessão. Perder sinal, ter a permissão
    // revogada por um instante ou o plugin falhar são coisas que acontecem no
    // meio de uma caminhada — e nenhuma delas é motivo para jogar fora o que
    // já foi gravado.
    contadores.erros += 1;
    avisar({ tipo: 'ERRO', fonte, erro: erro?.message ?? String(erro), ...instantaneo() });
  }

  function ligarPrimeiroPlano(modo) {
    if (!provedorPrimeiroPlano || pararPrimeiroPlano) return;
    pararPrimeiroPlano = provedorPrimeiroPlano({
      modo,
      onPosition: (p) => { void aoReceber(p, FONTE_POSICAO.PRIMEIRO_PLANO); },
      onError: (e) => aoErro(e, FONTE_POSICAO.PRIMEIRO_PLANO),
    }) ?? null;
  }

  function desligarPrimeiroPlano() {
    try { pararPrimeiroPlano?.(); } catch { /* já pode ter caído */ }
    pararPrimeiroPlano = null;
  }

  return {
    /**
     * Uma página começa a observar. O cancelador **não** para a gravação —
     * é essa a diferença entre observar e possuir.
     */
    observar(callback) {
      if (typeof callback !== 'function') return () => {};
      observadores.add(callback);
      try { callback({ tipo: 'ESTADO', ...instantaneo() }); } catch { /* segue */ }
      return () => { observadores.delete(callback); };
    },

    async iniciar({ nome = null, modo = 'trilha' } = {}) {
      if (estado === ESTADO_RASTREAMENTO.GRAVANDO || estado === ESTADO_RASTREAMENTO.SEM_SINAL) {
        return instantaneo({ jaEstava: true });
      }
      if (estado === ESTADO_RASTREAMENTO.PAUSADO) return this.retomar();

      await store.iniciar({ nome, modo, origem: 'APP' });
      estado = ESTADO_RASTREAMENTO.GRAVANDO;
      ultimoFixoEm = null;
      ligarPrimeiroPlano(modo);
      // O segundo plano é uma tentativa: onde ele não existe (web) o serviço
      // segue gravando em primeiro plano, e quem diz isso é o estado, não uma
      // suposição.
      void controleSegundoPlano?.iniciar?.();
      avisar({ tipo: 'INICIOU', ...instantaneo() });
      return instantaneo();
    },

    async pausar() {
      if (estado !== ESTADO_RASTREAMENTO.GRAVANDO && estado !== ESTADO_RASTREAMENTO.SEM_SINAL) return instantaneo();
      await store.pausar();
      estado = ESTADO_RASTREAMENTO.PAUSADO;
      desligarPrimeiroPlano();
      await controleSegundoPlano?.parar?.();
      avisar({ tipo: 'PAUSOU', ...instantaneo() });
      return instantaneo();
    },

    async retomar({ modo = 'trilha' } = {}) {
      if (estado !== ESTADO_RASTREAMENTO.PAUSADO) return instantaneo();
      await store.retomar();
      estado = ESTADO_RASTREAMENTO.GRAVANDO;
      ligarPrimeiroPlano(modo);
      void controleSegundoPlano?.iniciar?.();
      avisar({ tipo: 'RETOMOU', ...instantaneo() });
      return instantaneo();
    },

    /** A única coisa que encerra a gravação. Nunca acontece por troca de tela. */
    async parar() {
      if (estado === ESTADO_RASTREAMENTO.PARADO) return instantaneo();
      desligarPrimeiroPlano();
      await controleSegundoPlano?.parar?.();
      const sessao = await store.encerrar();
      estado = ESTADO_RASTREAMENTO.PARADO;
      avisar({ tipo: 'PAROU', sessao, ...instantaneo() });
      return instantaneo({ sessao });
    },

    /**
     * Retoma uma sessão que ficou aberta — app morto pelo sistema, aparelho
     * reiniciado, aba recarregada. A trilha volta em vez de recomeçar.
     */
    async recuperar({ modo = 'trilha' } = {}) {
      const sessao = await store.recuperar();
      if (!sessao) return null;
      if (sessao.estado === ESTADO_SESSAO.GRAVANDO) {
        estado = ESTADO_RASTREAMENTO.GRAVANDO;
        ligarPrimeiroPlano(modo);
        void controleSegundoPlano?.iniciar?.();
      } else if (sessao.estado === ESTADO_SESSAO.PAUSADA) {
        estado = ESTADO_RASTREAMENTO.PAUSADO;
      }
      avisar({ tipo: 'RECUPEROU', sessao, ...instantaneo() });
      return sessao;
    },

    /**
     * Marca o tempo. Sem fixo há mais de um minuto gravando, o estado passa a
     * SEM_SINAL — para a interface poder dizer "sem sinal" em vez de mostrar
     * uma tela parada que parece funcionando.
     */
    verificarSilencio() {
      if (estado !== ESTADO_RASTREAMENTO.GRAVANDO) return instantaneo();
      if (ultimoFixoEm == null) return instantaneo();
      if (relogio() - ultimoFixoEm >= SILENCIO_ATE_SEM_SINAL_MS) {
        estado = ESTADO_RASTREAMENTO.SEM_SINAL;
        avisar({ tipo: 'SEM_SINAL', ...instantaneo() });
      }
      return instantaneo();
    },

    estado: () => estado,
    situacao: () => instantaneo(),
    sessao: () => store.sessao(),
    observadores: () => observadores.size,
  };
}
