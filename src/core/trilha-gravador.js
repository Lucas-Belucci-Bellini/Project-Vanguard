/**
 * O gravador da trilha v1 — fora da página.
 *
 * ## O que estava errado
 *
 * Até a 1.6.0 este código era um bloco de `src/pages/mapa.js`: `trilha`,
 * `ultimoRegistrado`, `deveRegistrar` e o `estado.set(CHAVES.TRILHA, …)` eram
 * variáveis da função `mapaPage()`. Duas consequências, as duas medidas:
 *
 * 1. **Trocar de tela encerrava a gravação.** O `desmontar()` da página levava
 *    junto o watcher e o controle de segundo plano.
 * 2. **`.slice(-12000)` descartava os pontos mais ANTIGOS em silêncio** — a
 *    partir de ≈24 km de caminhada, sem aviso, sem contagem, sem registro.
 *
 * ## O que muda aqui
 *
 * O gravador é do aplicativo, não da tela. E o corte deixa de ser silencioso:
 * o `localStorage` continua com uma janela recente (é o que a interface lê
 * hoje, e uma chave sem teto estoura a cota de ~5 MB), mas **cada ponto que
 * sai da janela é contado e anunciado**, e o registro completo fica no Track
 * Store da V3 — append-only, sem teto, em IndexedDB.
 *
 * É a fase de escrita dupla da migração aditiva descrita em
 * `docs/v3/DATA_MIGRATION_POLICY.md`: `vanguard:trilha` continua intacta e
 * continua sendo a fonte da tela; o store da V3 passa a ser a fonte completa.
 * Nada é apagado para o novo caber.
 *
 * Tudo é injetado: sem DOM, sem `navigator`, sem `localStorage` real.
 */

import { distancia3D } from '../engine/odometro.js';

/**
 * Teto da janela guardada em `localStorage`. É o mesmo número que a página
 * usava — o comportamento de quem está abaixo dele não muda em nada. O que
 * muda é que passar dele agora **aparece**.
 */
export const LIMITE_ESPELHO_LOCAL = 12_000;

/** Distância 3D mínima entre dois pontos gravados. */
export const DISTANCIA_MINIMA_M = 2;

/** Mesmo parado, um ponto a cada este tempo mantém o registro vivo. */
export const INTERVALO_MAXIMO_MS = 10_000;

/** Por que um fixo não entrou na trilha. Motivo dito, nunca silêncio. */
export const RECUSA = Object.freeze({
  ROTA_PARADA: 'ROTA_PARADA',
  ROTA_PAUSADA: 'ROTA_PAUSADA',
  MUITO_PERTO: 'MUITO_PERTO',
});

/**
 * Decide se o fixo entra na trilha.
 *
 * Veio da página sem mudar uma regra. O portão antigo era `haversine >= 5`:
 * distância **no plano**. Subindo escada a pessoa anda dois metros na
 * horizontal e dez na vertical, então nada entrava. Aqui a distância considera
 * o desnível, o limiar é 2 m, e **o tempo também abre o portão** — parado num
 * ponto de vista, um ponto a cada 10 s evita buraco no traçado exatamente onde
 * o trecho foi mais difícil.
 *
 * Gravar generoso e peneirar na hora de somar é de propósito: `odometro.js`
 * decide o que conta como distância, e a trilha guarda o formato do caminho.
 */
export function deveRegistrar(anterior, nova) {
  if (!anterior) return true;
  const medida = distancia3D(anterior, nova);
  if (medida && medida.totalM >= DISTANCIA_MINIMA_M) return true;
  const decorridoMs = Number(nova?.timestamp) - Number(anterior?.timestamp);
  return Number.isFinite(decorridoMs) && decorridoMs >= INTERVALO_MAXIMO_MS;
}

export function criarGravadorDeTrilha({
  /** `{ get, set }` no formato de `core/estado.js`. */
  estado,
  chaves,
  /** Teto da janela local. `Infinity` guarda tudo (usado nos testes). */
  limite = LIMITE_ESPELHO_LOCAL,
} = {}) {
  if (!estado || !chaves) throw new TypeError('criarGravadorDeTrilha exige estado e chaves.');

  let trilha = estado.get(chaves.TRILHA, []) ?? [];
  let rotaAtiva = Boolean(estado.get(chaves.ROTA_ATIVA, false));
  let rotaPausada = Boolean(estado.get(chaves.ROTA_PAUSADA, false)) && rotaAtiva;
  let ultimoRegistrado = trilha.length ? trilha[trilha.length - 1] : null;
  let modo = null;
  // Quantos pontos já saíram da janela local. Zero é a resposta normal; e
  // quando não for zero, a interface tem de poder dizer isso.
  let saidosDaJanela = 0;
  const observadores = new Set();

  function avisar(evento) {
    for (const cb of [...observadores]) {
      try { cb(evento); } catch { /* uma tela que quebra ao desenhar não derruba a gravação */ }
    }
  }

  function guardar() {
    estado.set(chaves.TRILHA, trilha);
  }

  function anexar(ponto) {
    const comModo = modo ? { ...ponto, modo } : ponto;
    const proxima = [...trilha, comModo];
    if (Number.isFinite(limite) && proxima.length > limite) {
      const excedente = proxima.length - limite;
      saidosDaJanela += excedente;
      trilha = proxima.slice(excedente);
    } else {
      trilha = proxima;
    }
    ultimoRegistrado = ponto;
    guardar();
    return comModo;
  }

  return {
    observar(callback) {
      if (typeof callback !== 'function') return () => {};
      observadores.add(callback);
      return () => { observadores.delete(callback); };
    },

    /**
     * Um fixo chegou. Devolve o que aconteceu com ele — nunca `undefined`,
     * porque "não sei o que houve com o ponto" é o começo de perder pontos.
     */
    registrar(nova) {
      if (!rotaAtiva) return { gravado: false, motivo: RECUSA.ROTA_PARADA };
      if (rotaPausada) return { gravado: false, motivo: RECUSA.ROTA_PAUSADA };
      if (!deveRegistrar(ultimoRegistrado, nova)) return { gravado: false, motivo: RECUSA.MUITO_PERTO };
      const ponto = anexar(nova);
      const evento = { tipo: 'PONTO', ponto, total: trilha.length, saidosDaJanela };
      avisar(evento);
      return { gravado: true, ponto, total: trilha.length, saidosDaJanela };
    },

    /** O modo confirmado viaja com o ponto: separa quilômetro andado de quilômetro de ônibus. */
    definirModo(novo) { modo = novo ?? null; },

    /**
     * Liga, pausa ou para a rota. **Parar não apaga nada** — só `limpar()`
     * apaga, e ela é uma decisão explícita de quem usa o aplicativo.
     */
    definirRota({ ativa, pausada = false } = {}) {
      rotaAtiva = Boolean(ativa);
      rotaPausada = Boolean(pausada) && rotaAtiva;
      estado.set(chaves.ROTA_ATIVA, rotaAtiva);
      estado.set(chaves.ROTA_PAUSADA, rotaPausada);
      avisar({ tipo: 'ROTA', rotaAtiva, rotaPausada });
      return { rotaAtiva, rotaPausada };
    },

    /** Primeiro ponto de uma rota que começa sem trilha nenhuma. */
    semear(ponto) {
      if (trilha.length || !ponto) return false;
      anexar(ponto);
      avisar({ tipo: 'PONTO', ponto, total: trilha.length, saidosDaJanela });
      return true;
    },

    /** Importação de arquivo: substitui a janela local pelo que veio. */
    substituir(nova) {
      trilha = Array.isArray(nova) ? [...nova] : [];
      ultimoRegistrado = trilha.length ? trilha[trilha.length - 1] : null;
      saidosDaJanela = 0;
      guardar();
      avisar({ tipo: 'SUBSTITUIU', total: trilha.length });
      return trilha.length;
    },

    /** A única coisa que apaga. Nunca acontece por troca de tela. */
    limpar() {
      trilha = [];
      ultimoRegistrado = null;
      saidosDaJanela = 0;
      guardar();
      this.definirRota({ ativa: false, pausada: false });
      avisar({ tipo: 'LIMPOU', total: 0 });
    },

    trilha: () => trilha,
    total: () => trilha.length,
    ultimo: () => ultimoRegistrado,
    rota: () => ({ rotaAtiva, rotaPausada }),
    /** Quantos pontos saíram da janela local — o corte que era silencioso. */
    saidosDaJanela: () => saidosDaJanela,
    observadores: () => observadores.size,
  };
}
