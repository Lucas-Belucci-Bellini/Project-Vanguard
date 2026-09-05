/**
 * Trilhas de referência — e a verdade delas vem da CONSTRUÇÃO, não do código.
 *
 * ## A regra que faz isto valer alguma coisa
 *
 * Uma trilha de referência cuja distância esperada foi obtida rodando o motor
 * não prova nada: ela apenas registra o que o motor fazia no dia em que foi
 * escrita, e passa a concordar com qualquer defeito que ele já tivesse.
 *
 * Aqui o caminho é gerado a partir de uma geometria conhecida — uma reta de
 * 1 000 m, um quarteirão de 4 × 200 m, uma volta fechada — e a distância
 * verdadeira é a soma dos segmentos **dessa geometria**, calculada antes de
 * qualquer ruído existir. O que o motor recebe é o caminho já sujo de ruído,
 * salto, vão e pausa. A comparação é sempre contra a verdade construída.
 *
 * ## Por que cada trilha existe
 *
 * Nenhuma delas é um caminho perfeito. Um caminho perfeito só prova que a soma
 * funciona quando nada dá errado — que é justamente quando ninguém precisa de
 * medição confiável.
 */

const R_TERRA = 6_371_008.8;
const GRAUS = Math.PI / 180;

/** Move `metros` na direção `rumoDeg` a partir de um ponto. Geodésia direta simplificada. */
function mover({ lat, lon }, metros, rumoDeg) {
  const d = metros / R_TERRA;
  const rumo = rumoDeg * GRAUS;
  const lat1 = lat * GRAUS;
  const lon1 = lon * GRAUS;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(rumo));
  const lon2 = lon1 + Math.atan2(Math.sin(rumo) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 / GRAUS, lon: lon2 / GRAUS };
}

/** Gerador determinístico: a mesma semente dá sempre a mesma trilha. */
function ruidoPseudoAleatorio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 4_294_967_296;
  };
}

const ORIGEM = { lat: -23.3103, lon: -51.1628 };
const T0 = 1_700_000_000_000;

/**
 * Constrói o caminho VERDADEIRO: uma posição por segundo ao longo das pernas
 * pedidas. A distância verdadeira sai daqui, antes de existir qualquer ruído.
 */
function caminhoVerdadeiro(pernas, { velocidadeMs = 1.4, altitudeInicial = 550 } = {}) {
  const pontos = [{ ...ORIGEM, t: 0, altitude: altitudeInicial }];
  let atual = { ...ORIGEM };
  let t = 0;
  let altitude = altitudeInicial;
  let distanciaVerdadeiraM = 0;

  for (const perna of pernas) {
    const passos = Math.max(1, Math.round(perna.metros / velocidadeMs));
    const porPasso = perna.metros / passos;
    const subidaPorPasso = (perna.subidaM ?? 0) / passos;
    for (let i = 0; i < passos; i += 1) {
      atual = mover(atual, porPasso, perna.rumoDeg);
      altitude += subidaPorPasso;
      t += 1;
      distanciaVerdadeiraM += Math.hypot(porPasso, subidaPorPasso);
      pontos.push({ ...atual, t, altitude });
    }
  }
  return { pontos, distanciaVerdadeiraM };
}

/** Transforma o caminho verdadeiro no que um GPS de verdade teria entregado. */
function observar(caminho, { intervaloS = 10, precisaoM = 6, ruidoM = 0, semente = 1 } = {}) {
  const aleatorio = ruidoPseudoAleatorio(semente);
  const observados = [];
  for (const ponto of caminho.pontos) {
    if (ponto.t % intervaloS !== 0) continue;
    const desvio = ruidoM ? (aleatorio() - 0.5) * 2 * ruidoM : 0;
    const rumoDoRuido = aleatorio() * 360;
    const posicao = ruidoM ? mover(ponto, Math.abs(desvio), rumoDoRuido) : { lat: ponto.lat, lon: ponto.lon };
    observados.push({
      lat: posicao.lat,
      lon: posicao.lon,
      timestamp: T0 + ponto.t * 1000,
      accuracy: precisaoM,
      altitude: ponto.altitude,
    });
  }
  return observados;
}

/**
 * O catálogo. Cada entrada traz `verdadeM` (da construção) e `anomalias`
 * (o que foi injetado de propósito).
 */
export function trilhasDouradas() {
  const lista = [];

  // 1. Reta limpa: o caso fácil, para provar que a soma básica não erra.
  {
    const c = caminhoVerdadeiro([{ metros: 1000, rumoDeg: 0 }]);
    lista.push({
      id: 'reta-limpa',
      titulo: 'Reta de 1 km, sinal bom',
      pontos: observar(c, { precisaoM: 5 }),
      verdadeM: c.distanciaVerdadeiraM,
      anomalias: [],
      toleranciaRelativa: 0.03,
    });
  }

  // 2. Quarteirão urbano: quatro curvas de 90°. Uma medição primeiro→último
  //    daria zero aqui, e a pessoa andou 800 m.
  {
    const c = caminhoVerdadeiro([
      { metros: 200, rumoDeg: 0 }, { metros: 200, rumoDeg: 90 },
      { metros: 200, rumoDeg: 180 }, { metros: 200, rumoDeg: 270 },
    ]);
    lista.push({
      id: 'quarteirao-fechado',
      titulo: 'Volta fechada urbana, 4 × 200 m',
      pontos: observar(c, { precisaoM: 8, ruidoM: 4, semente: 7 }),
      verdadeM: c.distanciaVerdadeiraM,
      anomalias: ['volta fechada: deslocamento líquido ~0'],
      toleranciaRelativa: 0.12,
    });
  }

  // 3. Subida: o desnível que o haversine puro não vê.
  {
    const c = caminhoVerdadeiro([{ metros: 500, rumoDeg: 45, subidaM: 120 }], { velocidadeMs: 1.0 });
    lista.push({
      id: 'ladeira',
      titulo: 'Ladeira de 500 m com 120 m de subida',
      pontos: observar(c, { precisaoM: 6 }),
      verdadeM: c.distanciaVerdadeiraM,
      anomalias: ['desnível de 120 m'],
      toleranciaRelativa: 0.08,
    });
  }

  // 4. Rodovia: passos longos entre fixos, velocidade alta.
  {
    const c = caminhoVerdadeiro([{ metros: 8000, rumoDeg: 30 }], { velocidadeMs: 25 });
    lista.push({
      id: 'rodovia',
      titulo: 'Rodovia, 8 km a 90 km/h',
      pontos: observar(c, { intervaloS: 5, precisaoM: 10 }),
      verdadeM: c.distanciaVerdadeiraM,
      anomalias: ['fixos a 125 m de distância entre si'],
      toleranciaRelativa: 0.03,
    });
  }

  // 5. Parado com ruído: a pessoa NÃO andou. A verdade é zero, e é o caso em
  //    que somar cegamente inventa centenas de metros.
  {
    const parado = [];
    const aleatorio = ruidoPseudoAleatorio(42);
    for (let i = 0; i < 360; i += 1) {
      const p = mover(ORIGEM, aleatorio() * 12, aleatorio() * 360);
      parado.push({ ...p, timestamp: T0 + i * 10_000, accuracy: 12, altitude: 550 });
    }
    lista.push({
      id: 'parado-com-ruido',
      titulo: 'Uma hora parado, GPS tremendo ±12 m',
      pontos: parado,
      verdadeM: 0,
      anomalias: ['ninguém andou: toda distância aqui é ruído'],
      toleranciaAbsolutaM: 150,
    });
  }

  // 6. Perda de sinal: 400 m sem observação no meio.
  {
    const antes = caminhoVerdadeiro([{ metros: 300, rumoDeg: 0 }]);
    const pontos = observar(antes, { precisaoM: 6 });
    const ultimo = pontos.at(-1);
    const reencontro = mover(ultimo, 400, 0);
    pontos.push({ ...reencontro, timestamp: ultimo.timestamp + 300_000, accuracy: 6, altitude: 550 });
    const depois = caminhoVerdadeiro([{ metros: 300, rumoDeg: 0 }]);
    for (const p of observar(depois, { precisaoM: 6 }).slice(1)) {
      const deslocado = mover(reencontro, 0, 0);
      pontos.push({
        lat: deslocado.lat + (p.lat - ORIGEM.lat),
        lon: deslocado.lon + (p.lon - ORIGEM.lon),
        timestamp: ultimo.timestamp + 300_000 + (p.timestamp - T0),
        accuracy: 6, altitude: 550,
      });
    }
    lista.push({
      id: 'perda-de-sinal',
      titulo: '300 m, 5 min sem sinal, 400 m adiante, mais 300 m',
      pontos,
      verdadeM: antes.distanciaVerdadeiraM + depois.distanciaVerdadeiraM,
      naoObservadoM: 400,
      anomalias: ['vão de 400 m que ninguém observou'],
      toleranciaRelativa: 0.06,
    });
  }

  // 7. Salto do sensor: um fixo absurdo no meio de uma caminhada boa.
  {
    const c = caminhoVerdadeiro([{ metros: 600, rumoDeg: 0 }]);
    const pontos = observar(c, { precisaoM: 5 });
    const meio = Math.floor(pontos.length / 2);
    const absurdo = mover(pontos[meio], 40_000, 270);
    pontos.splice(meio, 0, { ...absurdo, timestamp: pontos[meio].timestamp - 1000, accuracy: 5, altitude: 550 });
    lista.push({
      id: 'salto-do-sensor',
      titulo: '600 m com um fixo 40 km fora do lugar',
      pontos,
      verdadeM: c.distanciaVerdadeiraM,
      anomalias: ['um outlier de 40 km'],
      toleranciaRelativa: 0.06,
    });
  }

  // 8. Pausa longa: a pessoa sentou uma hora no meio do caminho.
  {
    const antes = caminhoVerdadeiro([{ metros: 400, rumoDeg: 0 }]);
    const pontos = observar(antes, { precisaoM: 6 });
    const ultimo = pontos.at(-1);
    for (let i = 1; i <= 60; i += 1) {
      pontos.push({ lat: ultimo.lat, lon: ultimo.lon, timestamp: ultimo.timestamp + i * 60_000, accuracy: 6, altitude: 550 });
    }
    const retomada = pontos.at(-1);
    const depois = caminhoVerdadeiro([{ metros: 400, rumoDeg: 0 }]);
    for (const p of observar(depois, { precisaoM: 6 }).slice(1)) {
      pontos.push({
        lat: retomada.lat + (p.lat - ORIGEM.lat),
        lon: retomada.lon + (p.lon - ORIGEM.lon),
        timestamp: retomada.timestamp + (p.timestamp - T0),
        accuracy: 6, altitude: 550,
      });
    }
    lista.push({
      id: 'pausa-longa',
      titulo: '400 m, uma hora sentado, mais 400 m',
      pontos,
      verdadeM: antes.distanciaVerdadeiraM + depois.distanciaVerdadeiraM,
      anomalias: ['uma hora parado no meio — não pode virar quilômetros'],
      toleranciaRelativa: 0.10,
    });
  }

  return lista;
}

export { caminhoVerdadeiro, mover, ORIGEM, T0 };
