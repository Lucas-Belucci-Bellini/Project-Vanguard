/**
 * Média de fixos parado: transformar vários fixos ruins num fixo bom.
 *
 * ## A ideia, e o seu limite
 *
 * Parado, cada fixo do GPS é a mesma posição com um erro diferente somado. A
 * média de N medidas independentes tem desvio padrão `σ/√N` — é o teorema, e é
 * por isso que topógrafo deixa o receptor parado em cima do ponto. Com 9 fixos
 * o espalhamento cai **três vezes**: um fixo de 24 m vira uma posição de 8 m,
 * sem hardware novo, só esperando.
 *
 * O limite é honesto e está escrito no código: **erro de GNSS não é ruído
 * branco.** Multicaminho, ionosfera e a geometria dos satélites erram na mesma
 * direção por dezenas de segundos. Fixos colhidos meio segundo depois um do
 * outro carregam quase o mesmo erro — mediá-los não melhora quase nada, e
 * anunciar `√N` neles seria mentir com estatística.
 *
 * Então este módulo faz três coisas contra si mesmo:
 *
 * 1. **Exige espaçamento no tempo** (`intervaloMinimoMs`) — fixo grudado no
 *    anterior é descartado como redundante, não somado como se fosse novo.
 * 2. **Limita o ganho anunciado** a `ganhoMaximo` (3×) por mais fixos que
 *    entrem. O `√N` continua valendo como conta; o que não vale é prometê-lo.
 * 3. **Encerra a média quando a pessoa anda.** Média só existe parado; somar
 *    fixos de lugares diferentes produz um ponto onde ninguém esteve.
 *
 * ## Ponderação
 *
 * Fixos não valem o mesmo. A média é ponderada por `1/σ²` (inverso da
 * variância), que é o estimador de variância mínima para medidas de precisões
 * diferentes — um fixo de 5 m pesa 36 vezes mais que um de 30 m, como deve.
 *
 * ## O que `accuracy` quer dizer, e por que isso importa aqui
 *
 * Na especificação de geolocalização da W3C, `accuracy` é o raio de **95% de
 * confiança**, não o desvio padrão. Num espalhamento circular isso é 2,45·σ.
 * Confundir os dois estraga o detector de movimento nos dois sentidos: tratar
 * o raio de 95% como σ faz o ruído normal parecer deslocamento e destrói a
 * média a cada fixo torto; tratar σ como raio de 95% deixa a pessoa andar sem
 * ninguém perceber. Aqui `accuracy` é lido como o que ele é — e por isso um
 * fixo além dele é raro por acaso (5%), o que o torna um limiar utilizável.
 *
 * Mesmo assim um fixo solto além do limite **não** encerra a média: 5% de 24
 * fixos é mais de um por janela. Só encerra quando fixos seguidos concordam
 * que a pessoa saiu do lugar. Perder uma média boa por causa de um outlier é
 * exatamente o defeito que este módulo existe para evitar.
 *
 * Módulo puro: sem DOM, sem sensor, sem relógio próprio.
 */

import { haversine } from './geo.js';
import { numeroFinito, coordenadaValida } from './numero-seguro.js';

export const LIMITES_FIXO_MEDIO = Object.freeze({
  /** Abaixo disto não há média: um ou dois fixos não são amostra. */
  amostrasMinimas: 4,
  /** Guardar mais que isto não melhora o que já está limitado pelo teto. */
  amostrasMaximas: 24,
  /** Fixos mais juntos que isto carregam o mesmo erro; não contam de novo. */
  intervaloMinimoMs: 900,
  /** Fixo mais velho que isto sai da janela: a ionosfera de dois minutos atrás é outra. */
  janelaMaximaMs: 120_000,
  /** Deslocamento acima disto é candidato a movimento… */
  raioParadoM: 8,
  /** …ou acima do raio de 95% do próprio fixo, o que for maior. */
  fatorRaioPrecisao: 1,
  /** Fixos seguidos fora do raio para declarar que a pessoa andou. */
  confirmacoesMovimento: 2,
  /**
   * Teto da melhora ANUNCIADA — deliberadamente abaixo da melhora medida.
   *
   * Em ruído branco a média de 12 fixos reduziu o erro real 2,73× (medido em
   * `test/fixo-medio.test.js`), e a conta formal daria 3,46×. O número que o
   * app mostra é limitado a 2,5× de propósito: no campo o erro de GNSS é
   * correlacionado e a melhora é menor que a do laboratório. Precisão
   * anunciada melhor que a real é o pior defeito possível aqui — é o que faz
   * alguém confiar numa posição que não merece confiança.
   */
  ganhoMaximo: 2.5,
  /** Precisão pior que isto não entra: fixo de rede não é fixo de satélite. */
  precisaoMaximaM: 60,
});

export const ESTADOS_MEDIA = Object.freeze({
  VAZIA: 'VAZIA',
  ACUMULANDO: 'ACUMULANDO',
  PRONTA: 'PRONTA',
  MOVEU: 'MOVEU',
});

function pesoDoFixo(precisaoM, limites) {
  // Sem precisão informada o fixo entra com o peso do pior aceito: ele conta,
  // mas não puxa a média para si.
  const sigma = precisaoM == null ? limites.precisaoMaximaM : Math.max(1, precisaoM);
  return 1 / (sigma * sigma);
}

function normalizarFixo(fixo, limites) {
  if (!coordenadaValida(fixo)) return null;
  const precisaoM = numeroFinito(fixo.accuracy);
  if (precisaoM != null && precisaoM > limites.precisaoMaximaM) return null;
  return {
    lat: Number(fixo.lat),
    lon: Number(fixo.lon),
    accuracy: precisaoM != null && precisaoM >= 0 ? precisaoM : null,
    altitude: numeroFinito(fixo.altitude),
    timestamp: numeroFinito(fixo.timestamp ?? fixo.createdAt),
  };
}

/**
 * Média ponderada de uma lista de fixos, sem estado.
 * A longitude é somada como diferença em relação ao primeiro fixo: somar
 * longitudes cruas quebra em cima do antimeridiano, onde −179,9 e +179,9 são
 * vizinhos e a média ingênua cai no meio do mundo errado.
 */
export function mediaPonderadaDeFixos(fixos = [], limites = {}) {
  const cfg = { ...LIMITES_FIXO_MEDIO, ...limites };
  const validos = fixos.map((f) => normalizarFixo(f, cfg)).filter(Boolean);
  if (!validos.length) {
    return { ok: false, motivo: 'Nenhum fixo válido para mediar.', amostras: 0 };
  }

  const referencia = validos[0];
  let somaPeso = 0;
  let somaLat = 0;
  let somaLonDelta = 0;
  let somaAlt = 0;
  let pesoAlt = 0;
  for (const fixo of validos) {
    const peso = pesoDoFixo(fixo.accuracy, cfg);
    somaPeso += peso;
    somaLat += peso * fixo.lat;
    let delta = fixo.lon - referencia.lon;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    somaLonDelta += peso * delta;
    if (fixo.altitude != null) { somaAlt += peso * fixo.altitude; pesoAlt += peso; }
  }

  const lat = somaLat / somaPeso;
  let lon = referencia.lon + somaLonDelta / somaPeso;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;

  // A precisão formal da média ponderada: 1/√(Σ 1/σ²). É a conta certa — e é
  // justamente por ela ser otimista para GNSS que o teto existe abaixo.
  const precisaoFormalM = 1 / Math.sqrt(somaPeso);
  const precisaoTipicaM = medianaPrecisao(validos, cfg);
  const piso = precisaoTipicaM / cfg.ganhoMaximo;
  const accuracy = Math.max(precisaoFormalM, piso);

  return {
    ok: true,
    lat,
    lon,
    accuracy,
    ...(pesoAlt > 0 ? { altitude: somaAlt / pesoAlt } : {}),
    amostras: validos.length,
    precisaoFormalM,
    precisaoTipicaM,
    limitadaPeloTeto: piso > precisaoFormalM,
    ganho: precisaoTipicaM / accuracy,
    timestamp: validos[validos.length - 1].timestamp ?? null,
  };
}

function medianaPrecisao(fixos, limites) {
  const valores = fixos.map((f) => (f.accuracy == null ? limites.precisaoMaximaM : f.accuracy)).sort((a, b) => a - b);
  const meio = Math.floor(valores.length / 2);
  return valores.length % 2 ? valores[meio] : (valores[meio - 1] + valores[meio]) / 2;
}

/**
 * Acumulador com memória: alimente com cada fixo que chegar. Ele decide
 * sozinho o que entra, o que é redundante e quando a pessoa saiu do lugar.
 */
export function criarMediaDeFixos(limites = {}) {
  const cfg = { ...LIMITES_FIXO_MEDIO, ...limites };
  let janela = [];
  let descartadosPorTempo = 0;
  let ultimoMotivo = null;
  let pendentes = [];

  function centro() {
    return janela.length ? mediaPonderadaDeFixos(janela, cfg) : null;
  }

  function podarPorIdade(agoraMs) {
    if (agoraMs == null) return;
    janela = janela.filter((f) => f.timestamp == null || agoraMs - f.timestamp <= cfg.janelaMaximaMs);
  }

  function resultado(estado) {
    const media = centro();
    const pronta = estado === ESTADOS_MEDIA.PRONTA;
    return {
      estado,
      amostras: janela.length,
      descartadosPorTempo,
      motivo: ultimoMotivo,
      posicao: pronta && media?.ok
        ? {
            lat: media.lat,
            lon: media.lon,
            accuracy: media.accuracy,
            ...(media.altitude != null ? { altitude: media.altitude } : {}),
            timestamp: media.timestamp,
            mediada: true,
            amostras: media.amostras,
          }
        : null,
      ganho: pronta && media?.ok ? media.ganho : 1,
      precisaoFormalM: media?.ok ? media.precisaoFormalM : null,
      precisaoTipicaM: media?.ok ? media.precisaoTipicaM : null,
      limitadaPeloTeto: media?.ok ? media.limitadaPeloTeto : false,
    };
  }

  return {
    reiniciar() {
      janela = [];
      descartadosPorTempo = 0;
      ultimoMotivo = null;
      pendentes = [];
    },
    estado: () => resultado(janela.length >= cfg.amostrasMinimas ? ESTADOS_MEDIA.PRONTA : janela.length ? ESTADOS_MEDIA.ACUMULANDO : ESTADOS_MEDIA.VAZIA),
    adicionar(fixoBruto) {
      const fixo = normalizarFixo(fixoBruto, cfg);
      if (!fixo) {
        ultimoMotivo = 'Fixo sem coordenada válida ou com precisão pior que o limite.';
        return resultado(janela.length >= cfg.amostrasMinimas ? ESTADOS_MEDIA.PRONTA : janela.length ? ESTADOS_MEDIA.ACUMULANDO : ESTADOS_MEDIA.VAZIA);
      }

      podarPorIdade(fixo.timestamp);

      const anterior = janela[janela.length - 1];
      if (anterior && fixo.timestamp != null && anterior.timestamp != null
        && fixo.timestamp - anterior.timestamp < cfg.intervaloMinimoMs) {
        // Não é um erro — é um fixo que não traz informação nova. Contá-lo
        // encolheria a precisão anunciada sem encolher o erro real.
        descartadosPorTempo += 1;
        ultimoMotivo = 'Fixo repetido cedo demais para trazer erro independente.';
        return resultado(janela.length >= cfg.amostrasMinimas ? ESTADOS_MEDIA.PRONTA : janela.length ? ESTADOS_MEDIA.ACUMULANDO : ESTADOS_MEDIA.VAZIA);
      }

      const media = centro();
      if (media?.ok) {
        const afastamentoM = haversine({ lat: media.lat, lon: media.lon }, fixo);
        const tolerancia = Math.max(
          cfg.raioParadoM,
          (fixo.accuracy ?? cfg.raioParadoM) * cfg.fatorRaioPrecisao,
        );
        if (afastamentoM > tolerancia) {
          pendentes.push(fixo);
          if (pendentes.length < cfg.confirmacoesMovimento) {
            // Um fixo torto sozinho é ruído, não caminhada. Ele fica de lado:
            // não entra na média (puxaria o ponto) nem a destrói.
            ultimoMotivo = `Fixo a ${Math.round(afastamentoM)} m do centro, aguardando confirmação antes de encerrar a média.`;
            return resultado(janela.length >= cfg.amostrasMinimas ? ESTADOS_MEDIA.PRONTA : ESTADOS_MEDIA.ACUMULANDO);
          }
          // Fixos seguidos concordam: andou. A média recomeça a partir deles —
          // arrastar a anterior produziria um ponto no meio do caminho, onde a
          // pessoa não parou nem está.
          janela = pendentes.slice(-cfg.amostrasMaximas);
          pendentes = [];
          descartadosPorTempo = 0;
          ultimoMotivo = `Deslocamento de ${Math.round(afastamentoM)} m encerrou a média; ela recomeça aqui.`;
          return resultado(janela.length >= cfg.amostrasMinimas ? ESTADOS_MEDIA.PRONTA : ESTADOS_MEDIA.MOVEU);
        }
        // Voltou para dentro do raio: o que estava pendente era ruído mesmo.
        pendentes = [];
      }

      janela.push(fixo);
      if (janela.length > cfg.amostrasMaximas) janela.shift();
      ultimoMotivo = null;
      return resultado(janela.length >= cfg.amostrasMinimas ? ESTADOS_MEDIA.PRONTA : ESTADOS_MEDIA.ACUMULANDO);
    },
  };
}
