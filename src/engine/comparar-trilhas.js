/**
 * Comparar trilhas — o que cada pessoa andou de verdade.
 *
 * ## A pergunta
 *
 * Numa peregrinação, dez pessoas saem do mesmo lugar e chegam no mesmo lugar,
 * e **nenhuma anda a mesma coisa**. Uma corta por dentro, outra erra a saída e
 * volta, outra pega carona num trecho, outra faz a variante por outra cidade.
 * No fim, "andei o Caminho" quer dizer coisas diferentes para cada uma.
 *
 * Este módulo responde três coisas, e nenhuma delas é opinião:
 *
 * 1. **Quanto essa pessoa andou** — pelo odômetro, com vão de sinal declarado.
 * 2. **Quanto disso foi sobre o caminho de referência** — a fração dos pontos
 *    dela que caiu dentro de uma faixa em torno da linha de referência.
 * 3. **O que ela não percorreu** — os trechos da referência por onde nenhum
 *    ponto dela passou.
 *
 * ## Referência não é verdade
 *
 * O traçado de referência é só *uma* trilha: pode ser antiga, pode ter sido
 * mudada, pode estar errada. Por isso o módulo nunca diz que alguém "errou" —
 * ele diz **onde as duas divergem** e **quanto**. Quem decide o que isso
 * significa é quem organizou a caminhada.
 *
 * Um traçado de 2019 comparado com a caminhada de hoje pode acusar 4 km "fora
 * do caminho" simplesmente porque a rota mudou. O número é o mesmo; a leitura
 * é outra. O módulo entrega o número e a localização, não o veredito.
 *
 * ## Custo
 *
 * Comparar ponto a ponto é O(n·m): duas trilhas de 12 000 pontos dariam 144
 * milhões de contas. Os segmentos da referência entram numa **grade espacial**
 * e cada ponto só é medido contra os segmentos das células vizinhas — o custo
 * passa a ser proporcional ao que de fato está perto.
 *
 * Sem DOM, sem dependência, sem relógio próprio.
 */

import { numeroFinito } from './numero-seguro.js';

const GRAU_LAT_M = 111_320;
const grauLonM = (lat) => GRAU_LAT_M * Math.max(0.01, Math.cos(lat * Math.PI / 180));

/** Faixa padrão em torno da referência para um ponto contar como "no caminho". */
export const FAIXA_PADRAO_M = 60;

/**
 * Por que essa faixa e não outra.
 *
 * O erro do GNSS num celular sob copa de árvore chega a ±20 m, e a referência
 * também foi gravada por um aparelho com erro parecido. Somando as duas
 * incertezas em quadratura já se passa de 28 m; 60 m dá margem para isso e
 * para a largura real de uma estrada rural com acostamento, sem começar a
 * acusar desvio onde só houve ruído. Abaixo de ~40 m a medida vira contagem de
 * erro de GPS, não de caminho.
 */
export const JUSTIFICATIVA_FAIXA = 'Erro típico de GNSS em celular (±20 m) nas DUAS trilhas soma ~28 m em quadratura; 60 m cobre isso mais a largura de uma estrada rural.';

export const SITUACAO_PONTO = Object.freeze({
  NO_CAMINHO: 'NO_CAMINHO',
  FORA: 'FORA',
  /** Sem coordenada utilizável. Não conta para nenhum dos dois lados. */
  INVALIDO: 'INVALIDO',
});

function coordenada(ponto) {
  const lat = numeroFinito(ponto?.lat ?? ponto?.latitude);
  const lon = numeroFinito(ponto?.lon ?? ponto?.longitude);
  if (lat === null || lon === null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

/** Distância de um ponto ao segmento AB, em metros, em plano local. */
function distanciaAoSegmentoM(p, a, b) {
  const kx = grauLonM(p.lat);
  const ax = a.lon * kx, ay = a.lat * GRAU_LAT_M;
  const bx = b.lon * kx, by = b.lat * GRAU_LAT_M;
  const px = p.lon * kx, py = p.lat * GRAU_LAT_M;
  const dx = bx - ax, dy = by - ay;
  const den = dx * dx + dy * dy;
  const t = den === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / den));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Grade espacial dos segmentos da referência.
 *
 * Sem ela a comparação é O(n·m) e duas trilhas de 12 000 pontos custariam 144
 * milhões de contas. A célula tem o tamanho da faixa: um ponto só pode estar
 * dentro da faixa de um segmento que passe pela célula dele ou por uma vizinha.
 */
function indexar(referencia, faixaM) {
  const pontos = referencia.map(coordenada).filter(Boolean);
  const celulas = new Map();
  if (pontos.length < 2) return { pontos, celulas, faixaM, vazia: true };

  const chave = (cx, cy) => `${cx}/${cy}`;
  for (let i = 1; i < pontos.length; i += 1) {
    const a = pontos[i - 1];
    const b = pontos[i];
    const kx = grauLonM((a.lat + b.lat) / 2);
    // Todas as células que a caixa do segmento (mais a faixa) toca.
    const x0 = Math.floor((Math.min(a.lon, b.lon) * kx - faixaM) / faixaM);
    const x1 = Math.floor((Math.max(a.lon, b.lon) * kx + faixaM) / faixaM);
    const y0 = Math.floor((Math.min(a.lat, b.lat) * GRAU_LAT_M - faixaM) / faixaM);
    const y1 = Math.floor((Math.max(a.lat, b.lat) * GRAU_LAT_M + faixaM) / faixaM);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cy = y0; cy <= y1; cy += 1) {
        const k = chave(cx, cy);
        if (!celulas.has(k)) celulas.set(k, []);
        celulas.get(k).push(i - 1);
      }
    }
  }
  return { pontos, celulas, faixaM, vazia: false };
}

/** Quantos anéis de célula a busca pode abrir antes de varrer tudo. */
const ANEIS_ANTES_DA_VARREDURA = 8;

/**
 * Distância do ponto à polilinha de referência, e qual segmento ficou perto.
 *
 * A busca **abre em anéis** até achar algum segmento. Olhar só as oito células
 * vizinhas parecia bastar — afinal, quem está dentro da faixa está a uma
 * célula de distância. Mas quem está FORA dela pode estar a quilômetros, e aí
 * a grade não devolvia nada e a função entregava `Infinity` como se fosse
 * medida. Isso ia direto para a tela como "maior afastamento: Infinity m".
 *
 * Ponto longe é justamente o caso interessante — é o desvio que se quer medir.
 * Depois de alguns anéis a varredura completa sai mais barata que continuar
 * abrindo, e ela é exata.
 */
function maisProximo(indice, p) {
  const { pontos, celulas, faixaM } = indice;
  const kx = grauLonM(p.lat);
  const cx = Math.floor((p.lon * kx) / faixaM);
  const cy = Math.floor((p.lat * GRAU_LAT_M) / faixaM);

  const vistos = new Set();
  let melhor = Infinity;
  let segmento = -1;

  const medir = (i) => {
    if (vistos.has(i)) return;
    vistos.add(i);
    const d = distanciaAoSegmentoM(p, pontos[i], pontos[i + 1]);
    if (d < melhor) { melhor = d; segmento = i; }
  };

  for (let anel = 1; anel <= ANEIS_ANTES_DA_VARREDURA; anel += 1) {
    for (let dx = -anel; dx <= anel; dx += 1) {
      for (let dy = -anel; dy <= anel; dy += 1) {
        // Só a casca do anel: o miolo já foi olhado na volta anterior.
        if (anel > 1 && Math.abs(dx) < anel && Math.abs(dy) < anel) continue;
        for (const i of celulas.get(`${cx + dx}/${cy + dy}`) ?? []) medir(i);
      }
    }
    // Achar não basta: um segmento a dois anéis pode estar mais longe que um a
    // três. Só para quando o melhor já cabe dentro do anel varrido.
    if (melhor <= (anel - 1) * faixaM) return { metros: melhor, segmento };
  }

  // Ponto muito fora: varredura completa. É exata e acontece pouco — e
  // devolver `Infinity` seria pior que gastar esta passada.
  for (let i = 0; i < pontos.length - 1; i += 1) medir(i);
  return { metros: melhor, segmento };
}

/** Percentil de uma lista já ordenada. Sem interpolação: valor observado. */
function percentil(ordenada, fracao) {
  if (!ordenada.length) return null;
  const i = Math.min(ordenada.length - 1, Math.max(0, Math.round(fracao * (ordenada.length - 1))));
  return ordenada[i];
}

/**
 * Compara uma trilha percorrida contra uma de referência.
 *
 * Devolve números e localização, **nunca veredito**: a referência pode estar
 * velha, e "fora do caminho" pode significar que o caminho é que mudou.
 */
export function compararComReferencia(percorrida = [], referencia = [], { faixaM = FAIXA_PADRAO_M } = {}) {
  const faixa = numeroFinito(faixaM);
  const largura = faixa !== null && faixa > 0 ? faixa : FAIXA_PADRAO_M;
  const indice = indexar(Array.isArray(referencia) ? referencia : [], largura);

  const pontos = Array.isArray(percorrida) ? percorrida : [];
  if (indice.vazia) {
    return {
      comparavel: false,
      motivo: 'REFERENCIA_INSUFICIENTE',
      faixaM: largura,
      pontos: pontos.length,
    };
  }

  const desvios = [];
  let noCaminho = 0;
  let fora = 0;
  let invalidos = 0;
  /** Segmentos da referência por onde passou algum ponto — para saber o que faltou. */
  const segmentosVisitados = new Set();
  /** Trechos contíguos fora da faixa: onde a pessoa saiu, e por quanto tempo. */
  const desviosContiguos = [];
  let aberto = null;

  for (let i = 0; i < pontos.length; i += 1) {
    const p = coordenada(pontos[i]);
    if (!p) { invalidos += 1; continue; }
    const { metros, segmento } = maisProximo(indice, p);
    desvios.push(metros);
    if (metros <= largura) {
      noCaminho += 1;
      if (segmento >= 0) segmentosVisitados.add(segmento);
      if (aberto) { desviosContiguos.push(aberto); aberto = null; }
    } else {
      fora += 1;
      if (!aberto) aberto = { de: i, para: i, maiorAfastamentoM: metros, pontos: 1 };
      else {
        aberto.para = i;
        aberto.pontos += 1;
        aberto.maiorAfastamentoM = Math.max(aberto.maiorAfastamentoM, metros);
      }
    }
  }
  if (aberto) desviosContiguos.push(aberto);

  const ordenados = [...desvios].sort((a, b) => a - b);
  const totalSegmentos = Math.max(0, indice.pontos.length - 1);

  return {
    comparavel: true,
    faixaM: largura,
    pontos: pontos.length,
    invalidos,
    noCaminho,
    fora,
    /** Fração dos pontos válidos que caiu dentro da faixa. */
    fracaoNoCaminho: noCaminho + fora > 0 ? noCaminho / (noCaminho + fora) : 0,
    desvio: {
      medianaM: percentil(ordenados, 0.5),
      p95M: percentil(ordenados, 0.95),
      maximoM: ordenados.length ? ordenados[ordenados.length - 1] : null,
    },
    /** Onde saiu do caminho, em trechos contíguos, do maior para o menor. */
    desvios: desviosContiguos.sort((a, b) => b.pontos - a.pontos),
    cobertura: {
      segmentosDaReferencia: totalSegmentos,
      segmentosVisitados: segmentosVisitados.size,
      /** Quanto da referência foi percorrido. 1 não significa "fez tudo certo". */
      fracao: totalSegmentos > 0 ? segmentosVisitados.size / totalSegmentos : 0,
    },
  };
}

/**
 * Compara várias trilhas contra a mesma referência.
 *
 * É a tabela que responde "o que cada um andou": uma linha por pessoa, o
 * mesmo critério para todas.
 */
export function compararGrupo(trilhas = [], referencia = [], opcoes = {}) {
  return (Array.isArray(trilhas) ? trilhas : []).map((t) => ({
    id: t?.id ?? null,
    nome: t?.nome ?? 'sem nome',
    ...compararComReferencia(t?.pontos ?? [], referencia, opcoes),
  }));
}

/* ─────────────────────── O GUIA QUE SE ATUALIZA SOZINHO ─────────────────────
 *
 * O traçado de referência é um guia temporário: ele envelhece, e quem o
 * corrige é quem caminha. A tentação aqui seria gerar uma linha nova — uma
 * média suavizada das trilhas — e chamar de "traçado atualizado".
 *
 * Não. Isso seria inventar geometria que ninguém andou, com aparência de
 * autoridade. Uma média entre duas variantes legítimas passa pelo meio do
 * mato, entre as duas.
 *
 * O que este módulo faz é entregar **evidência**, em três categorias, cada uma
 * verificável e cada uma com a contagem de quantas pessoas a sustentam:
 *
 * | categoria | o que significa | o que fazer |
 * |---|---|---|
 * | `CONFIRMADO` | trecho da referência por onde muita gente passou | manter |
 * | `ABANDONADO` | trecho da referência por onde quase ninguém passou | investigar: mudou? fechou? |
 * | `NOVO` | onde muita gente passa e a referência **não** vai | investigar: virou o caminho? |
 *
 * A decisão continua sendo de quem organiza a caminhada. O aplicativo conta
 * quantas pessoas passaram por onde, e para por aí.
 */

export const EVIDENCIA = Object.freeze({
  CONFIRMADO: 'CONFIRMADO',
  ABANDONADO: 'ABANDONADO',
  NOVO: 'NOVO',
});

/** Abaixo disto é uma pessoa que se perdeu, não uma mudança de caminho. */
export const MINIMO_DE_TRILHAS_PADRAO = 3;

/**
 * Onde o guia se confirma, onde ele morreu e onde nasceu caminho novo.
 *
 * `trilhas` são objetos `{ id, nome, pontos }`. A contagem é por trilha
 * DISTINTA, nunca por ponto: quem parou para almoçar deixa duzentos fixos no
 * mesmo lugar, e sem isso um almoço viraria "caminho novo confirmado".
 */
export function consensoDeTrilhas(trilhas = [], referencia = [], {
  faixaM = FAIXA_PADRAO_M,
  minimoDeTrilhas = MINIMO_DE_TRILHAS_PADRAO,
} = {}) {
  const faixa = numeroFinito(faixaM) ?? FAIXA_PADRAO_M;
  const minimo = Math.max(1, Math.floor(numeroFinito(minimoDeTrilhas) ?? MINIMO_DE_TRILHAS_PADRAO));
  const lista = (Array.isArray(trilhas) ? trilhas : []).filter((t) => Array.isArray(t?.pontos) && t.pontos.length);
  const indice = indexar(Array.isArray(referencia) ? referencia : [], faixa);

  if (indice.vazia || !lista.length) {
    return { comparavel: false, motivo: indice.vazia ? 'REFERENCIA_INSUFICIENTE' : 'SEM_TRILHAS', trilhas: lista.length };
  }

  /** Quantas trilhas distintas passaram por cada segmento da referência. */
  const porSegmento = new Map();
  /** Quantas trilhas distintas passaram por cada célula FORA da referência. */
  const foraPorCelula = new Map();

  for (const trilha of lista) {
    const segmentosDesta = new Set();
    const celulasDesta = new Set();
    for (const bruto of trilha.pontos) {
      const p = coordenada(bruto);
      if (!p) continue;
      const { metros, segmento } = maisProximo(indice, p);
      if (metros <= faixa) {
        if (segmento >= 0) segmentosDesta.add(segmento);
      } else {
        const kx = grauLonM(p.lat);
        celulasDesta.add(`${Math.floor((p.lon * kx) / faixa)}/${Math.floor((p.lat * GRAU_LAT_M) / faixa)}`);
      }
    }
    // Contagem por trilha distinta: duzentos fixos parados no almoço contam UM.
    for (const s of segmentosDesta) porSegmento.set(s, (porSegmento.get(s) ?? 0) + 1);
    for (const c of celulasDesta) foraPorCelula.set(c, (foraPorCelula.get(c) ?? 0) + 1);
  }

  const totalSegmentos = Math.max(0, indice.pontos.length - 1);
  const confirmados = [];
  const abandonados = [];
  for (let i = 0; i < totalSegmentos; i += 1) {
    const quantas = porSegmento.get(i) ?? 0;
    const trecho = {
      segmento: i,
      de: indice.pontos[i],
      para: indice.pontos[i + 1],
      trilhas: quantas,
    };
    if (quantas >= minimo) confirmados.push(trecho);
    else abandonados.push(trecho);
  }

  const novos = [...foraPorCelula.entries()]
    .filter(([, quantas]) => quantas >= minimo)
    .map(([celula, quantas]) => {
      const [cx, cy] = celula.split('/').map(Number);
      // Centro aproximado da célula, para a interface poder mostrar ONDE.
      const lat = ((cy + 0.5) * faixa) / GRAU_LAT_M;
      return { celula, trilhas: quantas, lat, lon: ((cx + 0.5) * faixa) / grauLonM(lat) };
    })
    .sort((a, b) => b.trilhas - a.trilhas);

  return {
    comparavel: true,
    faixaM: faixa,
    minimoDeTrilhas: minimo,
    trilhas: lista.length,
    confirmado: {
      trechos: confirmados,
      fracao: totalSegmentos > 0 ? confirmados.length / totalSegmentos : 0,
    },
    abandonado: {
      trechos: abandonados,
      fracao: totalSegmentos > 0 ? abandonados.length / totalSegmentos : 0,
    },
    /** Células fora da referência por onde `minimo` ou mais trilhas passaram. */
    novo: novos,
    /**
     * O aplicativo NÃO gera traçado novo. Ele conta quem passou por onde; a
     * decisão de mudar o guia é de quem organiza a caminhada.
     */
    decideOperador: true,
  };
}
