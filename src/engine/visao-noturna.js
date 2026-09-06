/**
 * Visão noturna: amplificar a luz que já existe, sem inventar a que não existe.
 *
 * ## Primeiro, o que isto NÃO é
 *
 * **Não é infravermelho e não é térmico.** A câmera do celular tem um filtro
 * corta-IR colado na frente do sensor, de fábrica, justamente para o
 * infravermelho não sujar a cor das fotos — e não existe sensor térmico em
 * telefone comum. Nenhum software desfaz isso. Um app que promete "ver no
 * escuro total" está pintando ruído de verde.
 *
 * O que existe de verdade, e é o que este motor faz, é **intensificação de
 * luz**: pegar os poucos fótons que o sensor capta numa noite de lua ou num
 * corredor sem lâmpada e tornar visível o que já estava lá, escuro demais para
 * o olho. É a mesma família de truque do intensificador de imagem — só que o
 * ganho vem de estatística em vez de fotocátodo. No escuro absoluto, sem
 * nenhuma fonte de luz, não há o que amplificar, e a tela vai dizer isso.
 *
 * ## De onde vem o ganho: empilhar quadros
 *
 * O sinal de uma cena escura é estável entre um quadro e o seguinte; o ruído do
 * sensor não é — ele sorteia de novo a cada quadro. Somar quadros soma o sinal
 * inteiro e cancela parte do ruído: com N quadros o ruído cai por `√N`.
 *
 * Aqui a soma é uma média exponencial, `y = α·x + (1−α)·y`, que reduz a
 * variância por `α/(2−α)` — com **α = 0,2** isso é 1/9, e o ruído cai a **1/3**,
 * o mesmo que empilhar 9 quadros, guardando um só buffer. (É a mesma álgebra
 * que suaviza a agulha da bússola em `rumo-filtro.js`; `test/visao-noturna.test.js`
 * cobra que as duas contas concordem.)
 *
 * ## O preço, e como ele é pago: medir o borrão, não adivinhá-lo
 *
 * Empilhar quadros só funciona com a cena parada. Com a câmera se movendo, os
 * quadros não descrevem o mesmo lugar e a soma vira rastro — a imagem
 * "arrasta". A primeira tentativa aqui foi decidir isso pela diferença média
 * entre quadros, e **ela falha justamente no caso difícil**: numa cena escura e
 * de pouco contraste, varrer o terreno a 12 px por quadro produz uma diferença
 * MENOR que o próprio ruído do sensor. O detector não via movimento nenhum e a
 * imagem borrava por meia tela (medido, não suposto).
 *
 * Então o motor não mede o movimento — mede **o estrago**. Empilhar bem
 * preserva o detalhe fino da cena e apaga só o ruído; empilhar sobre movimento
 * apaga o detalhe junto. Comparando o quanto de estrutura o acumulado guarda em
 * relação ao quadro que está chegando, sai um número direto: *a pilha ainda
 * está ajudando ou já está atrapalhando?* Retenção alta libera os 9 quadros;
 * retenção caindo encolhe a pilha até a imagem instantânea.
 *
 * A malha se regula sozinha e é de propósito: ao desmanchar, o acumulado volta
 * a ser o quadro atual, a retenção sobe, a pilha cresce de novo. Varrendo, isso
 * estabiliza em poucos quadros de empilhamento — o máximo que aquele movimento
 * permite.
 *
 * ## Movimento é medido contra o piso de ruído do lugar, nunca contra um número
 *
 * No escuro o ruído é grande — é essa a razão de existir a pilha. Se o
 * detector de movimento comparasse a diferença entre quadros com um limiar
 * fixo, o próprio ruído seria lido como câmera se mexendo e a pilha se
 * desmancharia justamente onde ela é mais necessária. Então o motor aprende o
 * piso: numa cena parada, a diferença entre quadros **é** o ruído. O piso
 * desce rápido e sobe devagar, de propósito — um piso simétrico subiria junto
 * com o movimento e apagaria a própria detecção. É a mesma lição que
 * `src/engine/escuta.js` já tinha pago.
 *
 * O piso temporal ainda tem um ponto cego: abrir a câmera já em movimento e
 * nunca parar. Por isso ele é limitado por uma segunda estimativa, tirada de
 * **um quadro só** — a mediana da diferença entre pixels vizinhos. Numa cena
 * lisa essa mediana é o ruído do sensor; o `1,4826` que a converte em desvio
 * padrão é a constante conhecida do MAD para gaussiana. Diferença no tempo
 * acima do que o ruído de um quadro justifica **é movimento, por definição** —
 * e nenhum aprendizado consegue chamá-la de silêncio.
 *
 * ## Amplificar só até onde o ruído deixa
 *
 * Esticar o histograma multiplica o contraste — e multiplica o ruído junto. A
 * regra deste motor é dura e simples: **só se amplifica na proporção do ruído
 * que se removeu**. O limite de amplificação é `amplificacaoBase / fatorRuido`,
 * então a pilha cheia (fator 1/3) autoriza 3× mais esticamento do que a imagem
 * instantânea. Sem isso, o modo escuro vira uma nevasca verde com contraste
 * bonito e nenhuma informação.
 *
 * ## Monocromático de propósito
 *
 * A saída é uma paleta sobre uma única banda de luminância. Não é economia: em
 * luz baixa a informação de cor do sensor **é** ruído, e mostrá-la seria pintar
 * o erro. Acumular uma banda em vez de três também é 3× menos trabalho por
 * quadro, que é o que mantém isto em 30 fps num celular.
 *
 * Módulo puro: sem DOM, sem `canvas`, sem dependência. Entra e sai `Uint8ClampedArray`.
 */

import { numeroFinito } from './numero-seguro.js';

export const PALETAS = Object.freeze({
  /** Verde de fósforo: o visual clássico, e o que menos queima a visão noturna. */
  FOSFORO: 'FOSFORO',
  /** Vermelho: preserva melhor a adaptação ao escuro (astronomia e navegação). */
  VERMELHO: 'VERMELHO',
  /** Branco quente: mais detalhe percebido, pior para os olhos no escuro. */
  BRANCO_QUENTE: 'BRANCO_QUENTE',
  /** Cinza puro: sem viés de cor, para julgar a imagem crua. */
  CINZA: 'CINZA',
});

export const LIMITES_VISAO_NOTURNA = Object.freeze({
  /** Parado: ruído a 1/3 (α/(2−α) = 1/9), o mesmo que 9 quadros empilhados. */
  alfaParado: 0.2,
  /**
   * Estrutura que o acumulado precisa guardar, em relação ao quadro que chega,
   * para a pilha continuar crescendo. Abaixo disto ela está apagando detalhe
   * junto com o ruído, e encolhe.
   */
  retencaoMinima: 0.82,
  /** A retenção é suavizada antes de mexer na pilha, para a malha não pulsar. */
  alfaRetencao: 0.35,
  /** Lado do bloco onde a estrutura é medida, em pixels. */
  blocoEstrutura: 8,
  /** Estrutura grossa abaixo disto é cena lisa: a retenção não opina. */
  estruturaMinima: 0.15,
  /** O piso de ruído desce rápido e sobe devagar — igual ao da escuta. */
  alfaPisoDescida: 0.3,
  alfaPisoSubida: 0.02,
  /**
   * Teto do piso aprendido, em níveis de 0–255.
   * Nenhum sensor tem ruído temporal médio acima disto nas luzes em que este
   * modo é usado. Sem o teto, abrir a câmera já caminhando ensinaria ao motor
   * que "varrer o terreno" é o silêncio do lugar — e a pilha nunca se
   * desmancharia, deixando rastro em cima de rastro.
   */
  pisoMaximo: 8,
  /** Percentis do esticamento: 2% vira preto, 98% vira branco. */
  percentilBaixo: 0.02,
  percentilAlto: 0.98,
  /** Esticamento máximo da imagem instantânea. A pilha cheia multiplica por 3. */
  amplificacaoBase: 4,
  /** Alvo da mediana depois da curva: cinza claro, onde o olho lê melhor. */
  alvoMediana: 118,
  /** A curva nunca escurece (>1) nem estoura as sombras (<0,3). */
  expoenteMinimo: 0.3,
  expoenteMaximo: 1,
  /** Ganho manual do operador, em cima de tudo. */
  ganhoMinimo: 0.5,
  ganhoMaximo: 4,
  /** Folga sobre a estimativa espacial antes de chamar diferença de movimento. */
  margemPisoEspacial: 1.3,
  /** Abaixo disto de luz média não há sinal para amplificar — e é dito. */
  luzMinimaUtil: 1.2,
});

export const DIAGNOSTICOS = Object.freeze({
  OK: 'OK',
  ESCURO_DEMAIS: 'ESCURO_DEMAIS',
  ESTOURADO: 'ESTOURADO',
});

/**
 * Ganho de empilhar quadros com média exponencial.
 * `fator` é o ruído que sobra (1/3 = "três vezes menos ruído").
 */
export function ganhoDeEmpilhamento(alfa) {
  const a = numeroFinito(alfa);
  if (a == null || a <= 0 || a > 1) return { fator: 1, quadrosEquivalentes: 1 };
  return { fator: Math.sqrt(a / (2 - a)), quadrosEquivalentes: (2 - a) / a };
}

/**
 * Luminância Rec. 601. O verde pesa mais porque o sensor tem o dobro de
 * fotossítios verdes — no escuro é dele que vem quase todo o sinal.
 */
export function luminancia(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Tabela de 256 cores (RGB) para pintar a luminância. */
export function construirPaleta(nome = PALETAS.FOSFORO) {
  const paleta = new Uint8Array(768);
  for (let v = 0; v < 256; v += 1) {
    let r;
    let g;
    let b;
    switch (nome) {
      case PALETAS.VERMELHO: r = v; g = v * 0.12; b = v * 0.05; break;
      case PALETAS.BRANCO_QUENTE: r = v; g = v * 0.96; b = v * 0.86; break;
      case PALETAS.CINZA: r = v; g = v; b = v; break;
      case PALETAS.FOSFORO:
      default: r = v * 0.16; g = v; b = v * 0.28; break;
    }
    paleta[v * 3] = Math.round(r);
    paleta[v * 3 + 1] = Math.round(g);
    paleta[v * 3 + 2] = Math.round(b);
  }
  return paleta;
}

/**
 * Ruído do sensor estimado num quadro só, pela mediana da diferença entre
 * pixels vizinhos na horizontal.
 *
 * A mediana é o ponto inteiro: numa cena real a maioria dos vizinhos difere só
 * pelo ruído, e a minoria que cai em cima de uma borda não desloca a mediana —
 * deslocaria a média. `1,4826` é a constante que converte MAD em desvio padrão
 * para uma gaussiana, e o `√2` desconta o fato de a diferença somar o ruído de
 * dois pixels.
 */
export function ruidoEspacial(plano, largura, altura) {
  if (largura < 2 || altura < 1) return 0;
  const caixas = new Uint32Array(256);
  let total = 0;
  for (let y = 0; y < altura; y += 1) {
    const base = y * largura;
    for (let x = 1; x < largura; x += 1) {
      const d = Math.abs(plano[base + x] - plano[base + x - 1]);
      caixas[d > 255 ? 255 : d | 0] += 1;
      total += 1;
    }
  }
  if (!total) return 0;
  const alvo = Math.max(1, Math.round(total * 0.5));
  let acumulado = 0;
  let mediana = 0;
  for (let v = 0; v < 256; v += 1) {
    acumulado += caixas[v];
    if (acumulado >= alvo) { mediana = v; break; }
  }
  return (1.4826 * mediana) / Math.SQRT2;
}

/**
 * Diferença média entre dois quadros que o puro ruído já explica.
 * Para |N(0, 2σ²)| o valor esperado é 2σ/√π.
 */
export function diferencaEsperadaDoRuido(sigma) {
  const s = numeroFinito(sigma);
  return s == null || s <= 0 ? 0 : (2 * s) / Math.sqrt(Math.PI);
}

/** Histograma de 256 caixas de um plano de luminância. */
export function histograma(plano, saida = new Uint32Array(256)) {
  saida.fill(0);
  for (let i = 0; i < plano.length; i += 1) {
    const v = plano[i];
    saida[v < 0 ? 0 : v > 255 ? 255 : v | 0] += 1;
  }
  return saida;
}

/** Valor abaixo do qual está a fração `p` dos pixels. */
export function percentilDoHistograma(hist, total, p) {
  if (!total) return 0;
  const alvo = Math.max(1, Math.min(total, Math.round(total * p)));
  let acumulado = 0;
  for (let v = 0; v < 256; v += 1) {
    acumulado += hist[v];
    if (acumulado >= alvo) return v;
  }
  return 255;
}

/**
 * Expoente da curva: `saida = 255·(entrada/255)^expoente`.
 * Menor que 1 levanta as sombras. Nunca passa de 1 — visão noturna não escurece.
 */
export function expoenteAutomatico(medianaEsticada, limites = LIMITES_VISAO_NOTURNA) {
  const m = numeroFinito(medianaEsticada);
  if (m == null || m <= 0) return limites.expoenteMinimo;
  if (m >= 255) return limites.expoenteMaximo;
  const alvo = Math.min(254, Math.max(1, limites.alvoMediana));
  const expoente = Math.log(alvo / 255) / Math.log(m / 255);
  if (!Number.isFinite(expoente)) return limites.expoenteMaximo;
  return Math.min(limites.expoenteMaximo, Math.max(limites.expoenteMinimo, expoente));
}

/**
 * Tabela de 256 níveis que junta esticamento, curva e ganho manual num único
 * passo — a diferença entre olhar três vezes cada pixel e olhar uma vez.
 */
export function construirCurva({ pretoEm = 0, brancoEm = 255, expoente = 1, ganho = 1 } = {}) {
  const curva = new Uint8ClampedArray(256);
  const faixa = Math.max(1, brancoEm - pretoEm);
  for (let v = 0; v < 256; v += 1) {
    const esticado = Math.min(1, Math.max(0, (v - pretoEm) / faixa));
    curva[v] = Math.round(255 * Math.pow(esticado, expoente) * ganho);
  }
  return curva;
}

/**
 * Amplificação permitida pelo ruído que já foi removido.
 * Empilhar 9 quadros corta o ruído em 3 e autoriza esticar 3× mais. Esta é a
 * regra que impede a tela de virar uma nevasca com contraste bonito.
 */
export function amplificacaoPermitida(fatorRuido, limites = LIMITES_VISAO_NOTURNA) {
  const f = numeroFinito(fatorRuido);
  if (f == null || f <= 0) return limites.amplificacaoBase;
  return limites.amplificacaoBase / f;
}

/**
 * Reduz o plano por blocos, tirando a média de cada um.
 *
 * É aqui que a medida de estrutura fica possível. No pixel a pixel, numa cena
 * escura, o ruído do sensor é MAIOR que o detalhe da cena — medir estrutura ali
 * é medir ruído (foi o que aconteceu na primeira versão deste motor). A média
 * de um bloco de 8×8 divide o ruído por 8 e deixa a estrutura intacta, porque
 * o que a varredura borra tem dezenas de pixels, não um.
 */
export function reduzirPlano(plano, largura, altura, bloco = 8) {
  const l = Math.max(1, Math.floor(largura / bloco));
  const a = Math.max(1, Math.floor(altura / bloco));
  const dados = new Float32Array(l * a);
  for (let by = 0; by < a; by += 1) {
    for (let bx = 0; bx < l; bx += 1) {
      let soma = 0;
      let n = 0;
      const y0 = by * bloco;
      const x0 = bx * bloco;
      for (let y = y0; y < y0 + bloco && y < altura; y += 1) {
        const base = y * largura;
        for (let x = x0; x < x0 + bloco && x < largura; x += 1) { soma += plano[base + x]; n += 1; }
      }
      dados[by * l + bx] = n ? soma / n : 0;
    }
  }
  return { dados, largura: l, altura: a };
}

/** Gradiente horizontal médio de um plano — o "quanto de detalhe" ele tem. */
export function gradienteMedio(plano, largura, altura) {
  if (largura < 2 || altura < 1) return 0;
  let soma = 0;
  let total = 0;
  for (let y = 0; y < altura; y += 1) {
    const base = y * largura;
    for (let x = 1; x < largura; x += 1) {
      soma += Math.abs(plano[base + x] - plano[base + x - 1]);
      total += 1;
    }
  }
  return total ? soma / total : 0;
}

/**
 * Quantos quadros a pilha pode ter, dada a estrutura que ela está conseguindo
 * guardar. Retenção cheia libera os 9; retenção no mínimo cai para 1, que é
 * não empilhar.
 */
export function quadrosPermitidos(retencao, limites = LIMITES_VISAO_NOTURNA) {
  const maximo = (2 - limites.alfaParado) / limites.alfaParado;
  const r = numeroFinito(retencao);
  if (r == null) return maximo;
  const faixa = Math.max(1e-6, 1 - limites.retencaoMinima);
  const fracao = Math.min(1, Math.max(0, (r - limites.retencaoMinima) / faixa));
  return 1 + (maximo - 1) * fracao;
}

/** O α que produz exatamente `q` quadros equivalentes. Inverso de (2−α)/α. */
export function alfaParaQuadros(q) {
  const n = numeroFinito(q);
  if (n == null || n <= 1) return 1;
  return 2 / (n + 1);
}

/**
 * Motor com memória entre quadros.
 *
 * `processar` reescreve o próprio `rgba` que recebeu (é o buffer que o
 * `ImageData` já tem; alocar outro a 30 fps é lixo para o coletor) e devolve o
 * relatório do que fez — que é o que a tela mostra para o operador poder
 * julgar a imagem em vez de acreditar nela.
 */
export function criarVisaoNoturna(opcoes = {}) {
  const cfg = { ...LIMITES_VISAO_NOTURNA, ...opcoes };
  let acumulado = null;
  let quadroAtual = null;
  let largura = 0;
  let altura = 0;
  let quadros = 0;
  let pisoRuido = null;
  let retencaoSuave = 1;
  let alfaAnterior = 1;
  let paletaNome = opcoes.paleta ?? PALETAS.FOSFORO;
  let paleta = construirPaleta(paletaNome);
  const hist = new Uint32Array(256);

  function redimensionar(l, a) {
    largura = l;
    altura = a;
    acumulado = new Float32Array(l * a);
    quadroAtual = new Float32Array(l * a);
    quadros = 0;
    pisoRuido = null;
    retencaoSuave = 1;
    alfaAnterior = 1;
  }

  return {
    reiniciar() {
      if (acumulado) acumulado.fill(0);
      quadros = 0;
      pisoRuido = null;
      retencaoSuave = 1;
      alfaAnterior = 1;
    },
    paletaAtual: () => paletaNome,
    trocarPaleta(nome) {
      paletaNome = Object.values(PALETAS).includes(nome) ? nome : PALETAS.FOSFORO;
      paleta = construirPaleta(paletaNome);
      return paletaNome;
    },
    estado: () => ({ largura, altura, quadros, paleta: paletaNome }),

    /**
     * @param {Uint8ClampedArray} rgba pixels de entrada; é reescrito na saída
     * @param {number} l largura em pixels
     * @param {number} a altura em pixels
     * @param {object} [ajustes]
     * @param {number} [ajustes.ganho] ganho manual do operador
     * @param {boolean} [ajustes.empilhar] desligar deixa a imagem instantânea
     */
    processar(rgba, l, a, ajustes = {}) {
      if (!rgba || rgba.length < l * a * 4) {
        throw new Error('Buffer de imagem menor que a largura × altura informadas.');
      }
      if (l !== largura || a !== altura || !acumulado) redimensionar(l, a);

      const total = l * a;
      const empilhar = ajustes.empilhar !== false;
      const ganho = Math.min(cfg.ganhoMaximo, Math.max(cfg.ganhoMinimo, numeroFinito(ajustes.ganho) ?? 1));

      // ── Passo 1: luminância do quadro e o quanto ele difere do acumulado ──
      let somaDiferenca = 0;
      let somaLuz = 0;
      for (let i = 0, p = 0; i < total; i += 1, p += 4) {
        const y = luminancia(rgba[p], rgba[p + 1], rgba[p + 2]);
        quadroAtual[i] = y;
        somaLuz += y;
        if (quadros > 0) somaDiferenca += Math.abs(y - acumulado[i]);
      }
      const luzMedia = somaLuz / total;
      const diferencaMedia = quadros > 0 ? somaDiferenca / total : 0;
      if (quadros > 0) {
        pisoRuido = pisoRuido == null
          ? diferencaMedia
          : diferencaMedia < pisoRuido
            ? cfg.alfaPisoDescida * diferencaMedia + (1 - cfg.alfaPisoDescida) * pisoRuido
            : cfg.alfaPisoSubida * diferencaMedia + (1 - cfg.alfaPisoSubida) * pisoRuido;
        // O teto espacial é o que impede a câmera em movimento desde o
        // primeiro quadro de ensinar ao motor que varrer é ficar parado.
        const tetoEspacial = diferencaEsperadaDoRuido(ruidoEspacial(quadroAtual, l, a)) * cfg.margemPisoEspacial;
        pisoRuido = Math.min(pisoRuido, cfg.pisoMaximo, tetoEspacial);
      }
      // O que sobra da diferença depois de descontado o ruído do próprio
      // sensor é o que a cena realmente andou.
      const movimento = quadros > 0 ? Math.max(0, diferencaMedia - (pisoRuido ?? 0)) / 255 : 1;

      // ── Passo 2: empilhar na medida em que a pilha ainda está ajudando ───
      //
      // A conta é feita ANTES de somar o quadro novo: é o acumulado de agora,
      // com a pilha que ele tem, que responde se ela está preservando detalhe
      // ou apagando-o. Medir depois de somar seria perguntar ao réu.
      // A média de um bloco de N×N divide o ruído por N; o que sobra dele
      // ainda entra no gradiente grosso, e entra DIFERENTE nos dois planos —
      // o acumulado tem menos ruído por já estar empilhado. Sem descontar cada
      // um pelo seu, uma cena parada mediria retenção 0,98 em vez de 1, e a
      // pilha nunca chegaria aos 9 quadros que ela merece.
      const sigmaGrosso = ruidoEspacial(quadroAtual, l, a) / cfg.blocoEstrutura;
      const ruidoNoGradiente = diferencaEsperadaDoRuido(sigmaGrosso);
      const fatorAnterior = ganhoDeEmpilhamento(alfaAnterior).fator;

      const grossoQuadro = reduzirPlano(quadroAtual, l, a, cfg.blocoEstrutura);
      const estruturaQuadro = Math.max(
        0,
        gradienteMedio(grossoQuadro.dados, grossoQuadro.largura, grossoQuadro.altura) - ruidoNoGradiente,
      );
      const grossoAcumulado = quadros > 0 ? reduzirPlano(acumulado, l, a, cfg.blocoEstrutura) : null;
      const estruturaAcumulada = grossoAcumulado
        ? Math.max(0, gradienteMedio(grossoAcumulado.dados, grossoAcumulado.largura, grossoAcumulado.altura) - ruidoNoGradiente * fatorAnterior)
        : estruturaQuadro;
      // Abaixo de um mínimo de estrutura não há o que preservar nem o que
      // borrar — parede lisa, céu, breu. Aí a retenção não significa nada e
      // não pode mandar na pilha.
      const retencao = estruturaQuadro > cfg.estruturaMinima
        ? Math.min(1, estruturaAcumulada / estruturaQuadro)
        : 1;
      retencaoSuave = quadros === 0
        ? retencao
        : cfg.alfaRetencao * retencao + (1 - cfg.alfaRetencao) * retencaoSuave;

      const alfa = !empilhar || quadros === 0
        ? 1
        : alfaParaQuadros(quadrosPermitidos(retencaoSuave, cfg));
      alfaAnterior = alfa;
      if (alfa >= 1) {
        acumulado.set(quadroAtual);
      } else {
        const um = 1 - alfa;
        for (let i = 0; i < total; i += 1) acumulado[i] = alfa * quadroAtual[i] + um * acumulado[i];
      }
      quadros += 1;
      const { fator: fatorRuido, quadrosEquivalentes } = ganhoDeEmpilhamento(alfa);

      // ── Passo 3: onde estão o preto e o branco desta cena ────────────────
      histograma(acumulado, hist);
      let pretoEm = percentilDoHistograma(hist, total, cfg.percentilBaixo);
      let brancoEm = percentilDoHistograma(hist, total, cfg.percentilAlto);
      if (brancoEm <= pretoEm) brancoEm = pretoEm + 1;

      // O esticamento não pode passar do que o ruído removido autoriza.
      const teto = amplificacaoPermitida(empilhar ? fatorRuido : 1, cfg);
      const faixaMinima = 255 / teto;
      if (brancoEm - pretoEm < faixaMinima) {
        // A janela é reposicionada inteira dentro de [0, 255] em vez de ser
        // "esticada" por uma borda: encostada no preto, encolher o preto não
        // alarga nada, e a amplificação estouraria o teto em silêncio.
        // `ceil`, nunca `round`: uma janela um nível mais estreita que o
        // pedido faz a amplificação passar do teto — pouco, mas passa.
        const largura = Math.min(255, Math.ceil(faixaMinima));
        const centro = (brancoEm + pretoEm) / 2;
        const inicio = Math.max(0, Math.min(255 - largura, Math.round(centro - largura / 2)));
        pretoEm = inicio;
        brancoEm = inicio + largura;
      }
      const amplificacao = 255 / Math.max(1, brancoEm - pretoEm);

      // ── Passo 4: curva e paleta, num passe só ────────────────────────────
      const mediana = percentilDoHistograma(hist, total, 0.5);
      const medianaEsticada = Math.min(255, Math.max(0, ((mediana - pretoEm) / Math.max(1, brancoEm - pretoEm)) * 255));
      const expoente = expoenteAutomatico(medianaEsticada, cfg);
      const curva = construirCurva({ pretoEm, brancoEm, expoente, ganho });

      let somaSaida = 0;
      for (let i = 0, p = 0; i < total; i += 1, p += 4) {
        const v = acumulado[i];
        const nivel = curva[v < 0 ? 0 : v > 255 ? 255 : v | 0];
        somaSaida += nivel;
        const c = nivel * 3;
        rgba[p] = paleta[c];
        rgba[p + 1] = paleta[c + 1];
        rgba[p + 2] = paleta[c + 2];
        rgba[p + 3] = 255;
      }

      // O diagnóstico é o que impede a tela de mentir: sem luz nenhuma, o que
      // aparece é ruído amplificado, e quem está olhando precisa saber disso.
      const diagnostico = luzMedia < cfg.luzMinimaUtil
        ? DIAGNOSTICOS.ESCURO_DEMAIS
        : pretoEm >= 250 ? DIAGNOSTICOS.ESTOURADO : DIAGNOSTICOS.OK;

      return {
        movimento,
        alfa,
        empilhando: alfa < 1,
        quadrosEquivalentes,
        fatorRuido,
        pretoEm,
        brancoEm,
        amplificacao,
        amplificacaoMaxima: teto,
        expoente,
        ganho,
        luzMedia,
        luzMediaSaida: somaSaida / total,
        diferencaMedia,
        pisoRuido,
        retencao,
        retencaoSuave,
        estruturaQuadro,
        estruturaAcumulada,
        mediana,
        quadros,
        paleta: paletaNome,
        diagnostico,
      };
    },
  };
}
