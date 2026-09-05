/**
 * Tempestade — a distância do raio pelo trovão, e a regra que decide abrigo.
 *
 * ## Por que isto é motor e não tela
 *
 * É a única medida de tempestade que **não precisa de rede**. Previsão do
 * tempo chega pela internet e envelhece; o intervalo entre o clarão e o
 * trovão é física, acontece no lugar onde a pessoa está, e responde a
 * pergunta que importa numa estrada à noite: *a tempestade está vindo para
 * cima de mim ou está indo embora?*
 *
 * ## A conta
 *
 * A luz chega praticamente instantânea (300 000 km/s: 10 km em 33 µs). O som
 * leva o tempo. A velocidade do som no ar **depende da temperatura**:
 *
 *     c ≈ 331,3 + 0,606 · T   (T em °C, ar seco ao nível do mar)
 *
 * A 0 °C são 331 m/s; a 30 °C são 349 m/s — 5 % de diferença. A regra de bolso
 * "divide por 3" assume ~343 m/s, que é a velocidade a **20 °C**. Numa noite
 * fria de serra a 5 °C a regra erra 2 % para menos; é pouco, e por isso a
 * regra de bolso é boa — mas quando a temperatura é conhecida, usá-la é de
 * graça.
 *
 * ## O que esta medida NÃO é
 *
 * Um raio não é um ponto: o canal tem **quilômetros** de comprimento. O que se
 * mede é a distância até o pedaço **mais próximo** do canal, não até onde o
 * clarão pareceu estar. E o erro humano de cronometragem — dedo no clarão,
 * dedo no trovão — vale uns 0,3 s em cada ponta, o que a 343 m/s são cerca de
 * 100 m por ponta. Por isso `distanciaDoTrovao` devolve a **incerteza junto**,
 * e nunca um número sozinho.
 *
 * ## A regra 30/30
 *
 * É a orientação consolidada de serviços meteorológicos (NOAA/NWS e
 * congêneres), e existe porque raio cai longe da chuva:
 *
 * - **Clarão a trovão de 30 s ou menos** (≈ 10 km) → já se está no alcance.
 *   Procurar abrigo agora.
 * - **Esperar 30 minutos depois do último trovão** antes de sair do abrigo.
 *
 * Descargas do tipo "bolt from the blue" saem da bigorna da nuvem e atingem o
 * solo a 10–15 km da chuva, sob céu que parece limpo. É por isso que "não está
 * chovendo aqui" não é informação de segurança.
 *
 * Sem DOM, sem dependência, sem relógio próprio.
 */

import { numeroFinito } from './numero-seguro.js';

/** Temperatura suposta quando não há medida. Suposição declarada, não escondida. */
export const TEMPERATURA_PADRAO_C = 20;

/** Coeficientes da velocidade do som no ar: c = base + porGrau · T (T em °C). */
const SOM_BASE_MS = 331.3;
const SOM_POR_GRAU = 0.606;

/**
 * Velocidade do som a 20 °C — a que a regra de bolso "divide por 3" assume.
 *
 * **Derivada da fórmula, não escrita à mão.** Escrita à parte ela valia 343,2
 * enquanto a função devolvia 343,42: dois números para a mesma grandeza, e o
 * teste pegou. Constante e fórmula que podem divergir sempre divergem.
 */
export const VELOCIDADE_SOM_20C = SOM_BASE_MS + SOM_POR_GRAU * TEMPERATURA_PADRAO_C;

/**
 * Erro humano de cronometragem, por ponta (clarão e trovão), em segundos.
 *
 * Tempo de reação simples a um estímulo visual fica em torno de 0,25 s e a um
 * som em torno de 0,17 s; parte se cancela porque o atraso existe nas duas
 * pontas. 0,3 s por ponta é conservador de propósito: numa medida de
 * segurança, exagerar a incerteza custa cautela, subestimá-la custa outra
 * coisa.
 */
export const ERRO_CRONOMETRAGEM_S = 0.3;

/** Dentro disto a tempestade já alcança quem está fora. Regra 30/30. */
export const SEGUNDOS_ABRIGO = 30;

/** Depois do último trovão, o tempo de espera antes de sair do abrigo. */
export const ESPERA_APOS_ULTIMO_TROVAO_MS = 30 * 60 * 1000;

export const RISCO = Object.freeze({
  /** ≤ 30 s: dentro do alcance. Abrigo agora. */
  ABRIGO_AGORA: 'ABRIGO_AGORA',
  /** 30–60 s: perto, e tempestade muda de direção. Preparar para abrigar. */
  APROXIMANDO: 'APROXIMANDO',
  /** > 60 s: longe por enquanto — o que não é o mesmo que seguro. */
  DISTANTE: 'DISTANTE',
  /** Sem medida. Nunca é "sem risco". */
  DESCONHECIDO: 'DESCONHECIDO',
});

/** Velocidade do som no ar para uma temperatura em °C. */
export function velocidadeDoSom(temperaturaC = TEMPERATURA_PADRAO_C) {
  const t = numeroFinito(temperaturaC);
  // Fora desta faixa não é ar de superfície habitável: é dado corrompido, e
  // usar o valor mesmo assim daria uma distância com aparência de medida.
  if (t === null || t < -60 || t > 60) return VELOCIDADE_SOM_20C;
  return SOM_BASE_MS + SOM_POR_GRAU * t;
}

/**
 * Distância até o raio, a partir do intervalo clarão → trovão.
 *
 * Devolve a incerteza junto porque um número sozinho aqui vira decisão: "3 km"
 * soa preciso, "3,0 km ± 0,1" mostra que a conta tem margem — e "1 km ± 0,1"
 * deixa claro que a diferença entre 0,9 e 1,1 km não muda o que fazer.
 */
export function distanciaDoTrovao(segundos, { temperaturaC = null } = {}) {
  const s = numeroFinito(segundos);
  if (s === null || s < 0) {
    return { valida: false, motivo: 'INTERVALO_INVALIDO', metros: null, incertezaM: null, risco: RISCO.DESCONHECIDO };
  }
  // Acima disto o trovão não chega mais audível (absorção do ar e refração
  // desviam o som para cima): 25 km é o limite prático citado na literatura, e
  // "ouvi um trovão de 40 km" quase sempre é um segundo raio, não o mesmo.
  if (s > 90) {
    return { valida: false, motivo: 'LONGE_DEMAIS_PARA_SER_O_MESMO_RAIO', metros: null, incertezaM: null, risco: RISCO.DESCONHECIDO };
  }

  const temMedida = numeroFinito(temperaturaC) !== null;
  const c = velocidadeDoSom(temMedida ? temperaturaC : TEMPERATURA_PADRAO_C);
  const metros = s * c;
  const incertezaM = ERRO_CRONOMETRAGEM_S * c;

  return {
    valida: true,
    segundos: s,
    metros,
    incertezaM,
    velocidadeSomMs: c,
    /** Diz se a temperatura foi medida ou suposta — muda o que o número vale. */
    temperaturaMedida: temMedida,
    risco: s <= SEGUNDOS_ABRIGO ? RISCO.ABRIGO_AGORA : s <= 60 ? RISCO.APROXIMANDO : RISCO.DISTANTE,
  };
}

/**
 * A tempestade está vindo ou indo embora?
 *
 * É a pergunta que decide se dá para continuar andando. Compara as medidas na
 * ordem em que foram tomadas; com menos de duas não responde, em vez de
 * chutar uma tendência a partir de um ponto só.
 */
export function tendencia(medidasSegundos = []) {
  const lista = (Array.isArray(medidasSegundos) ? medidasSegundos : [])
    .map((v) => numeroFinito(v))
    .filter((v) => v !== null && v >= 0);
  if (lista.length < 2) return { conhecida: false, sentido: 'INDEFINIDA', amostras: lista.length };

  // Média da primeira metade contra a da segunda: um raio isolado mais perto
  // não inverte a leitura de uma tempestade que está indo embora.
  const meio = Math.floor(lista.length / 2);
  const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const antes = media(lista.slice(0, meio || 1));
  const depois = media(lista.slice(meio));
  const deltaS = depois - antes;

  // Abaixo de 2 s de diferença é ruído de cronometragem, não deslocamento.
  if (Math.abs(deltaS) < 2) return { conhecida: true, sentido: 'ESTAVEL', deltaS, amostras: lista.length };
  return {
    conhecida: true,
    sentido: deltaS < 0 ? 'APROXIMANDO' : 'AFASTANDO',
    deltaS,
    amostras: lista.length,
  };
}

/**
 * Quanto falta dos 30 minutos depois do último trovão.
 *
 * A segunda metade da regra 30/30 é a que as pessoas ignoram: a maior parte
 * das mortes por raio em atividade ao ar livre acontece **depois** do pico da
 * tempestade, quando parece ter passado.
 */
export function esperaRestante(ultimoTrovaoMs, agoraMs) {
  const ultimo = numeroFinito(ultimoTrovaoMs);
  const agora = numeroFinito(agoraMs);
  if (ultimo === null || agora === null) return { conhecida: false, restanteMs: null, liberado: false };
  const restanteMs = Math.max(0, ESPERA_APOS_ULTIMO_TROVAO_MS - (agora - ultimo));
  return { conhecida: true, restanteMs, liberado: restanteMs === 0 };
}

/**
 * Códigos WMO do Open-Meteo em texto — e a informação de trovoada separada.
 *
 * A tela precisa saber "tem trovoada prevista?" sem interpretar número mágico
 * espalhado pelo código.
 */
export function descreverTempo(codigo) {
  const c = numeroFinito(codigo);
  const tabela = {
    0: 'Céu limpo', 1: 'Predominantemente limpo', 2: 'Parcialmente nublado', 3: 'Encoberto',
    45: 'Névoa', 48: 'Névoa com geada',
    51: 'Garoa fraca', 53: 'Garoa', 55: 'Garoa forte',
    56: 'Garoa congelante fraca', 57: 'Garoa congelante',
    61: 'Chuva fraca', 63: 'Chuva', 65: 'Chuva forte',
    66: 'Chuva congelante fraca', 67: 'Chuva congelante',
    71: 'Neve fraca', 73: 'Neve', 75: 'Neve forte', 77: 'Grãos de neve',
    80: 'Pancadas fracas', 81: 'Pancadas', 82: 'Pancadas violentas',
    85: 'Pancadas de neve fracas', 86: 'Pancadas de neve',
    95: 'TROVOADA', 96: 'TROVOADA COM GRANIZO', 99: 'TROVOADA COM GRANIZO FORTE',
  };
  return {
    codigo: c,
    texto: c !== null && tabela[c] ? tabela[c] : 'Condição não informada',
    trovoada: c === 95 || c === 96 || c === 99,
    granizo: c === 96 || c === 99,
    chuva: c !== null && ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95),
  };
}
