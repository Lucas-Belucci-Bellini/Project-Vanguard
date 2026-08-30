import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADOS_FOTO_PARADA,
  PRECISAO_PARADA_PADRAO_M,
  avaliarPosicaoParada,
  criarRegistroFotoParada,
  fotoParadaComoWaypoint,
  fotosParadaComoWaypoints,
  nomeArquivoFotoParada,
} from '../src/core/foto-parada.js';

const AGORA = Date.parse('2026-09-10T13:00:00.000Z');
const IMAGEM = { mime: 'image/jpeg', sizeBytes: 240_000, largura: 1600, altura: 1200 };

function posicao(extra = {}) {
  return { lat: -22.9519, lon: -43.2105, accuracy: 8, altitude: 12, createdAt: AGORA - 5_000, ...extra };
}

test('fixo dentro dos 25 m é aceito com a precisão real registrada', () => {
  const avaliacao = avaliarPosicaoParada({ posicao: posicao(), agora: AGORA });
  assert.equal(avaliacao.estado, ESTADOS_FOTO_PARADA.ACEITA);
  assert.equal(avaliacao.dentroDoLimite, true);
  assert.equal(avaliacao.precisaoM, 8);
  assert.equal(avaliacao.precisaoMaximaM, PRECISAO_PARADA_PADRAO_M);
});

test('o limite de 25 m é inclusivo e 26 m já fica fora', () => {
  assert.equal(avaliarPosicaoParada({ posicao: posicao({ accuracy: 25 }), agora: AGORA }).dentroDoLimite, true);
  const fora = avaliarPosicaoParada({ posicao: posicao({ accuracy: 26 }), agora: AGORA });
  assert.equal(fora.dentroDoLimite, false);
  assert.equal(fora.estado, ESTADOS_FOTO_PARADA.PRECISAO_INSUFICIENTE);
  assert.match(fora.motivo, /26 m/);
});

test('sem coordenada válida não existe foto de parada', () => {
  for (const invalida of [null, {}, { lat: -22.9, lon: null }, { lat: 91, lon: 0 }, { lat: 0, lon: 181 }]) {
    const avaliacao = avaliarPosicaoParada({ posicao: invalida, agora: AGORA });
    assert.equal(avaliacao.estado, ESTADOS_FOTO_PARADA.SEM_POSICAO);
    assert.equal(avaliacao.utilizavel, false);
  }
});

test('precisão ausente não passa por precisão boa', () => {
  const avaliacao = avaliarPosicaoParada({ posicao: posicao({ accuracy: undefined }), agora: AGORA });
  assert.equal(avaliacao.estado, ESTADOS_FOTO_PARADA.PRECISAO_INSUFICIENTE);
  assert.equal(avaliacao.dentroDoLimite, false);
  assert.equal(avaliacao.precisaoM, null);
});

test('fixo velho é sinalizado mesmo quando a precisão é ótima', () => {
  const avaliacao = avaliarPosicaoParada({ posicao: posicao({ createdAt: AGORA - 5 * 60_000 }), agora: AGORA });
  assert.equal(avaliacao.estado, ESTADOS_FOTO_PARADA.POSICAO_ANTIGA);
  assert.equal(avaliacao.dentroDoLimite, true);
  assert.equal(avaliacao.idadeMs, 5 * 60_000);
});

test('o limite de precisão é configurável para outros usos', () => {
  const avaliacao = avaliarPosicaoParada({ posicao: posicao({ accuracy: 40 }), agora: AGORA, precisaoMaximaM: 50 });
  assert.equal(avaliacao.estado, ESTADOS_FOTO_PARADA.ACEITA);
  assert.equal(avaliacao.precisaoMaximaM, 50);
});

test('registro aceito guarda coordenada, MGRS, precisão e horário da captura', () => {
  const resultado = criarRegistroFotoParada({
    id: 'parada-001',
    posicao: posicao(),
    imagem: IMAGEM,
    capturadaEm: AGORA,
    nota: 'Capela do meio do caminho',
    agora: AGORA,
  });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.estado, ESTADOS_FOTO_PARADA.ACEITA);
  const registro = resultado.registro;
  assert.equal(registro.lat, -22.9519);
  assert.equal(registro.lon, -43.2105);
  assert.equal(registro.precisaoM, 8);
  assert.equal(registro.dentroDoLimite, true);
  assert.equal(registro.altitude, 12);
  assert.equal(registro.nota, 'Capela do meio do caminho');
  assert.equal(registro.capturadaEm, '2026-09-10T13:00:00.000Z');
  assert.equal(registro.fixoEm, '2026-09-10T12:59:55.000Z');
  assert.equal(registro.idadeFixoMs, 5_000);
  assert.match(registro.mgrs, /^23K/);
  assert.deepEqual(registro.imagem, IMAGEM);
});

test('precisão ruim marca o registro mas nunca descarta a foto', () => {
  const resultado = criarRegistroFotoParada({ id: 'parada-002', posicao: posicao({ accuracy: 120 }), imagem: IMAGEM, agora: AGORA });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.estado, ESTADOS_FOTO_PARADA.PRECISAO_INSUFICIENTE);
  assert.equal(resultado.registro.dentroDoLimite, false);
  assert.equal(resultado.registro.precisaoM, 120);
});

test('sem fixo o registro é recusado em vez de inventar coordenada', () => {
  const resultado = criarRegistroFotoParada({ id: 'parada-003', posicao: null, imagem: IMAGEM, agora: AGORA });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.estado, ESTADOS_FOTO_PARADA.SEM_POSICAO);
  assert.equal(resultado.registro, null);
});

test('arquivo que não é imagem ou está vazio é recusado', () => {
  const semMime = criarRegistroFotoParada({ id: 'x', posicao: posicao(), imagem: { mime: 'application/pdf', sizeBytes: 10 }, agora: AGORA });
  assert.equal(semMime.estado, ESTADOS_FOTO_PARADA.IMAGEM_INVALIDA);
  const vazia = criarRegistroFotoParada({ id: 'x', posicao: posicao(), imagem: { mime: 'image/jpeg', sizeBytes: 0 }, agora: AGORA });
  assert.equal(vazia.estado, ESTADOS_FOTO_PARADA.IMAGEM_INVALIDA);
  const semId = criarRegistroFotoParada({ id: '  ', posicao: posicao(), imagem: IMAGEM, agora: AGORA });
  assert.equal(semId.ok, false);
});

test('a parada vira waypoint com coordenada, precisão e nome do arquivo', () => {
  const { registro } = criarRegistroFotoParada({ id: 'parada-004', posicao: posicao(), imagem: IMAGEM, capturadaEm: AGORA, agora: AGORA });
  const waypoint = fotoParadaComoWaypoint(registro);
  assert.equal(waypoint.lat, -22.9519);
  assert.equal(waypoint.lon, -43.2105);
  assert.equal(waypoint.accuracy, 8);
  assert.equal(waypoint.createdAt, AGORA);
  assert.equal(waypoint.arquivo, 'parada-004.jpg');
  assert.match(waypoint.descricao, /MGRS 23K/);
  assert.match(waypoint.descricao, /precisão 8 m/);
});

test('waypoint de parada fora do limite carrega a ressalva junto', () => {
  const { registro } = criarRegistroFotoParada({ id: 'parada-005', posicao: posicao({ accuracy: 90 }), imagem: IMAGEM, agora: AGORA });
  assert.match(fotoParadaComoWaypoint(registro).descricao, /fora do limite pedido/);
});

test('conversão em lote ignora vazios e recusa registro sem coordenada', () => {
  const { registro } = criarRegistroFotoParada({ id: 'parada-006', posicao: posicao(), imagem: IMAGEM, agora: AGORA });
  assert.equal(fotosParadaComoWaypoints([registro, null]).length, 1);
  assert.throws(() => fotoParadaComoWaypoint({ id: 'z', lat: 'nao-e-numero', lon: 0 }), /sem coordenada válida/);
});

test('o nome do arquivo segue o mime e higieniza o identificador', () => {
  assert.equal(nomeArquivoFotoParada({ id: 'parada 007/../etc', imagem: { mime: 'image/png' } }), 'parada-007-etc.png');
  assert.equal(nomeArquivoFotoParada({ id: 'a', imagem: { mime: 'image/webp' } }), 'a.webp');
});

test('a parada atravessa a exportação GPX/KML/JSON carregando a coordenada', async () => {
  const { exportarRegistroGpx, exportarRegistroKml, exportarRegistroLocal, importarRegistroGpx } =
    await import('../src/core/registro-offline.js');
  const { registro } = criarRegistroFotoParada({
    id: 'parada-007',
    posicao: posicao(),
    imagem: IMAGEM,
    capturadaEm: AGORA,
    nota: 'Marco 12',
    agora: AGORA,
  });
  const waypoints = fotosParadaComoWaypoints([registro]);

  const gpx = exportarRegistroGpx({ trilha: [], waypoints });
  assert.match(gpx, /<wpt lat="-22\.9519" lon="-43\.2105">/);
  assert.match(gpx, /Parada: Marco 12/);

  // A ida e volta prova que a coordenada da captura sobrevive ao formato.
  const devolta = importarRegistroGpx(gpx);
  assert.equal(devolta.waypoints[0].lat, -22.9519);
  assert.equal(devolta.waypoints[0].lon, -43.2105);

  assert.match(exportarRegistroKml({ trilha: [], waypoints }), /-43\.2105,-22\.9519/);

  const json = JSON.parse(exportarRegistroLocal({ trilha: [], waypoints }));
  assert.equal(json.waypoints[0].lat, -22.9519);
  assert.equal(json.waypoints[0].accuracy, 8);
});
