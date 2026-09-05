/**
 * Onde a trilha passa a morar: acréscimo, nunca reescrita.
 *
 * ## O que estava errado
 *
 * Até a 1.6.0 a trilha era um array em `localStorage`, e cada ponto aceito
 * fazia `trilha = [...trilha, novo].slice(-12000)` seguido de gravação do array
 * inteiro. Três consequências, todas medidas:
 *
 * 1. **descarte silencioso** — passando de 12 000 pontos (≈24 km na regra de
 *    ≥2 m entre pontos) os mais antigos sumiam sem aviso. Numa peregrinação de
 *    três dias, o começo da caminhada simplesmente não existe mais;
 * 2. **custo O(n) por ponto** — 12 000 pontos são 1,53 MB de `JSON.stringify`
 *    a cada fixo aceito, contra ~5 MB de cota da origem;
 * 3. **tudo ou nada** — uma escrita interrompida perde a gravação inteira, não
 *    o último ponto.
 *
 * ## O que este módulo faz em vez disso
 *
 * Sessão e pontos são separados, e ponto é **append-only**: gravar o
 * 20 000º ponto custa o mesmo que gravar o primeiro, e nunca toca nos
 * anteriores. Não há teto — se a pessoa andou, está gravado.
 *
 * ## Nada é apagado por decisão do sistema
 *
 * Ponto de baixa precisão, outlier e duplicado são **gravados com a marca**.
 * Só `INVALIDO` (sem coordenada) não entra, porque não é posição. Quem decide
 * o que contar é o consumidor: a distância soma só `VALIDO`, o mapa desenha
 * todos, a exportação leva tudo.
 *
 * ## Vão é gravado como vão
 *
 * Perdeu sinal por dez minutos? O ponto seguinte carrega `vao`. Sem isso, o
 * mapa desenharia uma reta por onde ninguém passou e a distância somaria um
 * trecho que ninguém observou.
 *
 * A persistência é injetada (`persistencia`): o store é a regra, e a regra é
 * testada em memória, sem navegador.
 */

import {
  QUALIDADE_PONTO,
  VELOCIDADE_MAXIMA_MS,
  classificarPonto,
  detectarVao,
  deveGuardar,
  normalizarPontoTrilha,
} from '../../engine/trilha-ponto.js';

export const ESQUEMA_TRILHA = 'vanguard-trilha';
export const VERSAO_TRILHA = 2;

/** Estado de uma sessão de gravação. */
export const ESTADO_SESSAO = Object.freeze({
  GRAVANDO: 'GRAVANDO',
  PAUSADA: 'PAUSADA',
  ENCERRADA: 'ENCERRADA',
});

/** O que aconteceu com um ponto oferecido ao store. */
export const RESULTADO_PONTO = Object.freeze({
  GRAVADO: 'GRAVADO',
  /** Não é posição: sem coordenada válida. Único caso que não entra. */
  RECUSADO: 'RECUSADO',
  /** Não havia sessão aberta, ou ela está pausada/encerrada. */
  SEM_SESSAO: 'SEM_SESSAO',
});

/**
 * Persistência em memória. É a implementação de referência do contrato e o
 * que os testes usam — o comportamento do store não depende de navegador.
 */
export function persistenciaEmMemoria() {
  const sessoes = new Map();
  const pontos = new Map(); // sessaoId -> array
  let escritasDePonto = 0;
  let bytesReescritos = 0;

  return {
    async lerSessao(id) { return sessoes.get(id) ?? null; },
    async gravarSessao(sessao) { sessoes.set(sessao.id, { ...sessao }); },
    async listarSessoes() { return [...sessoes.values()].map((s) => ({ ...s })); },
    async anexarPontos(sessaoId, novos) {
      const lista = pontos.get(sessaoId) ?? [];
      lista.push(...novos.map((p) => ({ ...p })));
      pontos.set(sessaoId, lista);
      escritasDePonto += novos.length;
      bytesReescritos += novos.reduce((soma, p) => soma + JSON.stringify(p).length, 0);
    },
    async contarPontos(sessaoId) { return (pontos.get(sessaoId) ?? []).length; },
    async lerPontos(sessaoId, { desde = 0, ate = Infinity } = {}) {
      return (pontos.get(sessaoId) ?? []).filter((p) => p.seq >= desde && p.seq <= ate).map((p) => ({ ...p }));
    },
    /** Só para teste: prova que acrescentar não reescreve o que já estava. */
    __metricas: () => ({ escritasDePonto, bytesReescritos }),
  };
}

let contador = 0;
function novoId(agora) {
  contador += 1;
  return `trilha-${new Date(agora).toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${contador.toString(36)}`;
}

/**
 * @param {object} opcoes
 * @param {object} opcoes.persistencia porta de gravação (ver `persistenciaEmMemoria`)
 * @param {() => number} [opcoes.relogio] injetável para teste determinístico
 */
export function criarTrackStore({ persistencia, relogio = () => Date.now() } = {}) {
  if (!persistencia) throw new TypeError('criarTrackStore exige uma persistência.');

  let sessaoAtual = null;
  let ultimoPonto = null;

  async function carregarSessao(id) {
    const sessao = await persistencia.lerSessao(id);
    if (!sessao) return null;
    sessaoAtual = sessao;
    const pontos = await persistencia.lerPontos(id, { desde: Math.max(0, sessao.ultimoSeq ?? 0) });
    ultimoPonto = pontos.at(-1) ?? null;
    return sessao;
  }

  return {
    /** Abre uma sessão nova. Não toca em nenhuma sessão anterior. */
    async iniciar({ nome = null, origem = 'APP', modo = null } = {}) {
      const agora = relogio();
      sessaoAtual = {
        id: novoId(agora),
        esquema: ESQUEMA_TRILHA,
        versao: VERSAO_TRILHA,
        nome,
        origem,
        modo,
        estado: ESTADO_SESSAO.GRAVANDO,
        iniciadaEm: agora,
        encerradaEm: null,
        ultimoSeq: -1,
        pontos: 0,
        porQualidade: {},
        vaos: 0,
      };
      ultimoPonto = null;
      await persistencia.gravarSessao(sessaoAtual);
      return { ...sessaoAtual };
    },

    /**
     * Oferece um ponto. Ele é classificado, marcado e **acrescentado** — nunca
     * substitui nem reescreve os anteriores.
     */
    async registrar(leitura, { velocidadeMaximaMs = VELOCIDADE_MAXIMA_MS.DESCONHECIDO } = {}) {
      if (!sessaoAtual || sessaoAtual.estado !== ESTADO_SESSAO.GRAVANDO) {
        return { resultado: RESULTADO_PONTO.SEM_SESSAO, motivo: 'Nenhuma sessão gravando agora.' };
      }

      const seq = sessaoAtual.ultimoSeq + 1;
      const ponto = normalizarPontoTrilha(leitura, { seq });
      if (!ponto) {
        return { resultado: RESULTADO_PONTO.RECUSADO, qualidade: QUALIDADE_PONTO.INVALIDO, motivo: 'Leitura sem coordenada válida: não é posição.' };
      }

      const classe = classificarPonto(ponto, ultimoPonto, { velocidadeMaximaMs });
      if (!deveGuardar(classe.qualidade)) {
        return { resultado: RESULTADO_PONTO.RECUSADO, qualidade: classe.qualidade, motivo: classe.motivo };
      }

      ponto.qualidade = classe.qualidade;
      if (classe.qualidade !== QUALIDADE_PONTO.VALIDO) ponto.motivoQualidade = classe.motivo;

      const vao = detectarVao(ultimoPonto, ponto);
      if (vao) {
        // O vão viaja NO PONTO que o fecha: quem lê a trilha em ordem sabe que
        // o segmento anterior a este não foi observado, sem precisar de uma
        // segunda estrutura para descobrir isso.
        ponto.vao = vao;
        sessaoAtual.vaos += 1;
      }

      await persistencia.anexarPontos(sessaoAtual.id, [ponto]);

      sessaoAtual.ultimoSeq = seq;
      sessaoAtual.pontos += 1;
      sessaoAtual.porQualidade[classe.qualidade] = (sessaoAtual.porQualidade[classe.qualidade] ?? 0) + 1;
      sessaoAtual.atualizadaEm = relogio();
      await persistencia.gravarSessao(sessaoAtual);

      ultimoPonto = ponto;
      return { resultado: RESULTADO_PONTO.GRAVADO, qualidade: classe.qualidade, motivo: classe.motivo, seq, vao: vao ?? null };
    },

    /**
     * Pausa. Os pontos já gravados **continuam onde estão** — pausar nunca
     * reinicia contagem nem distância (§25).
     */
    async pausar() {
      if (!sessaoAtual || sessaoAtual.estado !== ESTADO_SESSAO.GRAVANDO) return null;
      sessaoAtual.estado = ESTADO_SESSAO.PAUSADA;
      sessaoAtual.pausadaEm = relogio();
      await persistencia.gravarSessao(sessaoAtual);
      return { ...sessaoAtual };
    },

    async retomar() {
      if (!sessaoAtual || sessaoAtual.estado !== ESTADO_SESSAO.PAUSADA) return null;
      sessaoAtual.estado = ESTADO_SESSAO.GRAVANDO;
      sessaoAtual.retomadaEm = relogio();
      await persistencia.gravarSessao(sessaoAtual);
      return { ...sessaoAtual };
    },

    /** Encerra. Não apaga nada: a sessão fica no histórico com os pontos. */
    async encerrar() {
      if (!sessaoAtual || sessaoAtual.estado === ESTADO_SESSAO.ENCERRADA) return null;
      sessaoAtual.estado = ESTADO_SESSAO.ENCERRADA;
      sessaoAtual.encerradaEm = relogio();
      await persistencia.gravarSessao(sessaoAtual);
      const encerrada = { ...sessaoAtual };
      sessaoAtual = null;
      ultimoPonto = null;
      return encerrada;
    },

    /**
     * Retoma a sessão que ficou aberta.
     *
     * É o caminho da recuperação (§12): o aplicativo foi morto pelo sistema, o
     * aparelho reiniciou, ou a pessoa saiu da tela. Se havia sessão gravando,
     * ela volta com os pontos que já tinha — a trilha não recomeça do zero.
     */
    async recuperar() {
      const sessoes = await persistencia.listarSessoes();
      const aberta = sessoes
        .filter((s) => s.estado === ESTADO_SESSAO.GRAVANDO || s.estado === ESTADO_SESSAO.PAUSADA)
        .sort((a, b) => (b.atualizadaEm ?? b.iniciadaEm) - (a.atualizadaEm ?? a.iniciadaEm))[0];
      if (!aberta) return null;
      return carregarSessao(aberta.id);
    },

    /**
     * Acrescenta campos à sessão aberta e persiste.
     *
     * Existe para quem precisa carimbar procedência na própria sessão — a
     * migração guarda aqui o checksum do array de origem, e é isso que faz uma
     * segunda execução reconhecer que aquele caminho já foi copiado em vez de
     * criar uma cópia paralela dele.
     */
    async anotarSessao(campos = {}) {
      if (!sessaoAtual) return null;
      Object.assign(sessaoAtual, campos);
      await persistencia.gravarSessao(sessaoAtual);
      return { ...sessaoAtual };
    },

    async sessao() { return sessaoAtual ? { ...sessaoAtual } : null; },
    async sessoes() { return persistencia.listarSessoes(); },
    async pontos(sessaoId = sessaoAtual?.id, faixa = {}) {
      if (!sessaoId) return [];
      return persistencia.lerPontos(sessaoId, faixa);
    },
    async contar(sessaoId = sessaoAtual?.id) {
      if (!sessaoId) return 0;
      return persistencia.contarPontos(sessaoId);
    },
  };
}
