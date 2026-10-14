import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BANDAS,
  EVENTOS_ESCUTA,
  LIMIARES_PADRAO,
  MOTIVOS,
  PISO_DB,
  analisarQuadro,
  binsDaBanda,
  criarDetectorAcustico,
  inclinacaoDbPorSegundo,
  mediana,
  nivelDaBanda,
  picoEspectral,
  sustentacaoDb,
} from '../src/engine/escuta.js';

const TAXA = 48000;
const BINS = 1024; // fftSize 2048

/** Espectro plano em `db`, com picos opcionais em hertz. */
function espectro(db, picos = []) {
  const larguraBin = TAXA / (2 * BINS);
  const dados = new Float32Array(BINS).fill(db);
  for (const { hz, db: dbPico } of picos) {
    dados[Math.round(hz / larguraBin)] = dbPico;
  }
  return dados;
}

test('a largura do bin sai da definição da FFT, não de um número decorado', () => {
  // fftSize N entrega N/2 bins entre 0 e Nyquist: cada bin vale
  // taxa / (2 * bins) = 48000 / 2048 = 23,4375 Hz.
  const faixa = binsDaBanda({ deHz: 30, ateHz: 200, taxaAmostragem: TAXA, totalBins: BINS });
  assert.equal(faixa.larguraBin, 48000 / 2048);
  assert.equal(faixa.inicio, Math.round(30 / faixa.larguraBin));
  assert.equal(faixa.fim, Math.round(200 / faixa.larguraBin));
  assert.ok(faixa.inicio < faixa.fim);
});

test('faixa inválida devolve null em vez de uma banda inventada', () => {
  const base = { taxaAmostragem: TAXA, totalBins: BINS };
  assert.equal(binsDaBanda({ ...base, deHz: 200, ateHz: 30 }), null);
  assert.equal(binsDaBanda({ ...base, deHz: 30, ateHz: 30 }), null);
  assert.equal(binsDaBanda({ deHz: 30, ateHz: 200, taxaAmostragem: 0, totalBins: BINS }), null);
  assert.equal(nivelDaBanda(new Float32Array(0), { ...BANDAS.MOTOR, taxaAmostragem: TAXA }), null);
});

test('banda constante devolve exatamente o nível dela', () => {
  // Identidade: média de potência de N cópias de x é x.
  const nivel = nivelDaBanda(espectro(-42), { ...BANDAS.MOTOR, taxaAmostragem: TAXA });
  assert.ok(Math.abs(nivel - -42) < 1e-9);
});

test('a média é de potência, não de decibel — metade dos bins em silêncio dá −3,01 dB', () => {
  // Verificável fora do código: metade da potência é 10·log10(0,5) = −3,0103 dB.
  // A média aritmética dos decibéis daria −70, que é uma resposta errada.
  const banda = { deHz: 0, ateHz: 200 }; // 10 bins: precisa ser par para dividir ao meio
  const faixa = binsDaBanda({ ...banda, taxaAmostragem: TAXA, totalBins: BINS });
  const total = faixa.fim - faixa.inicio + 1;
  assert.equal(total % 2, 0, 'este teste precisa de um número par de bins');

  const dados = new Float32Array(BINS).fill(PISO_DB);
  for (let i = faixa.inicio; i < faixa.inicio + total / 2; i += 1) dados[i] = 0;
  const nivel = nivelDaBanda(dados, { ...banda, taxaAmostragem: TAXA });
  assert.ok(Math.abs(nivel - 10 * Math.log10(0.5)) < 1e-6, `veio ${nivel}`);
});

test('silêncio digital (-Infinity) entra como piso e não contamina a soma', () => {
  const dados = espectro(-60);
  const faixa = binsDaBanda({ ...BANDAS.MOTOR, taxaAmostragem: TAXA, totalBins: BINS });
  dados[faixa.inicio] = -Infinity;
  const nivel = nivelDaBanda(dados, { ...BANDAS.MOTOR, taxaAmostragem: TAXA });
  assert.ok(Number.isFinite(nivel), 'um bin em silêncio não pode apagar a banda inteira');
  assert.ok(nivel < -60 && nivel > -61, `veio ${nivel}`);
});

test('o pico volta na frequência certa, dentro de meio bin', () => {
  const larguraBin = TAXA / (2 * BINS);
  const pico = picoEspectral(espectro(-80, [{ hz: 750, db: -12 }]), { taxaAmostragem: TAXA });
  assert.equal(pico.db, -12);
  assert.ok(Math.abs(pico.hz - 750) <= larguraBin / 2, `veio ${pico.hz} Hz`);
});

test('a inclinação de uma reta é o coeficiente da reta', () => {
  // Propriedade estrutural: mínimos quadrados sobre pontos perfeitamente
  // colineares tem de devolver o próprio coeficiente angular.
  const amostras = Array.from({ length: 20 }, (_, i) => ({ instante: i * 100, nivel: -70 + 2.5 * (i * 0.1) }));
  assert.ok(Math.abs(inclinacaoDbPorSegundo(amostras) - 2.5) < 1e-9);

  const plana = Array.from({ length: 20 }, (_, i) => ({ instante: i * 100, nivel: -70 }));
  assert.ok(Math.abs(inclinacaoDbPorSegundo(plana)) < 1e-9);
});

test('a inclinação ignora o pico isolado que a diferença ponta-a-ponta engoliria', () => {
  const base = Array.from({ length: 40 }, (_, i) => ({ instante: i * 100, nivel: -70 }));
  const comPico = base.map((a, i) => (i === 39 ? { ...a, nivel: -20 } : a));
  // Ponta a ponta daria 50 dB em 3,9 s ≈ 12,8 dB/s. A reta dilui para bem menos.
  assert.ok(inclinacaoDbPorSegundo(comPico) < 5);
});

test('mediana e sustentação enxergam o degrau e não o estalo', () => {
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 3, 2]), 2.5);
  assert.equal(mediana([]), null);

  const rampa = Array.from({ length: 30 }, (_, i) => ({ instante: i * 100, nivel: -70 + i * 0.5 }));
  assert.ok(sustentacaoDb(rampa) >= 9, `veio ${sustentacaoDb(rampa)}`);

  const estalo = Array.from({ length: 30 }, (_, i) => ({ instante: i * 100, nivel: i === 28 ? -20 : -70 }));
  assert.ok(sustentacaoDb(estalo) < 1, 'um único bin alto não é sustentação');
});

test('o quadro reúne as três bandas e recusa entrada sem taxa de amostragem', () => {
  const quadro = analisarQuadro(espectro(-70, [{ hz: 90, db: -20 }]), { taxaAmostragem: TAXA });
  assert.ok(Number.isFinite(quadro.motorDb) && Number.isFinite(quadro.rodagemDb) && Number.isFinite(quadro.vozDb));
  assert.ok(quadro.motorDb > quadro.vozDb, 'um tom em 90 Hz tem de aparecer na banda do motor');
  assert.equal(analisarQuadro(espectro(-70), {}), null);
});

test('MOTOR e VOZ não se sobrepõem — é essa separação que distingue veículo de grito', () => {
  assert.ok(BANDAS.MOTOR.ateHz <= BANDAS.VOZ.deHz,
    'se as bandas se cruzarem, comparar uma com a outra deixa de significar algo');
});

/** Alimenta o detector com uma sequência de níveis a 10 Hz. */
function correr(detector, niveis, { instanteInicial = 0, passoMs = 100 } = {}) {
  let ultimo = null;
  const eventos = [];
  niveis.forEach(({ motorDb, vozDb }, i) => {
    ultimo = detector.observar({
      instante: instanteInicial + i * passoMs,
      quadro: { motorDb, vozDb, rodagemDb: motorDb - 6 },
    });
    if (ultimo.evento) eventos.push({ i, evento: ultimo.evento });
  });
  return { ultimo, eventos };
}

const AMBIENTE = { motorDb: -70, vozDb: -72 };

test('ambiente parado nunca dispara — nem depois de minutos escutando', () => {
  const detector = criarDetectorAcustico();
  // 3 minutos a 10 Hz, com o tremor que qualquer microfone real tem.
  const niveis = Array.from({ length: 1800 }, (_, i) => ({
    motorDb: AMBIENTE.motorDb + Math.sin(i / 7) * 1.5,
    vozDb: AMBIENTE.vozDb + Math.cos(i / 5) * 1.5,
  }));
  const { eventos } = correr(detector, niveis);
  assert.deepEqual(eventos, [], 'ruído de fundo virou alerta');
});

test('ruído alto e constante vira piso, não alerta — parar ao lado de um gerador não pode vibrar', () => {
  const detector = criarDetectorAcustico();
  const niveis = Array.from({ length: 600 }, () => ({ motorDb: -25, vozDb: -40 }));
  const { eventos, ultimo } = correr(detector, niveis);
  assert.deepEqual(eventos, [], 'nível alto sem subida não é aproximação');
  assert.equal(ultimo.motivo, MOTIVOS.ABAIXO_DO_PISO);
});

test('caminhão se aproximando dispara VEICULO_APROXIMANDO', () => {
  const detector = criarDetectorAcustico();
  const ambiente = Array.from({ length: 200 }, () => ({ ...AMBIENTE }));
  // 8 segundos subindo ~2,5 dB/s no grave: é a assinatura de massa se
  // aproximando, e a voz mal se mexe.
  const aproximacao = Array.from({ length: 80 }, (_, i) => ({
    motorDb: -70 + i * 0.25,
    vozDb: -72 + i * 0.05,
  }));
  const { eventos } = correr(detector, [...ambiente, ...aproximacao]);
  assert.ok(eventos.length > 0, 'a aproximação não foi detectada');
  assert.equal(eventos[0].evento, EVENTOS_ESCUTA.VEICULO_APROXIMANDO);
});

test('um esbarrão no bolso não vira caminhão nem grito', () => {
  const detector = criarDetectorAcustico();
  const ambiente = Array.from({ length: 200 }, () => ({ ...AMBIENTE }));
  // Dois quadros muito altos e o silêncio de volta: forte, curto, sem
  // sustentação. É exatamente o caso que a mediana de terços existe para negar.
  const baque = [
    { motorDb: -30, vozDb: -45 },
    { motorDb: -28, vozDb: -44 },
    ...Array.from({ length: 60 }, () => ({ ...AMBIENTE })),
  ];
  const { eventos } = correr(detector, [...ambiente, ...baque]);
  // Duas defesas diferentes: a sustentação nega o veículo (foi curto) e a
  // dominância nega o chamado (subiu tanto no grave quanto na voz, o que uma
  // pessoa gritando não faz).
  assert.deepEqual(eventos, [], 'baque isolado virou alerta');
});

test('estouro em toda a faixa não é grito, por mais alto que seja', () => {
  const detector = criarDetectorAcustico();
  const ambiente = Array.from({ length: 200 }, () => ({ ...AMBIENTE }));
  // Sobe 30 dB nas duas bandas junto — assinatura de choque mecânico, não de voz.
  const estouro = Array.from({ length: 12 }, (_, i) => ({ motorDb: -70 + i * 3, vozDb: -72 + i * 3 }));
  const { eventos } = correr(detector, [...ambiente, ...estouro]);
  assert.ok(!eventos.some((e) => e.evento === EVENTOS_ESCUTA.CHAMADO_VOZ),
    'ruído de banda larga não pode virar chamado de voz');
});

test('um grito dispara CHAMADO_VOZ, e não o alerta de veículo', () => {
  const detector = criarDetectorAcustico();
  const ambiente = Array.from({ length: 200 }, () => ({ ...AMBIENTE }));
  // Subida rápida só na banda de voz: 1,2 s até +25 dB, o grave quieto.
  const grito = Array.from({ length: 12 }, (_, i) => ({
    motorDb: -70,
    vozDb: -72 + i * 2.5,
  }));
  const { eventos } = correr(detector, [...ambiente, ...grito]);
  assert.ok(eventos.length > 0, 'o grito não foi detectado');
  assert.equal(eventos[0].evento, EVENTOS_ESCUTA.CHAMADO_VOZ);
});

test('sem leitura o detector diz que não tem leitura, em vez de fingir silêncio', () => {
  const detector = criarDetectorAcustico();
  assert.equal(detector.observar({}).motivo, MOTIVOS.SEM_LEITURA);
  assert.equal(detector.observar({ instante: 0, quadro: { motorDb: NaN, vozDb: -70 } }).motivo, MOTIVOS.SEM_LEITURA);
  assert.equal(detector.observar({ instante: 0, quadro: { motorDb: -70, vozDb: -70 } }).motivo, MOTIVOS.AQUECENDO);
});

test('o piso desce rápido e sobe devagar — senão o próprio alvo apaga o alerta', () => {
  assert.ok(LIMIARES_PADRAO.alfaDescida > LIMIARES_PADRAO.alfaSubida * 5,
    'um piso que sobe junto com o sinal cega o detector');

  const detector = criarDetectorAcustico();
  correr(detector, Array.from({ length: 100 }, () => ({ motorDb: -30, vozDb: -40 })));
  // Caiu o silêncio: o piso tem de acompanhar depressa para o próximo veículo
  // ainda se destacar.
  const { ultimo } = correr(detector, Array.from({ length: 60 }, () => ({ motorDb: -80, vozDb: -85 })), { instanteInicial: 10_000 });
  assert.ok(ultimo.leitura.pisoMotorDb < -70, `piso ficou preso em ${ultimo.leitura.pisoMotorDb}`);
});

test('a sensibilidade é parâmetro, não constante escondida', () => {
  const surdo = criarDetectorAcustico({ limiares: { margemVeiculoDb: 40 } });
  assert.equal(surdo.limiares.margemVeiculoDb, 40);
  const ambiente = Array.from({ length: 200 }, () => ({ ...AMBIENTE }));
  const aproximacao = Array.from({ length: 80 }, (_, i) => ({ motorDb: -70 + i * 0.25, vozDb: -72 }));
  assert.deepEqual(correr(surdo, [...ambiente, ...aproximacao]).eventos, []);
});
