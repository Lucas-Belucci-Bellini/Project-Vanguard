/**
 * Leituras da bússola: de onde o aparelho aponta até para onde caminhar.
 *
 * ## O problema que este módulo resolve
 *
 * Um celular não tem "uma" direção. O sensor devolve um número cuja referência
 * **depende do aparelho e do fabricante** — em alguns é norte magnético, em
 * outros o sistema já corrige para norte verdadeiro —, e o mapa do app trabalha
 * em norte de GRADE (MGRS/UTM), que é um terceiro norte. Tratar os três como se
 * fossem o mesmo erra dezenas de graus, e dezenas de graus numa estrada rural
 * são quilômetros no lugar errado.
 *
 * Então aqui o rumo cru do sensor é chamado do que ele é — leitura do aparelho,
 * referência desconhecida — e só vira azimute verdadeiro **depois de existir uma
 * correção medida**. Sem correção, os campos de verdadeiro e de grade ficam
 * `null` com o motivo dito, em vez de mostrarem um número que parece certo.
 *
 * ## A correção vem do Sol
 *
 * O azimute do Sol é geometria (`engine/sol.js`): dado onde e quando, ele é
 * conhecido sem rede, sem sensor e sem depender de fabricante. Apontar o
 * aparelho para o Sol e registrar a leitura mede, de uma vez, a declinação
 * magnética do lugar **e** o erro do próprio sensor. É a referência externa que
 * transforma um número duvidoso em azimute confiável — a mesma ideia de conferir
 * o instrumento contra algo que não depende dele.
 *
 * Quem já sabe a declinação da região pode informá-la direto, sem o Sol.
 *
 * ## E quando não há Sol nem quem saiba
 *
 * O terceiro caminho é o modelo: `engine/wmm.js` calcula a declinação do lugar
 * e da data pelos coeficientes oficiais do World Magnetic Model, offline. É o
 * que resolve a noite, o dia nublado e o operador que não faz ideia de qual é a
 * declinação da região onde está.
 *
 * Só que **previsão não é medida**, e a diferença fica no nome. O WMM prevê o
 * campo da TERRA: ele não vê o ímã do alto-falante, a lataria do carro, o erro
 * de fábrica do magnetômetro, nem o fato de alguns aparelhos já entregarem
 * norte verdadeiro em vez de magnético. Por isso:
 *
 * - a correção do modelo só entra quando **não existe** uma medida;
 * - quando entra, a referência é `PREVISTA`, nunca `CORRIGIDA`;
 * - e `usarModeloMagnetico` é opt-in, para que ninguém receba um azimute
 *   previsto sem ter pedido.
 *
 * O modelo é consultado de qualquer forma quando há posição, e vai no campo
 * `modeloMagnetico`: saber a declinação do lugar é informação de campo por si
 * só, e é ela que permite desconfiar de uma calibração que saiu torta.
 *
 * Módulo puro: sem DOM, sem sensor, sem relógio próprio.
 */

import { normDeg, deltaDeg } from '../engine/angles.js';
import { convergenciaMeridianos } from '../engine/mgrs.js';
import { haversine, bearingTo } from '../engine/geo.js';
import { posicaoSolar } from '../engine/sol.js';
import { anoDecimal, campoGeomagnetico } from '../engine/wmm.js';
import { numeroFinito, coordenadaValida } from '../engine/numero-seguro.js';

export const REFERENCIAS_RUMO = Object.freeze({
  DESCONHECIDA: 'DESCONHECIDA',
  /** A correção foi MEDIDA (Sol) ou informada por quem sabe. Vale mais. */
  CORRIGIDA: 'CORRIGIDA',
  /** A correção veio do MODELO, sob a hipótese de que o sensor lê magnético. */
  PREVISTA: 'PREVISTA',
});

/**
 * De onde saiu a correção aplicada. A ordem importa: medida ganha de prevista,
 * sempre — o modelo prevê o campo da Terra e não sabe nada sobre este aparelho.
 */
export const FONTES_CORRECAO = Object.freeze({
  SOL: 'SOL',
  MANUAL: 'MANUAL',
  MODELO: 'MODELO',
});

export const LADOS = Object.freeze({
  ESQUERDA: 'ESQUERDA',
  DIREITA: 'DIREITA',
  EM_ROTA: 'EM_ROTA',
});

/** Dentro disso a pessoa está seguindo o rumo; fora, precisa corrigir. */
export const TOLERANCIA_EM_ROTA_DEG = 5;

/** O Sol baixo demais ou alto demais não serve de referência de azimute. */
export const LIMITES_CALIBRACAO_SOL = Object.freeze({
  elevacaoMinimaDeg: 5,
  elevacaoMaximaDeg: 70,
});

const CARDEAIS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];

export function cardeal(graus) {
  const valor = numeroFinito(graus);
  return valor == null ? null : CARDEAIS[Math.round(normDeg(valor) / 45) % 8];
}

function lado(desvioDeg) {
  if (Math.abs(desvioDeg) <= TOLERANCIA_EM_ROTA_DEG) return LADOS.EM_ROTA;
  return desvioDeg > 0 ? LADOS.DIREITA : LADOS.ESQUERDA;
}

/**
 * Mede a correção do sensor apontando o aparelho para o Sol.
 * Devolve quanto somar à leitura crua para obter azimute verdadeiro.
 */
export function calibrarPeloSol({ rumoSensorDeg, posicao, agora = Date.now() } = {}) {
  const rumo = numeroFinito(rumoSensorDeg);
  const coordenada = coordenadaValida(posicao);
  if (rumo == null) return { ok: false, codigo: 'SEM_RUMO', motivo: 'O sensor não forneceu uma leitura para comparar com o Sol.' };
  if (!coordenada) return { ok: false, codigo: 'SEM_POSICAO', motivo: 'Sem posição válida não dá para saber onde o Sol está.' };

  const sol = posicaoSolar({ lat: coordenada.lat, lon: coordenada.lon, instanteMs: agora });
  if (sol.elevacaoDeg < LIMITES_CALIBRACAO_SOL.elevacaoMinimaDeg) {
    return { ok: false, codigo: 'SOL_BAIXO', motivo: `O Sol está a ${Math.round(sol.elevacaoDeg)}° do horizonte; abaixo de ${LIMITES_CALIBRACAO_SOL.elevacaoMinimaDeg}° a direção dele não é confiável para calibrar.` };
  }
  if (sol.elevacaoDeg > LIMITES_CALIBRACAO_SOL.elevacaoMaximaDeg) {
    return { ok: false, codigo: 'SOL_A_PINO', motivo: `O Sol está a ${Math.round(sol.elevacaoDeg)}° do horizonte; quase a pino a direção dele muda rápido demais para servir de referência.` };
  }

  // O que somar à leitura crua para ela virar azimute verdadeiro.
  const correcaoDeg = deltaDeg(rumo, sol.azimuteDeg);
  return {
    ok: true,
    correcaoDeg,
    azimuteSolDeg: sol.azimuteDeg,
    elevacaoSolDeg: sol.elevacaoDeg,
    medidaEm: new Date(agora).toISOString(),
    motivo: `Correção de ${correcaoDeg >= 0 ? '+' : ''}${correcaoDeg.toFixed(1)}° medida contra o Sol a ${Math.round(sol.azimuteDeg)}°.`,
  };
}

function leituraDoDestino({ posicao, destino, azimuteVerdadeiroAtual, convergenciaDeg }) {
  const origem = coordenadaValida(posicao);
  const alvo = coordenadaValida(destino);
  if (!origem || !alvo) return null;

  const azimuteVerdadeiroDeg = normDeg(bearingTo(origem, alvo));
  const distanciaM = haversine(origem, alvo);
  const desvioDeg = azimuteVerdadeiroAtual == null ? null : deltaDeg(azimuteVerdadeiroAtual, azimuteVerdadeiroDeg);

  return {
    nome: typeof destino?.nome === 'string' && destino.nome.trim() ? destino.nome.trim().slice(0, 80) : null,
    azimuteVerdadeiroDeg,
    // grade = verdadeiro − convergência (a mesma convenção do motor de tiro).
    azimuteGradeDeg: convergenciaDeg == null ? null : normDeg(azimuteVerdadeiroDeg - convergenciaDeg),
    // O rumo de volta: o que seguir para desfazer o caminho.
    azimuteRetornoDeg: normDeg(azimuteVerdadeiroDeg + 180),
    cardeal: cardeal(azimuteVerdadeiroDeg),
    distanciaM,
    desvioDeg,
    lado: desvioDeg == null ? null : lado(desvioDeg),
  };
}

/**
 * Compõe todas as leituras da tela a partir do que se sabe agora.
 * Campo `null` significa "não dá para afirmar", nunca "zero".
 */
export function lerBussola({
  rumoSensorDeg = null,
  correcaoSensorDeg = null,
  correcaoFonte = null,
  posicao = null,
  destino = null,
  rumoTravadoDeg = null,
  usarModeloMagnetico = false,
  agora = Date.now(),
} = {}) {
  const avisos = [];
  const rumoCru = numeroFinito(rumoSensorDeg) == null ? null : normDeg(numeroFinito(rumoSensorDeg));
  const correcaoMedida = numeroFinito(correcaoSensorDeg);
  const coordenada = coordenadaValida(posicao);

  const convergenciaDeg = coordenada ? convergenciaMeridianos(coordenada.lat, coordenada.lon) : null;
  if (!coordenada) avisos.push('Sem posição não dá para calcular o norte de grade nem a direção do Sol.');

  // O modelo é consultado sempre que houver posição, mesmo quando não vai ser
  // usado como correção: saber a declinação do lugar é informação de campo por
  // si só, e é ela que permite conferir uma calibração suspeita.
  const modeloMagnetico = coordenada
    ? campoGeomagnetico({ lat: coordenada.lat, lon: coordenada.lon, ano: anoDecimal(agora) })
    : null;

  // Medida ganha de prevista. O modelo prevê o campo da TERRA: ele não vê o ímã
  // do alto-falante, a lataria do carro, o erro de fábrica do magnetômetro, nem
  // o fato de alguns aparelhos já entregarem norte verdadeiro. Por isso a
  // correção do modelo entra apenas quando não há uma medida, e quando entra a
  // leitura passa a ser PREVISTA, nunca CORRIGIDA.
  const podeUsarModelo = correcaoMedida == null
    && usarModeloMagnetico === true
    && modeloMagnetico?.ok === true;
  const correcao = correcaoMedida ?? (podeUsarModelo ? modeloMagnetico.declinacaoDeg : null);
  const fonteCorrecao = correcao == null
    ? null
    : (correcaoMedida != null
      ? (correcaoFonte ?? FONTES_CORRECAO.MANUAL)
      : FONTES_CORRECAO.MODELO);

  const azimuteVerdadeiroDeg = rumoCru == null || correcao == null ? null : normDeg(rumoCru + correcao);
  let referencia = REFERENCIAS_RUMO.DESCONHECIDA;
  if (azimuteVerdadeiroDeg != null) {
    referencia = fonteCorrecao === FONTES_CORRECAO.MODELO
      ? REFERENCIAS_RUMO.PREVISTA
      : REFERENCIAS_RUMO.CORRIGIDA;
  }

  if (rumoCru != null && correcao == null) {
    avisos.push('A leitura do aparelho ainda não foi corrigida: a referência dela (magnética ou verdadeira) depende do modelo. Calibre pelo Sol ou informe a declinação para obter azimute verdadeiro e de grade.');
  }
  if (referencia === REFERENCIAS_RUMO.PREVISTA) {
    avisos.push(`Azimute PREVISTO: a correção de ${modeloMagnetico.declinacaoDeg >= 0 ? '+' : ''}${modeloMagnetico.declinacaoDeg.toFixed(1)}° veio do ${modeloMagnetico.modelo.nome}, supondo que este aparelho entrega norte magnético. O modelo não enxerga ímã por perto nem erro do próprio sensor — calibre pelo Sol quando puder.`);
  }
  if (usarModeloMagnetico === true && modeloMagnetico && modeloMagnetico.ok === false) {
    avisos.push(`Modelo magnético indisponível aqui: ${modeloMagnetico.explicacao}`);
  }

  const azimuteGradeDeg = azimuteVerdadeiroDeg == null || convergenciaDeg == null
    ? null
    : normDeg(azimuteVerdadeiroDeg - convergenciaDeg);

  let sol = null;
  if (coordenada) {
    const posicaoDoSol = posicaoSolar({ lat: coordenada.lat, lon: coordenada.lon, instanteMs: agora });
    sol = {
      azimuteDeg: posicaoDoSol.azimuteDeg,
      elevacaoDeg: posicaoDoSol.elevacaoDeg,
      acimaDoHorizonte: posicaoDoSol.acimaDoHorizonte,
      cardeal: cardeal(posicaoDoSol.azimuteDeg),
      // Para onde girar, a partir da leitura crua, até apontar no Sol.
      desvioDaLeituraDeg: rumoCru == null ? null : deltaDeg(rumoCru, posicaoDoSol.azimuteDeg),
      serveParaCalibrar: posicaoDoSol.elevacaoDeg >= LIMITES_CALIBRACAO_SOL.elevacaoMinimaDeg
        && posicaoDoSol.elevacaoDeg <= LIMITES_CALIBRACAO_SOL.elevacaoMaximaDeg,
    };
  }

  const travado = numeroFinito(rumoTravadoDeg);
  let rumoTravado = null;
  if (travado != null) {
    const referenciaAtual = azimuteVerdadeiroDeg ?? rumoCru;
    const desvioDeg = referenciaAtual == null ? null : deltaDeg(referenciaAtual, normDeg(travado));
    rumoTravado = {
      azimuteDeg: normDeg(travado),
      cardeal: cardeal(travado),
      azimuteRetornoDeg: normDeg(travado + 180),
      desvioDeg,
      lado: desvioDeg == null ? null : lado(desvioDeg),
      // Sem correção o desvio ainda serve: é a diferença entre duas leituras
      // do mesmo sensor, e o erro comum se cancela.
      relativoAoSensor: azimuteVerdadeiroDeg == null,
    };
  }

  return {
    rumoCruDeg: rumoCru,
    cardealCru: cardeal(rumoCru),
    correcaoSensorDeg: correcao,
    fonteCorrecao,
    referencia,
    /** O que o WMM diz aqui e agora — mesmo quando não é ele quem corrige. */
    modeloMagnetico,
    azimuteVerdadeiroDeg,
    cardealVerdadeiro: cardeal(azimuteVerdadeiroDeg),
    azimuteGradeDeg,
    convergenciaDeg,
    azimuteRetornoDeg: azimuteVerdadeiroDeg == null ? null : normDeg(azimuteVerdadeiroDeg + 180),
    destino: leituraDoDestino({ posicao, destino, azimuteVerdadeiroAtual: azimuteVerdadeiroDeg, convergenciaDeg }),
    sol,
    rumoTravado,
    avisos,
  };
}
