/**
 * Alerta de exposição ao sol e de tempo sem parada.
 *
 * ## O que este módulo NÃO faz
 *
 * **Ele não mede temperatura.** Um celular comum não tem sensor de temperatura
 * do ar exposto ao aplicativo: os sensores térmicos que existem medem bateria e
 * processador, não o ambiente, e não são acessíveis por API web nem pelo
 * Capacitor. Sem rede, nenhum aplicativo de celular sabe quantos graus estão
 * fazendo naquela estrada. Dizer o contrário seria inventar um número que a
 * pessoa usaria para decidir se continua andando no sol.
 *
 * ## O que ele faz
 *
 * Duas coisas que dá para saber offline, com honestidade:
 *
 * 1. **Onde o sol está.** Elevação alta significa sombra curta e radiação mais
 *    direta. É geometria (`engine/sol.js`), disponível sem rede em qualquer
 *    lugar do mundo.
 * 2. **Há quanto tempo o grupo não para.** É relógio, e é o fator que a própria
 *    pessoa controla.
 *
 * Temperatura entra **apenas** quando alguém a fornece com fonte e horário —
 * tipicamente uma consulta feita enquanto havia rede. Uma leitura velha é
 * ignorada com o motivo declarado, em vez de virar alerta baseado no clima de
 * três horas atrás.
 */

import { posicaoSolar } from '../engine/sol.js';
import { numeroFinito, coordenadaValida } from '../engine/numero-seguro.js';

export const NIVEIS_EXPOSICAO = Object.freeze({
  NORMAL: 'NORMAL',
  ATENCAO: 'ATENCAO',
  ALTO: 'ALTO',
  CRITICO: 'CRITICO',
});

export const LIMITES_EXPOSICAO = Object.freeze({
  /** Sombra curta: o sol passa a bater quase de cima. */
  elevacaoAtencaoDeg: 45,
  /** Sol praticamente a pino. */
  elevacaoAltaDeg: 60,
  /** Caminhada contínua sem parada registrada. */
  semParadaAtencaoMs: 90 * 60_000,
  semParadaAltaMs: 120 * 60_000,
  /** Temperatura só conta se for recente. */
  idadeMaximaTemperaturaMs: 90 * 60_000,
  temperaturaAtencaoC: 32,
  temperaturaAltaC: 36,
  /** Intervalo mínimo entre dois avisos, para o aparelho não virar chocalho. */
  intervaloEntreAvisosMs: 15 * 60_000,
});

const ORDEM = [NIVEIS_EXPOSICAO.NORMAL, NIVEIS_EXPOSICAO.ATENCAO, NIVEIS_EXPOSICAO.ALTO, NIVEIS_EXPOSICAO.CRITICO];

function maiorNivel(a, b) {
  return ORDEM.indexOf(a) >= ORDEM.indexOf(b) ? a : b;
}

function temperaturaUtil(temperatura, agora) {
  if (!temperatura || typeof temperatura !== 'object') {
    return { valorC: null, motivo: 'O aparelho não mede temperatura do ar; sem uma fonte externa o cálculo usa só o sol e o tempo sem parada.' };
  }
  const valorC = numeroFinito(temperatura.valorC);
  const medidoEm = numeroFinito(temperatura.medidoEm);
  const fonte = typeof temperatura.fonte === 'string' && temperatura.fonte.trim() ? temperatura.fonte.trim() : null;
  if (valorC == null || !fonte || medidoEm == null) {
    return { valorC: null, motivo: 'A temperatura recebida não trouxe valor, fonte e horário; foi ignorada em vez de virar alerta sem origem.' };
  }
  const idade = numeroFinito(agora) - medidoEm;
  if (!(idade >= 0) || idade > LIMITES_EXPOSICAO.idadeMaximaTemperaturaMs) {
    return { valorC: null, motivo: `A temperatura de ${fonte} está velha demais para descrever agora; foi ignorada.` };
  }
  return { valorC, fonte, idadeMs: idade, motivo: null };
}

/**
 * Avalia a exposição atual.
 * `vibrar` é uma recomendação: quem chama respeita o intervalo entre avisos.
 */
export function avaliarExposicao({
  posicao = null,
  agora = Date.now(),
  ultimaParadaEm = null,
  temperatura = null,
  ultimoAvisoEm = null,
} = {}) {
  const motivos = [];
  let nivel = NIVEIS_EXPOSICAO.NORMAL;

  const coordenada = coordenadaValida(posicao);
  let elevacaoDeg = null;
  if (coordenada) {
    elevacaoDeg = posicaoSolar({ lat: coordenada.lat, lon: coordenada.lon, instanteMs: agora }).elevacaoDeg;
    if (elevacaoDeg >= LIMITES_EXPOSICAO.elevacaoAltaDeg) {
      nivel = maiorNivel(nivel, NIVEIS_EXPOSICAO.ALTO);
      motivos.push(`Sol a ${Math.round(elevacaoDeg)}° acima do horizonte: quase a pino, sombra curta e exposição direta.`);
    } else if (elevacaoDeg >= LIMITES_EXPOSICAO.elevacaoAtencaoDeg) {
      nivel = maiorNivel(nivel, NIVEIS_EXPOSICAO.ATENCAO);
      motivos.push(`Sol a ${Math.round(elevacaoDeg)}° acima do horizonte: exposição alta e sombra curta.`);
    } else if (elevacaoDeg <= 0) {
      motivos.push('Sol abaixo do horizonte.');
    }
  } else {
    motivos.push('Sem posição válida não dá para calcular a altura do sol.');
  }

  const desdeParada = ultimaParadaEm == null ? null : numeroFinito(agora) - numeroFinito(ultimaParadaEm);
  if (desdeParada != null && desdeParada >= 0) {
    const minutos = Math.round(desdeParada / 60_000);
    if (desdeParada >= LIMITES_EXPOSICAO.semParadaAltaMs) {
      nivel = maiorNivel(nivel, NIVEIS_EXPOSICAO.ALTO);
      motivos.push(`${minutos} min sem parada registrada.`);
    } else if (desdeParada >= LIMITES_EXPOSICAO.semParadaAtencaoMs) {
      nivel = maiorNivel(nivel, NIVEIS_EXPOSICAO.ATENCAO);
      motivos.push(`${minutos} min sem parada registrada.`);
    }
  }

  const leitura = temperaturaUtil(temperatura, agora);
  if (leitura.valorC == null) {
    motivos.push(leitura.motivo);
  } else if (leitura.valorC >= LIMITES_EXPOSICAO.temperaturaAltaC) {
    nivel = maiorNivel(nivel, NIVEIS_EXPOSICAO.CRITICO);
    motivos.push(`${leitura.valorC} °C segundo ${leitura.fonte}.`);
  } else if (leitura.valorC >= LIMITES_EXPOSICAO.temperaturaAtencaoC) {
    nivel = maiorNivel(nivel, NIVEIS_EXPOSICAO.ALTO);
    motivos.push(`${leitura.valorC} °C segundo ${leitura.fonte}.`);
  }

  // Sol a pino somado a muito tempo sem parada é pior que cada um isolado.
  if (elevacaoDeg != null && elevacaoDeg >= LIMITES_EXPOSICAO.elevacaoAltaDeg
      && desdeParada != null && desdeParada >= LIMITES_EXPOSICAO.semParadaAltaMs) {
    nivel = NIVEIS_EXPOSICAO.CRITICO;
  }

  const alertavel = nivel === NIVEIS_EXPOSICAO.ALTO || nivel === NIVEIS_EXPOSICAO.CRITICO;
  const desdeAviso = ultimoAvisoEm == null ? null : numeroFinito(agora) - numeroFinito(ultimoAvisoEm);
  const podeAvisar = desdeAviso == null || desdeAviso >= LIMITES_EXPOSICAO.intervaloEntreAvisosMs;

  return {
    nivel,
    motivos,
    elevacaoSolarDeg: elevacaoDeg,
    minutosSemParada: desdeParada == null || desdeParada < 0 ? null : Math.round(desdeParada / 60_000),
    temperaturaC: leitura.valorC,
    fonteTemperatura: leitura.fonte ?? null,
    vibrar: alertavel && podeAvisar,
    padraoVibracao: nivel === NIVEIS_EXPOSICAO.CRITICO ? [400, 200, 400, 200, 400] : [300, 150, 300],
    recomendacao: recomendacaoDe(nivel),
  };
}

function recomendacaoDe(nivel) {
  switch (nivel) {
    case NIVEIS_EXPOSICAO.CRITICO:
      return 'Pare na primeira sombra, beba água e espere o sol baixar antes de seguir. Se alguém estiver com tontura, náusea, pele quente e seca ou confusão, trate como emergência e procure ajuda.';
    case NIVEIS_EXPOSICAO.ALTO:
      return 'Programe uma parada na próxima sombra, hidrate o grupo e cubra a cabeça.';
    case NIVEIS_EXPOSICAO.ATENCAO:
      return 'Exposição subindo: mantenha água à mão e não deixe a próxima parada para muito longe.';
    default:
      return 'Sem sinal de exposição elevada agora; siga hidratando normalmente.';
  }
}
