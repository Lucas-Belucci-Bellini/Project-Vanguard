import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADOS_MEDIA,
  LIMITES_FIXO_MEDIO,
  criarMediaDeFixos,
  mediaPonderadaDeFixos,
} from '../src/engine/fixo-medio.js';
import { haversine } from '../src/engine/geo.js';

const GRAU_LAT_M = haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
/** `accuracy` é raio de 95%; num espalhamento circular isso é 2,45·σ. */
const RAIO95_POR_SIGMA = 2.448;

function ruido(semente = 42) {
  let s = semente;
  const uniforme = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return () => Math.sqrt(-2 * Math.log(Math.max(1e-9, uniforme()))) * Math.cos(2 * Math.PI * uniforme());
}

test('a média ponderada dá mais peso ao fixo melhor', () => {
  // Peso 1/σ²: um fixo de 5 m pesa 36× o de 30 m. A média tem de ficar quase
  // em cima do fixo bom, não no meio dos dois.
  const bom = { lat: 0, lon: 0, accuracy: 5, timestamp: 0 };
  const ruim = { lat: 360 / GRAU_LAT_M, lon: 0, accuracy: 30, timestamp: 2000 };
  const media = mediaPonderadaDeFixos([bom, ruim]);
  const distanciaDoBom = haversine(bom, media);
  assert.ok(distanciaDoBom < 360 * 0.05, `a média ficou a ${distanciaDoBom.toFixed(1)} m do fixo bom`);
});

test('a média de fixos independentes reduz o erro real mais de duas vezes', () => {
  // Verdade conhecida, ruído reprodutível, e o erro medido contra ela — não
  // contra um número decorado. Este é o teste que sustenta a promessa.
  const gauss = ruido();
  const verdade = { lat: -23.5, lon: -46.6 };
  const cos = Math.cos((verdade.lat * Math.PI) / 180);
  const raio95 = 24;
  const sigma = raio95 / RAIO95_POR_SIGMA;

  let somaFixo = 0;
  let somaMedia = 0;
  let ensaios = 0;
  for (let e = 0; e < 300; e += 1) {
    const acumulador = criarMediaDeFixos();
    let ms = e * 1_000_000;
    let ultimo = null;
    let ultimoFixo = null;
    for (let i = 0; i < 12; i += 1) {
      ultimoFixo = {
        lat: verdade.lat + (sigma * gauss()) / GRAU_LAT_M,
        lon: verdade.lon + (sigma * gauss()) / (GRAU_LAT_M * cos),
        accuracy: raio95,
        timestamp: (ms += 1000),
      };
      ultimo = acumulador.adicionar(ultimoFixo);
    }
    if (!ultimo.posicao) continue;
    somaFixo += haversine(verdade, ultimoFixo) ** 2;
    somaMedia += haversine(verdade, ultimo.posicao) ** 2;
    ensaios += 1;
  }

  assert.ok(ensaios > 280, `só ${ensaios} de 300 ensaios produziram média`);
  const ganho = Math.sqrt(somaFixo / somaMedia);
  assert.ok(ganho > 2.5, `o erro real caiu apenas ${ganho.toFixed(2)}×`);
});

test('a precisão anunciada nunca é melhor que o erro real', () => {
  // A regra que não pode cair: mostrar 8 m quando o erro é 12 m faria alguém
  // confiar numa posição que não merece. O anunciado tem de sobrar.
  const gauss = ruido(2024);
  const verdade = { lat: 10, lon: 20 };
  const cos = Math.cos((verdade.lat * Math.PI) / 180);
  const raio95 = 24;
  const sigma = raio95 / RAIO95_POR_SIGMA;

  let somaMedia = 0;
  let somaAnunciada = 0;
  let ensaios = 0;
  for (let e = 0; e < 300; e += 1) {
    const acumulador = criarMediaDeFixos();
    let ms = e * 1_000_000;
    let ultimo = null;
    for (let i = 0; i < 12; i += 1) {
      ultimo = acumulador.adicionar({
        lat: verdade.lat + (sigma * gauss()) / GRAU_LAT_M,
        lon: verdade.lon + (sigma * gauss()) / (GRAU_LAT_M * cos),
        accuracy: raio95,
        timestamp: (ms += 1000),
      });
    }
    if (!ultimo.posicao) continue;
    somaMedia += haversine(verdade, ultimo.posicao) ** 2;
    somaAnunciada += ultimo.posicao.accuracy;
    ensaios += 1;
  }

  // Erro quadrático médio radial → σ por eixo → raio de 95% verdadeiro.
  const rmsReal = Math.sqrt(somaMedia / ensaios);
  const raio95Real = (rmsReal / Math.SQRT2) * RAIO95_POR_SIGMA;
  const anunciada = somaAnunciada / ensaios;
  assert.ok(
    anunciada >= raio95Real,
    `anunciamos ${anunciada.toFixed(2)} m para um erro real de ${raio95Real.toFixed(2)} m`,
  );
});

test('o teto do ganho anunciado é conservador de propósito', () => {
  assert.ok(LIMITES_FIXO_MEDIO.ganhoMaximo <= 2.5, 'o teto não pode subir sem medir de novo');
  const fixos = Array.from({ length: 16 }, (_, i) => ({ lat: 0, lon: 0, accuracy: 20, timestamp: i * 1000 }));
  const media = mediaPonderadaDeFixos(fixos);
  // A conta formal daria 20/√16 = 5 m; o teto segura em 8 m.
  assert.ok(media.precisaoFormalM < 5.01, `formal ${media.precisaoFormalM}`);
  assert.ok(media.accuracy >= 20 / LIMITES_FIXO_MEDIO.ganhoMaximo - 1e-9, `anunciada ${media.accuracy}`);
  assert.equal(media.limitadaPeloTeto, true);
});

test('fixos grudados no tempo não contam como amostras novas', () => {
  // Erro correlacionado: dois fixos a 100 ms carregam o mesmo desvio. Somá-los
  // encolheria a precisão anunciada sem encolher o erro.
  const acumulador = criarMediaDeFixos();
  let ultimo = null;
  // Dez fixos espremidos em 450 ms — meio intervalo. Nenhum deles é notícia
  // nova depois do primeiro.
  for (let i = 0; i < 10; i += 1) {
    ultimo = acumulador.adicionar({ lat: 0, lon: 0, accuracy: 15, timestamp: i * 50 });
  }
  assert.equal(ultimo.amostras, 1);
  assert.equal(ultimo.descartadosPorTempo, 9);
  assert.equal(ultimo.estado, ESTADOS_MEDIA.ACUMULANDO);
  assert.equal(ultimo.posicao, null, 'sem amostras independentes não há média para entregar');
});

test('um fixo torto sozinho não destrói a média', () => {
  // 5% dos fixos caem fora do raio de 95% por puro acaso. Se cada um deles
  // zerasse a janela, a média nunca ficaria pronta.
  const acumulador = criarMediaDeFixos();
  let ms = 0;
  for (let i = 0; i < 8; i += 1) acumulador.adicionar({ lat: 0, lon: 0, accuracy: 10, timestamp: (ms += 1000) });
  const outlier = acumulador.adicionar({ lat: 60 / GRAU_LAT_M, lon: 0, accuracy: 10, timestamp: (ms += 1000) });
  assert.equal(outlier.estado, ESTADOS_MEDIA.PRONTA, 'um outlier não pode encerrar a média');
  const volta = acumulador.adicionar({ lat: 0, lon: 0, accuracy: 10, timestamp: (ms += 1000) });
  assert.ok(haversine({ lat: 0, lon: 0 }, volta.posicao) < 2, 'o outlier não pode ter puxado o ponto');
});

test('andar de verdade encerra a média e ela recomeça no lugar novo', () => {
  const acumulador = criarMediaDeFixos();
  let ms = 0;
  let ultimo = null;
  for (let i = 0; i < 8; i += 1) ultimo = acumulador.adicionar({ lat: 0, lon: 0, accuracy: 10, timestamp: (ms += 1000) });
  const antes = ultimo.posicao;
  for (let i = 0; i < 4; i += 1) {
    ultimo = acumulador.adicionar({ lat: 40 / GRAU_LAT_M, lon: 0, accuracy: 10, timestamp: (ms += 1000) });
  }
  const deslocou = haversine(antes, ultimo.posicao);
  assert.ok(deslocou > 38, `a média só andou ${deslocou.toFixed(1)} m dos 40 m`);
  assert.ok(ultimo.amostras <= 4, 'a janela antiga não pode sobreviver ao deslocamento');
});

test('fixo de precisão sofrível fica de fora', () => {
  const acumulador = criarMediaDeFixos();
  const fora = acumulador.adicionar({ lat: 0, lon: 0, accuracy: 500, timestamp: 0 });
  assert.equal(fora.amostras, 0);
  assert.match(fora.motivo, /precisão/i);
});

test('coordenada inválida não vira posição', () => {
  // `lon: null` virando longitude 0 é a armadilha que o repositório já pagou.
  const acumulador = criarMediaDeFixos();
  const nulo = acumulador.adicionar({ lat: 10, lon: null, accuracy: 5, timestamp: 0 });
  assert.equal(nulo.amostras, 0);
  assert.equal(mediaPonderadaDeFixos([]).ok, false);
  assert.equal(mediaPonderadaDeFixos([{ lat: 'x', lon: 2 }]).ok, false);
});

test('a média atravessa o antimeridiano sem cair do outro lado do mundo', () => {
  // Somar longitudes cruas aqui daria 0° — o meio do mundo errado.
  const fixos = [
    { lat: 0, lon: 179.9, accuracy: 10, timestamp: 0 },
    { lat: 0, lon: -179.9, accuracy: 10, timestamp: 1000 },
  ];
  const media = mediaPonderadaDeFixos(fixos);
  assert.ok(Math.abs(Math.abs(media.lon) - 180) < 0.01, `longitude média ${media.lon}`);
});

test('a altitude só entra quando existe', () => {
  const comAltitude = mediaPonderadaDeFixos([
    { lat: 0, lon: 0, accuracy: 10, altitude: 100, timestamp: 0 },
    { lat: 0, lon: 0, accuracy: 10, altitude: 120, timestamp: 1000 },
  ]);
  assert.ok(Math.abs(comAltitude.altitude - 110) < 1e-9);
  const semAltitude = mediaPonderadaDeFixos([{ lat: 0, lon: 0, accuracy: 10, timestamp: 0 }]);
  assert.equal('altitude' in semAltitude, false, 'altitude ausente não vira zero');
});
