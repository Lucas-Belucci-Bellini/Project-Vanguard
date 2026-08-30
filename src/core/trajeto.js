/**
 * Trajeto: quando a caminhada começou, quando terminou e quanto dela foi
 * parada para descansar.
 *
 * A trilha já guarda *por onde* se passou. Este módulo guarda *o tempo* —
 * porque numa caminhada em grupo o relógio conta duas histórias diferentes:
 * o tempo total desde a saída e o tempo efetivamente em marcha. Descansar
 * três horas ao longo do dia não torna a caminhada mais lenta; torna o total
 * maior, e misturar as duas coisas esconde as duas.
 *
 * Módulo puro: sem DOM, sem storage, sem relógio próprio. Quem chama informa
 * `agora`, e é por isso que todo cálculo aqui é testável e determinístico.
 *
 * A parada tem começo e fim explícitos. Uma parada aberta é uma parada em
 * andamento, contada até `agora`; ela nunca é fechada por adivinhação.
 */

import { duracaoLabel } from './trilha.js';
import { coordenadaValida } from './numero-seguro.js';

export const ESQUEMA_TRAJETO = 'vanguard-trajeto';
export const VERSAO_TRAJETO = 1;

export const TIPOS_PARADA = Object.freeze({
  DESCANSO: 'DESCANSO',
  PERNOITE: 'PERNOITE',
});

function instante(valor) {
  const numero = typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : NaN;
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function iso(valor) {
  const numero = instante(valor);
  return numero == null ? null : new Date(numero).toISOString();
}

function paraNumero(isoTexto) {
  const valor = Date.parse(isoTexto);
  return Number.isFinite(valor) ? valor : null;
}

function falha(codigo, motivo, trajeto = null) {
  return { ok: false, codigo, motivo, trajeto };
}

function copiar(trajeto) {
  return { ...trajeto, paradas: trajeto.paradas.map((parada) => ({ ...parada })) };
}



export function iniciarTrajeto({ id = null, agora = Date.now(), nome = null } = {}) {
  const inicio = instante(agora);
  if (inicio == null) return falha('INSTANTE_INVALIDO', 'O início do trajeto precisa de um instante válido.');
  return {
    ok: true,
    trajeto: {
      schema: ESQUEMA_TRAJETO,
      version: VERSAO_TRAJETO,
      id: typeof id === 'string' && id.trim() ? id.trim().slice(0, 120) : `trajeto-${new Date(inicio).toISOString()}`,
      nome: typeof nome === 'string' && nome.trim() ? nome.trim().slice(0, 120) : null,
      iniciadoEm: iso(inicio),
      encerradoEm: null,
      paradas: [],
    },
  };
}

export function paradaAberta(trajeto) {
  return trajeto?.paradas?.find((parada) => parada.encerradaEm == null) ?? null;
}

export function trajetoEncerrado(trajeto) {
  return Boolean(trajeto?.encerradoEm);
}

export function iniciarParada(trajeto, { tipo = TIPOS_PARADA.DESCANSO, agora = Date.now(), posicao = null, nota = null } = {}) {
  if (!trajeto?.iniciadoEm) return falha('SEM_TRAJETO', 'Não há trajeto em andamento para registrar uma parada.');
  if (trajetoEncerrado(trajeto)) return falha('TRAJETO_ENCERRADO', 'O trajeto já foi encerrado.', trajeto);
  if (paradaAberta(trajeto)) return falha('PARADA_EM_ANDAMENTO', 'Já existe uma parada aberta; encerre-a antes de abrir outra.', trajeto);
  if (!Object.values(TIPOS_PARADA).includes(tipo)) return falha('TIPO_INVALIDO', 'Tipo de parada desconhecido.', trajeto);

  const inicio = instante(agora);
  const inicioTrajeto = paraNumero(trajeto.iniciadoEm);
  if (inicio == null) return falha('INSTANTE_INVALIDO', 'A parada precisa de um instante válido.', trajeto);
  if (inicioTrajeto != null && inicio < inicioTrajeto) {
    return falha('PARADA_ANTES_DO_INICIO', 'Uma parada não pode começar antes do trajeto.', trajeto);
  }

  const seguinte = copiar(trajeto);
  seguinte.paradas.push({
    tipo,
    iniciadaEm: iso(inicio),
    encerradaEm: null,
    ...(coordenadaValida(posicao) ?? {}),
    ...(typeof nota === 'string' && nota.trim() ? { nota: nota.trim().slice(0, 280) } : {}),
  });
  return { ok: true, trajeto: seguinte };
}

export function encerrarParada(trajeto, { agora = Date.now() } = {}) {
  const aberta = paradaAberta(trajeto);
  if (!aberta) return falha('SEM_PARADA_ABERTA', 'Não há parada aberta para encerrar.', trajeto);

  const fim = instante(agora);
  const inicio = paraNumero(aberta.iniciadaEm);
  if (fim == null) return falha('INSTANTE_INVALIDO', 'O fim da parada precisa de um instante válido.', trajeto);
  if (inicio != null && fim < inicio) return falha('FIM_ANTES_DO_INICIO', 'A parada não pode terminar antes de começar.', trajeto);

  const seguinte = copiar(trajeto);
  const alvo = seguinte.paradas.find((parada) => parada.encerradaEm == null);
  alvo.encerradaEm = iso(fim);
  return { ok: true, trajeto: seguinte };
}

/**
 * Encerra o trajeto. Uma parada aberta é fechada no mesmo instante: deixá-la
 * aberta faria o tempo de descanso crescer para sempre depois do fim.
 */
export function encerrarTrajeto(trajeto, { agora = Date.now() } = {}) {
  if (!trajeto?.iniciadoEm) return falha('SEM_TRAJETO', 'Não há trajeto em andamento para encerrar.');
  if (trajetoEncerrado(trajeto)) return falha('TRAJETO_ENCERRADO', 'O trajeto já foi encerrado.', trajeto);

  const fim = instante(agora);
  const inicio = paraNumero(trajeto.iniciadoEm);
  if (fim == null) return falha('INSTANTE_INVALIDO', 'O fim do trajeto precisa de um instante válido.', trajeto);
  if (inicio != null && fim < inicio) return falha('FIM_ANTES_DO_INICIO', 'O trajeto não pode terminar antes de começar.', trajeto);

  const comParadaFechada = paradaAberta(trajeto) ? encerrarParada(trajeto, { agora: fim }).trajeto : copiar(trajeto);
  comParadaFechada.encerradoEm = iso(fim);
  return { ok: true, trajeto: comParadaFechada };
}

function duracaoDaParada(parada, agora) {
  const inicio = paraNumero(parada.iniciadaEm);
  if (inicio == null) return 0;
  const fim = parada.encerradaEm == null ? instante(agora) : paraNumero(parada.encerradaEm);
  return fim != null && fim > inicio ? fim - inicio : 0;
}

/**
 * Total, descanso e marcha. `tempoEmMarchaMs` é o total menos o descanso —
 * não uma medição de movimento: ficar parado sem marcar parada continua
 * contando como marcha, e é por isso que a parada é um gesto explícito.
 */
export function resumoTrajeto(trajeto, { agora = Date.now() } = {}) {
  if (!trajeto?.iniciadoEm) {
    return {
      ativo: false,
      encerrado: false,
      emParada: false,
      duracaoTotalMs: null,
      duracaoTotalLabel: 'trajeto não iniciado',
      tempoDescansandoMs: 0,
      tempoDescansandoLabel: duracaoLabel(0),
      tempoEmMarchaMs: null,
      tempoEmMarchaLabel: 'trajeto não iniciado',
      paradas: 0,
      pernoites: 0,
      iniciadoEm: null,
      encerradoEm: null,
    };
  }

  const inicio = paraNumero(trajeto.iniciadoEm);
  const fim = trajeto.encerradoEm ? paraNumero(trajeto.encerradoEm) : instante(agora);
  const total = inicio != null && fim != null && fim >= inicio ? fim - inicio : null;
  const paradas = Array.isArray(trajeto.paradas) ? trajeto.paradas : [];
  const descanso = paradas.reduce((soma, parada) => soma + duracaoDaParada(parada, fim ?? agora), 0);
  const marcha = total == null ? null : Math.max(0, total - descanso);
  const aberta = paradaAberta(trajeto);

  return {
    ativo: !trajetoEncerrado(trajeto),
    encerrado: trajetoEncerrado(trajeto),
    emParada: Boolean(aberta),
    tipoParadaAtual: aberta?.tipo ?? null,
    duracaoTotalMs: total,
    duracaoTotalLabel: duracaoLabel(total),
    tempoDescansandoMs: descanso,
    tempoDescansandoLabel: duracaoLabel(descanso),
    tempoEmMarchaMs: marcha,
    tempoEmMarchaLabel: duracaoLabel(marcha),
    paradas: paradas.filter((parada) => parada.tipo === TIPOS_PARADA.DESCANSO).length,
    pernoites: paradas.filter((parada) => parada.tipo === TIPOS_PARADA.PERNOITE).length,
    iniciadoEm: trajeto.iniciadoEm,
    encerradoEm: trajeto.encerradoEm,
  };
}
