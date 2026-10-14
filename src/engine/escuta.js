/**
 * Escuta acústica — a matemática, sem DOM e sem dependência.
 *
 * O problema de campo: numa peregrinação em estrada rural, o aviso que
 * importa chega pelo ar antes de chegar pelos olhos. Um caminhão vindo por
 * trás, ou alguém gritando "sai da pista" lá na frente da fila, é informação
 * que o grupo passa de boca em boca e que se perde no meio de trezentas
 * pessoas. O celular já está no bolso e já tem microfone.
 *
 * ## O que este módulo faz e o que ele não faz
 *
 * Ele mede **energia por faixa de frequência** e decide se essa energia está
 * **subindo** de um jeito que combina com algo se aproximando. Ele não
 * identifica o veículo, não diz de que lado vem, não conta quantos são e não
 * entende a palavra falada. Direção exigiria dois microfones separados por
 * uma distância conhecida; o celular tem os microfones, mas o navegador não
 * dá acesso a cada um em separado.
 *
 * ## Por que estas faixas
 *
 * - **MOTOR (30–200 Hz)** — um diesel de caminhão a ~1400 rpm com seis
 *   cilindros queima a 70 Hz, e o bloco e o escapamento irradiam forte abaixo
 *   de 200 Hz. É a faixa que um carro de passeio ocupa pouco e que atravessa
 *   melhor a distância, porque grave se espalha e contorna obstáculo.
 * - **RODAGEM (600–1600 Hz)** — o ruído de pneu contra asfalto, que passa a
 *   dominar acima de mais ou menos 50 km/h. Serve de confirmação: motor sem
 *   rodagem costuma ser máquina parada.
 * - **VOZ (300–3400 Hz)** — a banda de telefonia. É onde mora um grito.
 *
 * MOTOR e VOZ **não se sobrepõem**, de propósito: é a comparação entre as
 * duas que separa "vem vindo um caminhão" de "alguém gritou".
 *
 * ## O truque que faz isso funcionar no mundo real
 *
 * Comparar com um limiar fixo de decibéis não funciona: o mesmo aparelho lê
 * níveis diferentes em bolso, em mão e no vento, e cada modelo tem ganho
 * próprio. O que se compara aqui é sempre **contra o piso de ruído do próprio
 * lugar**, rastreado por um seguidor que **desce rápido e sobe devagar**. Se
 * o piso subisse na mesma velocidade que o sinal, o caminhão que se aproxima
 * levantaria o próprio piso junto e o alerta nunca dispararia.
 *
 * ## Honestidade sobre os números
 *
 * Os limiares em `LIMIARES_PADRAO` são um **ponto de partida**, não uma
 * medição de campo: eles saíram do raciocínio acima, não de gravações em
 * estrada. Por isso são parâmetros, a tela mostra os valores ao vivo e a
 * sensibilidade é ajustável. Calibrar é trabalho de campo, e é para isso que
 * o painel existe.
 */

/** Piso usado quando o analisador devolve silêncio digital (-Infinity). */
export const PISO_DB = -140;

export const BANDAS = Object.freeze({
  MOTOR: Object.freeze({ deHz: 30, ateHz: 200 }),
  RODAGEM: Object.freeze({ deHz: 600, ateHz: 1600 }),
  VOZ: Object.freeze({ deHz: 300, ateHz: 3400 }),
});

export const EVENTOS_ESCUTA = Object.freeze({
  VEICULO_APROXIMANDO: 'VEICULO_APROXIMANDO',
  CHAMADO_VOZ: 'CHAMADO_VOZ',
});

export const LIMIARES_PADRAO = Object.freeze({
  /** Quanto a banda precisa estar acima do piso do lugar para contar. */
  margemVeiculoDb: 6,
  margemChamadoDb: 10,
  /**
   * Quanto a voz precisa ter subido **a mais** que o grave para contar como
   * chamado. Sem isto, uma pancada no corpo do aparelho vira grito: batida
   * acopla direto no microfone e sobe em toda a faixa de uma vez. Uma pessoa
   * gritando a vinte metros sobe na voz e quase nada no grave — grave irradia
   * mal de uma boca, e é isso que separa os dois casos.
   */
  dominanciaChamadoDb: 6,
  /** Quão rápido precisa estar subindo. Aproximação é uma rampa, não um degrau. */
  subidaVeiculoDbPorSegundo: 1,
  subidaChamadoDbPorSegundo: 4,
  /** Sobre quanto tempo a subida é medida. Um grito é curto; um caminhão, não. */
  janelaVeiculoMs: 6000,
  janelaChamadoMs: 2000,
  /**
   * Quanto o terço final da janela precisa superar o terço inicial, por
   * mediana. A inclinação sozinha aceita um degrau: um esbarrão no bolso é
   * grave, curto e forte, e desenha uma reta subindo tão bem quanto um
   * caminhão. Mediana de terços ignora o pico isolado e exige que o nível
   * **fique** mais alto — que é a diferença entre um baque e uma aproximação.
   */
  sustentacaoVeiculoDb: 3,
  /** Menos que isto na janela é ruído de contagem, não tendência. */
  amostrasMinimas: 5,
  /** Seguidor de piso: desce rápido, sobe devagar. */
  alfaDescida: 0.25,
  alfaSubida: 0.02,
});

export const MOTIVOS = Object.freeze({
  SEM_LEITURA: 'SEM_LEITURA',
  AQUECENDO: 'AQUECENDO',
  ABAIXO_DO_PISO: 'ABAIXO_DO_PISO',
  SEM_SUBIDA: 'SEM_SUBIDA',
  NAO_SUSTENTOU: 'NAO_SUSTENTOU',
});

function finito(valor) {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/**
 * Bins que cobrem uma faixa de frequência.
 *
 * Com `fftSize` N o analisador entrega N/2 bins entre 0 e Nyquist, então cada
 * bin vale `taxaAmostragem / (2 * totalBins)` hertz.
 */
export function binsDaBanda({ deHz, ateHz, taxaAmostragem, totalBins }) {
  if (!finito(taxaAmostragem) || taxaAmostragem <= 0) return null;
  if (!Number.isInteger(totalBins) || totalBins <= 0) return null;
  if (!finito(deHz) || !finito(ateHz) || ateHz <= deHz) return null;

  const larguraBin = taxaAmostragem / (2 * totalBins);
  const inicio = Math.max(0, Math.round(deHz / larguraBin));
  const fim = Math.min(totalBins - 1, Math.round(ateHz / larguraBin));
  if (inicio > fim) return null;
  return { inicio, fim, larguraBin };
}

/**
 * Nível médio de uma banda, em dB.
 *
 * A média é feita em **potência**, não em decibéis: decibel é logaritmo, e a
 * média aritmética de logaritmos subestima o pico. Silêncio digital
 * (`-Infinity`) entra como `PISO_DB` em vez de contaminar a soma.
 */
export function nivelDaBanda(dbPorBin, { deHz, ateHz, taxaAmostragem }) {
  if (!dbPorBin || typeof dbPorBin.length !== 'number' || dbPorBin.length === 0) return null;
  const faixa = binsDaBanda({ deHz, ateHz, taxaAmostragem, totalBins: dbPorBin.length });
  if (!faixa) return null;

  let potencia = 0;
  let contados = 0;
  for (let i = faixa.inicio; i <= faixa.fim; i += 1) {
    const bruto = dbPorBin[i];
    const db = finito(bruto) ? bruto : PISO_DB;
    potencia += 10 ** (db / 10);
    contados += 1;
  }
  if (contados === 0) return null;
  return 10 * Math.log10(potencia / contados);
}

/** Bin mais forte da faixa, já convertido para hertz. */
export function picoEspectral(dbPorBin, { taxaAmostragem, deHz = 0, ateHz = Infinity } = {}) {
  if (!dbPorBin || typeof dbPorBin.length !== 'number' || dbPorBin.length === 0) return null;
  if (!finito(taxaAmostragem) || taxaAmostragem <= 0) return null;

  const larguraBin = taxaAmostragem / (2 * dbPorBin.length);
  const inicio = Math.max(0, Math.round(deHz / larguraBin));
  const fim = Number.isFinite(ateHz)
    ? Math.min(dbPorBin.length - 1, Math.round(ateHz / larguraBin))
    : dbPorBin.length - 1;
  if (inicio > fim) return null;

  let melhorBin = -1;
  let melhorDb = -Infinity;
  for (let i = inicio; i <= fim; i += 1) {
    const db = finito(dbPorBin[i]) ? dbPorBin[i] : PISO_DB;
    if (db > melhorDb) { melhorDb = db; melhorBin = i; }
  }
  if (melhorBin < 0) return null;
  return { bin: melhorBin, hz: melhorBin * larguraBin, db: melhorDb };
}

/** Um quadro de espectro virado em números comparáveis. */
export function analisarQuadro(dbPorBin, { taxaAmostragem } = {}) {
  const motorDb = nivelDaBanda(dbPorBin, { ...BANDAS.MOTOR, taxaAmostragem });
  const rodagemDb = nivelDaBanda(dbPorBin, { ...BANDAS.RODAGEM, taxaAmostragem });
  const vozDb = nivelDaBanda(dbPorBin, { ...BANDAS.VOZ, taxaAmostragem });
  if (motorDb === null || rodagemDb === null || vozDb === null) return null;
  return {
    motorDb,
    rodagemDb,
    vozDb,
    pico: picoEspectral(dbPorBin, { taxaAmostragem, deHz: 20, ateHz: 4000 }),
  };
}

/**
 * Inclinação em dB por segundo por mínimos quadrados.
 *
 * Comparar o primeiro com o último ponto seria mais simples e bem pior: um
 * estalo no início ou no fim da janela viraria "tendência". A reta usa todos
 * os pontos, então um ponto fora da curva pesa pouco.
 */
export function inclinacaoDbPorSegundo(amostras) {
  if (!Array.isArray(amostras) || amostras.length < 2) return null;
  const n = amostras.length;
  let somaT = 0;
  let somaY = 0;
  for (const { instante, nivel } of amostras) {
    somaT += instante / 1000;
    somaY += nivel;
  }
  const mediaT = somaT / n;
  const mediaY = somaY / n;

  let cima = 0;
  let baixo = 0;
  for (const { instante, nivel } of amostras) {
    const dt = instante / 1000 - mediaT;
    cima += dt * (nivel - mediaY);
    baixo += dt * dt;
  }
  if (baixo === 0) return null;
  return cima / baixo;
}

/** Mediana — resistente ao pico isolado, ao contrário da média. */
export function mediana(valores) {
  const ordenados = [...valores].filter(finito).sort((a, b) => a - b);
  if (ordenados.length === 0) return null;
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

/**
 * Quanto o terço final da janela está acima do terço inicial, por mediana.
 * `null` quando a janela ainda é curta demais para ter terços com conteúdo.
 */
export function sustentacaoDb(amostras) {
  if (!Array.isArray(amostras) || amostras.length < 3) return null;
  const terco = Math.floor(amostras.length / 3);
  if (terco < 1) return null;
  const inicio = mediana(amostras.slice(0, terco).map((a) => a.nivel));
  const fim = mediana(amostras.slice(-terco).map((a) => a.nivel));
  if (inicio === null || fim === null) return null;
  return fim - inicio;
}

function criarSeguidorDePiso({ alfaDescida, alfaSubida }) {
  let piso = null;
  return {
    valor: () => piso,
    observar(nivel) {
      if (!finito(nivel)) return piso;
      if (piso === null) { piso = nivel; return piso; }
      const alfa = nivel < piso ? alfaDescida : alfaSubida;
      piso += (nivel - piso) * alfa;
      return piso;
    },
  };
}

function criarJanela(duracaoMs) {
  const amostras = [];
  return {
    amostras,
    observar(instante, nivel) {
      amostras.push({ instante, nivel });
      const corte = instante - duracaoMs;
      while (amostras.length && amostras[0].instante < corte) amostras.shift();
      return amostras;
    },
  };
}

/**
 * Detector com estado — puro JavaScript, sem relógio próprio: quem chama
 * informa o instante. É isso que deixa o teste rodar em milissegundos em vez
 * de esperar seis segundos de janela.
 */
export function criarDetectorAcustico({ limiares = {} } = {}) {
  const cfg = { ...LIMIARES_PADRAO, ...limiares };
  const pisoMotor = criarSeguidorDePiso(cfg);
  const pisoVoz = criarSeguidorDePiso(cfg);
  const janelaMotor = criarJanela(cfg.janelaVeiculoMs);
  const janelaVoz = criarJanela(cfg.janelaChamadoMs);

  return {
    limiares: Object.freeze({ ...cfg }),

    observar({ instante, quadro } = {}) {
      if (!finito(instante) || !quadro || !finito(quadro.motorDb) || !finito(quadro.vozDb)) {
        return { evento: null, motivo: MOTIVOS.SEM_LEITURA, leitura: null };
      }

      // O piso é lido ANTES de absorver esta amostra: comparar o sinal com um
      // piso que já engoliu o próprio sinal esconderia exatamente a subida
      // que interessa.
      const baseMotor = pisoMotor.valor();
      const baseVoz = pisoVoz.valor();
      const amostrasMotor = janelaMotor.observar(instante, quadro.motorDb);
      const amostrasVoz = janelaVoz.observar(instante, quadro.vozDb);
      pisoMotor.observar(quadro.motorDb);
      pisoVoz.observar(quadro.vozDb);

      const leitura = {
        motorDb: quadro.motorDb,
        rodagemDb: quadro.rodagemDb ?? null,
        vozDb: quadro.vozDb,
        pisoMotorDb: baseMotor,
        pisoVozDb: baseVoz,
        acimaDoPisoMotorDb: baseMotor === null ? null : quadro.motorDb - baseMotor,
        acimaDoPisoVozDb: baseVoz === null ? null : quadro.vozDb - baseVoz,
        subidaMotorDbPorSegundo: inclinacaoDbPorSegundo(amostrasMotor),
        subidaVozDbPorSegundo: inclinacaoDbPorSegundo(amostrasVoz),
        sustentacaoMotorDb: sustentacaoDb(amostrasMotor),
      };

      if (baseMotor === null || amostrasMotor.length < cfg.amostrasMinimas) {
        return { evento: null, motivo: MOTIVOS.AQUECENDO, leitura };
      }

      const motorForte = leitura.acimaDoPisoMotorDb >= cfg.margemVeiculoDb;
      const motorSubindo = finito(leitura.subidaMotorDbPorSegundo)
        && leitura.subidaMotorDbPorSegundo >= cfg.subidaVeiculoDbPorSegundo;
      const motorSustentou = finito(leitura.sustentacaoMotorDb)
        && leitura.sustentacaoMotorDb >= cfg.sustentacaoVeiculoDb;
      const veiculo = motorForte && motorSubindo && motorSustentou;

      const vozDomina = finito(leitura.acimaDoPisoMotorDb)
        && leitura.acimaDoPisoVozDb - leitura.acimaDoPisoMotorDb >= cfg.dominanciaChamadoDb;
      const chamado = amostrasVoz.length >= 2
        && baseVoz !== null
        && leitura.acimaDoPisoVozDb >= cfg.margemChamadoDb
        && finito(leitura.subidaVozDbPorSegundo)
        && leitura.subidaVozDbPorSegundo >= cfg.subidaChamadoDbPorSegundo
        && vozDomina;

      if (!veiculo && !chamado) {
        let motivo = MOTIVOS.ABAIXO_DO_PISO;
        if (motorForte && motorSubindo && !motorSustentou) motivo = MOTIVOS.NAO_SUSTENTOU;
        else if (motorForte || (leitura.acimaDoPisoVozDb ?? 0) >= cfg.margemChamadoDb) motivo = MOTIVOS.SEM_SUBIDA;
        return { evento: null, motivo, leitura };
      }

      // Quando os dois batem, decide quem **subiu mais** sobre o próprio piso,
      // não quem está mais alto: as duas bandas não têm ganho comparável entre
      // si, mas cada uma é comparável consigo mesma um minuto atrás.
      if (veiculo && chamado) {
        const evento = leitura.acimaDoPisoMotorDb >= leitura.acimaDoPisoVozDb
          ? EVENTOS_ESCUTA.VEICULO_APROXIMANDO
          : EVENTOS_ESCUTA.CHAMADO_VOZ;
        return { evento, motivo: null, leitura };
      }

      return {
        evento: veiculo ? EVENTOS_ESCUTA.VEICULO_APROXIMANDO : EVENTOS_ESCUTA.CHAMADO_VOZ,
        motivo: null,
        leitura,
      };
    },
  };
}
