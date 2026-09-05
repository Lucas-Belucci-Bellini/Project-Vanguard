/**
 * Um rastreamento para o aplicativo inteiro.
 *
 * ## O defeito que isto conserta, dito com precisão
 *
 * `src/pages/mapa.js` chamava `iniciarAcompanhamento(...)` e
 * `criarControleBackground(...)` dentro de `mapaPage()`, e o `desmontar()` da
 * página chamava `pararGps()` e `backgroundControle.desmontar()`.
 *
 * Ou seja: **ir de `#/mapa` para `#/bussola` encerrava a gravação.** Sem sair
 * do aplicativo, sem aviso e sem erro — a trilha parava de crescer enquanto a
 * pessoa continuava andando. Conferir a bússola no meio do caminho é
 * exatamente o que se faz numa caminhada, e era exatamente o que apagava o
 * resto do trajeto.
 *
 * ## A regra
 *
 * **Página observa, não possui.** O cancelador devolvido por `observar()`
 * remove a plateia; ele não desliga o GPS e não encerra sessão nenhuma. Quem
 * encerra é `gravador.definirRota({ ativa: false })` ou `limpar()`, e as duas
 * são decisão de quem está usando o aplicativo.
 *
 * O watcher fica ligado enquanto **houver plateia OU houver rota ativa**. Sem
 * os dois ele desliga — não é para gastar bateria à toa.
 *
 * ## Escrita dupla, durante a migração
 *
 * Cada fixo aceito vai para dois lugares:
 *
 * | destino | papel | teto |
 * |---|---|---|
 * | `vanguard:trilha` (localStorage) | o que a interface lê hoje | janela declarada |
 * | Track Store da V3 (IndexedDB) | o registro completo | **nenhum** |
 *
 * A chave v1 continua intacta e continua sendo a fonte da tela. É a fase de
 * escrita dupla de `docs/v3/DATA_MIGRATION_POLICY.md`: aditiva, sem apagar
 * nada para o novo caber.
 *
 * Tudo é injetável — o serviço é a regra, e a regra é testada sem navegador.
 */

import { estado as estadoPadrao, CHAVES } from './estado.js';
import { iniciarAcompanhamento } from './localizacao.js';
import { criarControleBackground, ESTADOS_BACKGROUND } from './background-localizacao.js';
import { criarGravadorDeTrilha } from './trilha-gravador.js';
import { criarTrackStore, persistenciaEmMemoria } from './dados/track-store.js';
import { persistenciaIndexedDB } from './dados/track-store-indexeddb.js';
import { criarRastreamento } from './rastreamento.js';

/** Onde o registro completo da V3 está sendo escrito. Declarado, nunca suposto. */
export const ESPELHO_V3 = Object.freeze({
  INDEXEDDB: 'INDEXEDDB',
  /** Sem IndexedDB (aba privativa, WebView antiga): o completo não sobrevive ao fechar. */
  MEMORIA: 'MEMORIA',
  DESLIGADO: 'DESLIGADO',
});

export function criarRastreamentoDoAplicativo({
  estado = estadoPadrao,
  chaves = CHAVES,
  acompanhar = iniciarAcompanhamento,
  criarBackground = criarControleBackground,
  /** `{ persistencia, tipo }`. `null` desliga o espelho da V3. */
  espelho = null,
  limiteEspelhoLocal = undefined,
} = {}) {
  const gravador = criarGravadorDeTrilha({
    estado,
    chaves,
    ...(limiteEspelhoLocal === undefined ? {} : { limite: limiteEspelhoLocal }),
  });

  const plateia = new Set();
  const plateiaBackground = new Set();
  // Cada tela viva diz se está oculta. Sem tela viva, "oculto" não significa
  // nada — e não pode pausar a gravação de quem trocou de aba.
  const ocultacoes = new Map();
  let proximaPlateia = 1;

  let watcher = null;
  let modo = gravador.rota().rotaAtiva ? 'trilha' : 'cidade';
  let backgroundEstado = ESTADOS_BACKGROUND.IDLE;
  let ultimaPosicao = estado.get(chaves.LOCAL, null);
  let background = null;

  // Ligação com o serviço da V3: um provedor virtual, para `rastreamento.js`
  // continuar dono do próprio ciclo sem abrir um segundo watcher de GPS.
  const assinantesV3 = new Set();
  const provedorVirtual = ({ onPosition }) => {
    assinantesV3.add(onPosition);
    return () => assinantesV3.delete(onPosition);
  };

  const espelhoV3 = espelho === null
    ? { persistencia: null, tipo: ESPELHO_V3.DESLIGADO }
    : espelho ?? escolherEspelho();
  const store = espelhoV3.persistencia ? criarTrackStore({ persistencia: espelhoV3.persistencia }) : null;
  const servicoV3 = store
    ? criarRastreamento({ store, provedorPrimeiroPlano: provedorVirtual })
    : null;

  function escolherEspelho() {
    try {
      if (globalThis.indexedDB) return { persistencia: persistenciaIndexedDB(), tipo: ESPELHO_V3.INDEXEDDB };
    } catch { /* cai para memória, e o tipo diz isso */ }
    return { persistencia: persistenciaEmMemoria(), tipo: ESPELHO_V3.MEMORIA };
  }

  function avisar(alvo, evento) {
    for (const cb of [...alvo]) {
      try { cb(evento); } catch { /* uma tela que quebra ao desenhar não derruba a gravação */ }
    }
  }

  /** Pausa o primeiro plano enquanto o segundo plano cobre — ou a tela viva está oculta. */
  function devePausar() {
    const noBackground = backgroundEstado === ESTADOS_BACKGROUND.ACTIVE
      || backgroundEstado === ESTADOS_BACKGROUND.STARTING;
    const alguemVisivel = ocultacoes.size === 0 || [...ocultacoes.values()].some((o) => !o);
    return noBackground || !alguemVisivel;
  }

  function precisaDeWatcher() {
    return plateia.size > 0 || gravador.rota().rotaAtiva;
  }

  function aoReceber(posicao) {
    ultimaPosicao = posicao;
    const resultado = gravador.registrar(posicao);
    for (const cb of [...assinantesV3]) {
      try { cb(posicao); } catch { /* o espelho da V3 nunca derruba o registro v1 */ }
    }
    avisar(plateia, { tipo: 'POSICAO', posicao, resultado });
  }

  function sincronizar() {
    if (precisaDeWatcher()) {
      if (!watcher) {
        watcher = acompanhar({
          mode: modo,
          onPosition: aoReceber,
          onError: (erro) => avisar(plateia, { tipo: 'ERRO', erro }),
          onState: (situacao) => avisar(plateia, { tipo: 'ESTADO_GPS', ...situacao }),
        });
      }
      watcher.setMode?.(modo);
      watcher.setPaused?.(devePausar());
      return;
    }
    // Sem plateia e sem rota: desligar é o certo. Não é encerrar gravação —
    // não há gravação para encerrar.
    try { watcher?.(); } catch { /* já pode ter caído */ }
    watcher = null;
  }

  function controleBackground() {
    if (background) return background;
    // Construir não toca o plugin nativo — `background-localizacao.js` só o
    // carrega em `iniciar()`. Por isso dá para nascer junto com o serviço, e
    // o estado do segundo plano nunca chega depois de quem o espera.
    background = criarBackground({
      onPosition: aoReceber,
      onState: (evento = {}) => {
        backgroundEstado = evento.status ?? backgroundEstado;
        sincronizar();
        avisar(plateiaBackground, { tipo: 'ESTADO', ...evento });
      },
      onError: (erro) => avisar(plateiaBackground, { tipo: 'ERRO', erro }),
    });
    return background;
  }

  controleBackground();

  return {
    gravador,

    /**
     * Uma tela começa a observar. O cancelador **não** para a gravação —
     * é essa a diferença entre observar e possuir.
     */
    observar(callback, { oculto = false } = {}) {
      if (typeof callback !== 'function') return () => {};
      const id = proximaPlateia; proximaPlateia += 1;
      plateia.add(callback);
      ocultacoes.set(id, oculto);
      sincronizar();
      return {
        parar() {
          plateia.delete(callback);
          ocultacoes.delete(id);
          sincronizar();
        },
        /** A tela ficou oculta ou voltou. Só vale enquanto ela estiver viva. */
        visibilidade(estaOculto) {
          if (!ocultacoes.has(id)) return;
          ocultacoes.set(id, Boolean(estaOculto));
          sincronizar();
        },
      };
    },

    observarBackground(callback) {
      if (typeof callback !== 'function') return () => {};
      plateiaBackground.add(callback);
      return () => plateiaBackground.delete(callback);
    },

    /** 'trilha' gasta mais bateria e entrega mais fixos; 'cidade' é o contrário. */
    definirModo(novo) {
      modo = novo === 'trilha' ? 'trilha' : 'cidade';
      sincronizar();
      return modo;
    },

    /** Liga ou desliga a rota. Ligar acende o watcher mesmo sem tela na frente. */
    definirRota(alvo) {
      const r = gravador.definirRota(alvo);
      modo = r.rotaAtiva ? 'trilha' : 'cidade';
      if (!r.rotaAtiva) void this.pararBackground();
      sincronizar();
      return r;
    },

    background: {
      podeIniciar: () => controleBackground().podeIniciar(),
      estado: () => backgroundEstado,
      iniciar: () => controleBackground().iniciar(),
      parar: () => controleBackground().parar(),
    },

    async pararBackground() {
      if (!background) return false;
      return background.parar();
    },

    /**
     * O que a V3 está espelhando, e onde. Para o Diagnóstico poder dizer —
     * e para ninguém supor IndexedDB onde não há.
     */
    espelho: () => ({ tipo: espelhoV3.tipo, ligado: Boolean(servicoV3) }),

    /** A sessão da V3. Separada de `espelho()` porque o store responde async. */
    async sessaoEspelho() {
      return store ? store.sessao() : null;
    },

    /** Abre (ou retoma) a sessão da V3 em paralelo à trilha v1. */
    async iniciarEspelhoV3(opcoes = {}) {
      if (!servicoV3) return null;
      const recuperada = await servicoV3.recuperar().catch(() => null);
      if (recuperada) return recuperada;
      await servicoV3.iniciar(opcoes).catch(() => null);
      return store.sessao();
    },

    async encerrarEspelhoV3() {
      if (!servicoV3) return null;
      return servicoV3.parar().catch(() => null);
    },

    modo: () => modo,
    ultimaPosicao: () => ultimaPosicao,
    ativo: () => Boolean(watcher),
    plateia: () => plateia.size,
    pausado: () => devePausar(),
  };
}

let instancia = null;

/** O rastreamento do aplicativo. Um só, criado na primeira vez que alguém pede. */
export function rastreamentoDoAplicativo(opcoes = undefined) {
  if (!instancia) instancia = criarRastreamentoDoAplicativo(opcoes);
  return instancia;
}

/** Só para teste: descarta o singleton para o próximo pedido nascer limpo. */
export function __redefinirRastreamentoDoAplicativo() {
  instancia = null;
}
