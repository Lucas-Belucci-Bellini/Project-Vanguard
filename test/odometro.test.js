import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES_ODOMETRO,
  MOTIVOS_SEGMENTO,
  avaliarSegmento,
  distancia3D,
  elevacaoAcumulada,
  limiarDoSegmento,
  medirTrilha,
} from '../src/engine/odometro.js';
import { haversine } from '../src/engine/geo.js';

/** Um grau de latitude ≈ 111,2 km; usar isto evita coordenada decorada. */
const GRAU_LAT_M = haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });

/** Ponto a `metros` ao norte da origem. */
function aoNorte(metros, extras = {}) {
  return { lat: metros / GRAU_LAT_M, lon: 0, accuracy: 5, ...extras };
}

test('a distância 3D é a hipotenusa do horizontal com o desnível', () => {
  // Propriedade verificável: 40 m no plano com 30 m de subida têm de dar 50 m,
  // que é o triângulo 3-4-5. Nenhum número aqui é decorado.
  const a = { lat: 0, lon: 0, altitude: 100, accuracy: 4 };
  const b = { ...aoNorte(40), altitude: 130, accuracy: 4 };
  const medida = distancia3D(a, b);
  assert.ok(Math.abs(medida.horizontalM - 40) < 0.05, `horizontal ${medida.horizontalM}`);
  assert.equal(medida.verticalM, 30);
  assert.ok(Math.abs(medida.totalM - 50) < 0.05, `total ${medida.totalM}`);
});

test('sem altitude a conta cai para o horizontal, sem inventar desnível', () => {
  const medida = distancia3D({ lat: 0, lon: 0 }, aoNorte(100));
  assert.equal(medida.verticalM, 0);
  assert.equal(medida.desnivelBruto, null);
  assert.ok(Math.abs(medida.totalM - medida.horizontalM) < 1e-9);
});

test('salto de altitude impossível é descartado, mas o horizontal continua valendo', () => {
  // 10 m no plano com 200 m de "subida" seria uma rampa de 2000 %: é o
  // receptor perdendo a referência vertical, não relevo.
  const medida = distancia3D({ lat: 0, lon: 0, altitude: 100 }, { ...aoNorte(10), altitude: 300 });
  assert.equal(medida.verticalDescartado, true);
  assert.equal(medida.verticalM, 0);
  assert.ok(Math.abs(medida.totalM - medida.horizontalM) < 1e-9, 'o horizontal não pode ser perdido junto');
});

test('a peneira cresce com a precisão informada, e nunca desce do piso', () => {
  const bom = limiarDoSegmento({ accuracy: 3 }, { accuracy: 3 });
  const ruim = limiarDoSegmento({ accuracy: 30 }, { accuracy: 30 });
  assert.ok(ruim > bom, 'fixo pior tem de exigir deslocamento maior');
  // Erros independentes somam em quadratura: √(3²+3²)·1,0 ≈ 4,24, acima do
  // piso de 2,5 — então quem manda é a precisão.
  assert.ok(Math.abs(bom - Math.hypot(3, 3) * LIMITES_ODOMETRO.fatorPrecisao) < 1e-9, `veio ${bom}`);
  assert.ok(Math.abs(ruim - Math.hypot(30, 30) * LIMITES_ODOMETRO.fatorPrecisao) < 1e-9);
  // Com fixo muito bom, o piso absoluto volta a ser o limite.
  assert.equal(limiarDoSegmento({ accuracy: 1 }, { accuracy: 1 }), LIMITES_ODOMETRO.ruidoMinimoM);
  // Sem precisão declarada, não se inventa confiança.
  assert.equal(limiarDoSegmento({}, {}), LIMITES_ODOMETRO.ruidoMinimoM);
});

test('GPS tremendo parado não vira distância andada', () => {
  // Uma hora sentado, um fixo a cada 5 s, com ±12 m de ruído em volta do mesmo
  // lugar. A conta antiga somava tudo; esta tem de somar zero.
  let semente = 7;
  const aleatorio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648 - 0.5; };
  // Tremor limitado em torno do mesmo lugar (σ ≈ metade da precisão), que é
  // como um receptor parado se comporta — não um passeio aleatório que se
  // afasta sozinho.
  const pontos = Array.from({ length: 720 }, (_, i) => ({
    lat: (aleatorio() * 12) / GRAU_LAT_M,
    lon: (aleatorio() * 12) / GRAU_LAT_M,
    altitude: 700 + aleatorio() * 20,
    accuracy: 12,
    timestamp: i * 5000,
  }));
  const medida = medirTrilha(pontos);
  assert.equal(medida.distanciaM, 0, `ruído virou ${medida.distanciaM.toFixed(1)} m de caminhada`);
  assert.ok(medida.descartados[MOTIVOS_SEGMENTO.ABAIXO_DO_RUIDO] > 700);
});

test('passos curtos e seguidos acumulam em vez de serem apagados um a um', () => {
  // Este é o defeito antigo: cada passo de 1 m ficava abaixo do portão de 5 m
  // e era jogado fora, então mil metros viravam zero. Aqui a âncora só anda
  // quando um segmento conta, então a soma tem de chegar perto de 100 m.
  const pontos = Array.from({ length: 101 }, (_, i) => aoNorte(i * 1, { accuracy: 4, timestamp: i * 1000 }));
  const medida = medirTrilha(pontos);
  assert.ok(medida.distanciaM > 95, `somou só ${medida.distanciaM.toFixed(1)} m de 100`);
  assert.ok(medida.distanciaM <= 100.5);
});

test('a escada aparece: deslocamento horizontal pequeno com subida real conta', () => {
  // Um lance de escada por vez: 3 m na horizontal, 3 m de subida cada.
  // No plano seriam 3 m por segmento — abaixo de qualquer portão útil.
  // Em 3D são 4,24 m, e é isso que precisa ser somado.
  const pontos = Array.from({ length: 11 }, (_, i) => ({
    ...aoNorte(i * 3, { accuracy: 4, timestamp: i * 8000 }),
    altitude: 800 + i * 3,
  }));
  const medida = medirTrilha(pontos);
  const esperado = 10 * Math.hypot(3, 3);
  assert.ok(Math.abs(medida.distanciaM - esperado) < 1, `veio ${medida.distanciaM.toFixed(1)}, esperado ~${esperado.toFixed(1)}`);
  assert.ok(medida.distanciaM > 40, 'a subida tem de aparecer na distância');
});

test('ganho de elevação usa histerese — ruído vertical não vira montanha', () => {
  // Cem leituras planas com ±5 m de tremor. Somar |Δ| daria centenas de metros
  // de "subida" numa caminhada que não subiu nada.
  let semente = 3;
  const aleatorio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648 - 0.5; };
  const plano = Array.from({ length: 100 }, () => ({ lat: 0, lon: 0, altitude: 500 + aleatorio() * 10 }));
  const { ganhoM } = elevacaoAcumulada(plano);
  assert.ok(ganhoM < 30, `ruído virou ${ganhoM.toFixed(0)} m de ganho`);

  // Subida real de 300 m tem de aparecer quase inteira.
  const subida = Array.from({ length: 100 }, (_, i) => ({ lat: 0, lon: 0, altitude: 500 + i * 3 }));
  const real = elevacaoAcumulada(subida);
  assert.ok(real.ganhoM > 280, `subida real virou só ${real.ganhoM.toFixed(0)} m`);
  assert.equal(real.perdaM, 0);
});

test('fixo com precisão terrível é recusado em vez de virar quilômetro', () => {
  const a = { lat: 0, lon: 0, accuracy: 4 };
  const b = { ...aoNorte(300), accuracy: 900 };
  const resultado = avaliarSegmento(a, b);
  assert.equal(resultado.conta, false);
  assert.equal(resultado.motivo, MOTIVOS_SEGMENTO.PRECISAO_RUIM);
});

test('a medida conta o que descartou, para número baixo não parecer caminhada curta', () => {
  const medida = medirTrilha([
    { lat: 0, lon: 0, accuracy: 4 },
    { lat: 'x', lon: 0 },
    { ...aoNorte(500), accuracy: 800 },
    aoNorte(1000, { accuracy: 4 }),
  ]);
  assert.equal(medida.descartados[MOTIVOS_SEGMENTO.COORDENADA_INVALIDA], 1);
  assert.equal(medida.descartados[MOTIVOS_SEGMENTO.PRECISAO_RUIM], 1);
  assert.equal(medida.pontos, 4);
  // O fixo ruim não virou âncora, então o metro andado até o fixo bom seguinte
  // sobreviveu. Reancorar num ponto sem confiança apagaria o trecho inteiro.
  assert.ok(medida.distanciaM > 950, `perdeu o trecho: ${medida.distanciaM.toFixed(0)} m`);
});

test('trilha vazia ou de um ponto devolve zero, não erro', () => {
  assert.equal(medirTrilha([]).distanciaM, 0);
  assert.equal(medirTrilha([{ lat: 0, lon: 0 }]).distanciaM, 0);
  assert.equal(medirTrilha(null).distanciaM, 0);
  assert.equal(elevacaoAcumulada([]).ganhoM, 0);
});
