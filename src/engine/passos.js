/**
 * Contador de passos pelo acelerômetro.
 *
 * ## Por que isto existe
 *
 * O operador andou dentro da faculdade, subiu escada, e o app disse que ele
 * estava quase parado. Nenhum ajuste de GPS conserta isso: **dentro de prédio
 * não há fixo**, e numa escada o deslocamento horizontal é quase zero. A única
 * fonte que sabe que a pessoa está andando é o movimento do próprio aparelho.
 *
 * O acelerômetro está em todo celular e é lido pelo navegador sem rede, sem
 * permissão no Android e sem gastar quase bateria. Ele não dá posição — dá
 * **cadência**, que é o que falta responder.
 *
 * ## Como um passo é reconhecido
 *
 * Andar é um movimento periódico: a cada passada o corpo sobe e desce, e a
 * magnitude da aceleração desenha um pico. O algoritmo:
 *
 * 1. **Magnitude** `√(x²+y²+z²)` — assim o resultado não depende de como o
 *    celular está no bolso, que é a razão de não usar um eixo só.
 * 2. **Remove a gravidade** com uma média móvel: o que interessa é a variação
 *    em torno de 9,8 m/s², não o valor absoluto.
 * 3. **Pico com limiar e histerese**: o sinal precisa subir acima do limiar e
 *    voltar abaixo dele para fechar um passo. Sem a volta, um tranco só seria
 *    contado várias vezes.
 * 4. **Janela de cadência**: passo humano vive entre ~0,25 s e ~2,0 s de
 *    intervalo (30 a 240 passos/min). Fora disso é tremor de veículo, batida
 *    ou o celular sendo manuseado — e não conta.
 *
 * ## O que ele não faz
 *
 * Não distingue subir escada de andar no plano, e não mede distância sozinho:
 * distância é `passos × comprimento da passada`, e a passada varia por pessoa,
 * por terreno e por cansaço. Por isso a passada é **calibrada contra o GPS**
 * quando o GPS está bom (ver `calibrarPassada`) em vez de ser um número
 * chutado — e enquanto não houver calibração, o valor usado é declarado como
 * estimativa, não como medida.
 *
 * Sem DOM, sem dependência, sem relógio próprio.
 */

import { numeroFinito } from './numero-seguro.js';

export const LIMITES_PASSOS = Object.freeze({
  /** Quanto a magnitude precisa exceder a média para virar candidato a pico. */
  limiarMs2: 1.2,
  /** Precisa cair abaixo disto para o passo fechar e outro poder começar. */
  reposicaoMs2: 0.5,
  /** Intervalo mínimo entre passos — acima de 240 passos/min não é caminhada. */
  intervaloMinimoMs: 250,
  /** Intervalo máximo — abaixo de 30 passos/min a cadência se perdeu. */
  intervaloMaximoMs: 2000,
  /** Constante da média móvel que estima a gravidade. Quanto menor, mais lenta. */
  alfaGravidade: 0.08,
  /** Passada padrão enquanto não houver calibração (adulto, ritmo de caminhada). */
  passadaPadraoM: 0.72,
  /** Faixa fisicamente possível para uma passada calibrada. */
  passadaMinimaM: 0.35,
  passadaMaximaM: 1.1,
});

/**
 * Detector com estado. Quem chama informa o instante — é isso que permite
 * testar uma caminhada de um minuto em milissegundos.
 */
export function criarContadorDePassos({ limites = {} } = {}) {
  const cfg = { ...LIMITES_PASSOS, ...limites };
  let gravidade = null;
  let acimaDoLimiar = false;
  let ultimoPassoEm = null;
  let passos = 0;
  let ultimaCadenciaMs = null;

  return {
    limites: Object.freeze({ ...cfg }),
    passos: () => passos,
    /** Passos por minuto do último intervalo, ou null se ainda não há dois. */
    cadenciaPpm: () => (ultimaCadenciaMs ? 60_000 / ultimaCadenciaMs : null),

    observar({ instante, x, y, z } = {}) {
      const t = numeroFinito(instante);
      const ax = numeroFinito(x);
      const ay = numeroFinito(y);
      const az = numeroFinito(z);
      if (t === null || ax === null || ay === null || az === null) {
        return { passo: false, motivo: 'LEITURA_INVALIDA', passos };
      }

      const magnitude = Math.hypot(ax, ay, az);
      // A média móvel persegue a gravidade; a diferença é o movimento.
      gravidade = gravidade === null ? magnitude : gravidade + (magnitude - gravidade) * cfg.alfaGravidade;
      const oscilacao = magnitude - gravidade;

      if (!acimaDoLimiar) {
        if (oscilacao < cfg.limiarMs2) return { passo: false, motivo: 'ABAIXO_DO_LIMIAR', passos, oscilacao };
        acimaDoLimiar = true;
        return { passo: false, motivo: 'SUBINDO', passos, oscilacao };
      }

      // Já estava acima: o passo só fecha quando o sinal volta para baixo.
      if (oscilacao > cfg.reposicaoMs2) return { passo: false, motivo: 'AINDA_NO_PICO', passos, oscilacao };
      acimaDoLimiar = false;

      const intervalo = ultimoPassoEm === null ? null : t - ultimoPassoEm;
      if (intervalo !== null && intervalo < cfg.intervaloMinimoMs) {
        return { passo: false, motivo: 'RAPIDO_DEMAIS', passos, oscilacao };
      }
      // Intervalo longo não invalida o passo: significa que a caminhada
      // recomeçou depois de uma parada. O que ele invalida é a cadência.
      ultimaCadenciaMs = intervalo !== null && intervalo <= cfg.intervaloMaximoMs ? intervalo : null;
      ultimoPassoEm = t;
      passos += 1;
      return { passo: true, motivo: 'PASSO', passos, oscilacao, intervaloMs: intervalo };
    },

    reiniciar() {
      gravidade = null;
      acimaDoLimiar = false;
      ultimoPassoEm = null;
      ultimaCadenciaMs = null;
      passos = 0;
    },
  };
}

/**
 * Comprimento da passada medido contra um trecho em que o GPS foi confiável.
 *
 * Só aceita a calibração se o resultado for fisicamente possível — um trecho
 * com deriva de GPS produziria passadas de dois metros, e engolir isso
 * estragaria toda a contagem seguinte.
 */
export function calibrarPassada({ distanciaM, passos, limites = LIMITES_PASSOS } = {}) {
  const d = numeroFinito(distanciaM);
  const n = numeroFinito(passos);
  if (d === null || n === null || n < 20 || d <= 0) {
    return { passadaM: null, aceita: false, motivo: 'AMOSTRA_INSUFICIENTE' };
  }
  const passadaM = d / n;
  if (passadaM < limites.passadaMinimaM || passadaM > limites.passadaMaximaM) {
    return { passadaM, aceita: false, motivo: 'FORA_DA_FAIXA_HUMANA' };
  }
  return { passadaM, aceita: true, motivo: 'CALIBRADA' };
}

/** Distância estimada por passos. `calibrada` diz se dá para confiar no número. */
export function distanciaPorPassos({ passos, passadaM = null, limites = LIMITES_PASSOS } = {}) {
  const n = numeroFinito(passos);
  if (n === null || n < 0) return { distanciaM: 0, passadaUsadaM: null, calibrada: false };
  const calibrada = numeroFinito(passadaM) !== null
    && passadaM >= limites.passadaMinimaM
    && passadaM <= limites.passadaMaximaM;
  const passadaUsadaM = calibrada ? passadaM : limites.passadaPadraoM;
  return { distanciaM: n * passadaUsadaM, passadaUsadaM, calibrada };
}
