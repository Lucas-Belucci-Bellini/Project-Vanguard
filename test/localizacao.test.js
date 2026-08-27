import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPosicao, precisaoLabel, velocidadeLabel, opcoesLocalizacao, distanciaLocalM, idadePosicaoMs, idadePosicaoLabel, frescorPosicao } from '../src/core/localizacao.js';

test('normalizarPosicao converte a leitura nativa para o contrato do app', () => {
  const atual = normalizarPosicao({
    timestamp: 1700000000000,
    coords: {
      latitude: -22.95,
      longitude: -43.21,
      accuracy: 8.4,
      altitude: 31.2,
      speed: 1.5,
      heading: 271
    }
  });
  assert.deepEqual(atual, {
    lat: -22.95,
    lon: -43.21,
    accuracy: 8.4,
    altitude: 31.2,
    speed: 1.5,
    heading: 271,
    timestamp: 1700000000000
  });
});

test('normalizarPosicao trata altitude, velocidade e rumo inválidos como indisponíveis', () => {
  const atual = normalizarPosicao({ latitude: 1, longitude: 2, accuracy: null, altitude: null, speed: -1, heading: -1 });
  assert.equal(atual.lat, 1);
  assert.equal(atual.lon, 2);
  assert.equal(atual.accuracy, null);
  assert.equal(atual.altitude, null);
  assert.equal(atual.speed, null);
  assert.equal(atual.heading, null);
});

test('formatadores não inventam precisão ou velocidade quando faltam dados', () => {
  assert.equal(precisaoLabel(null), 'precisão indisponível');
  assert.equal(velocidadeLabel(null), '—');
  assert.equal(velocidadeLabel(2), '7.2 km/h');
});

test('idade e frescor do fixo distinguem posição atual, antiga e inválida', () => {
  const agora = 1_700_000_000_000;
  const atual = { timestamp: agora - 5_000 };
  assert.equal(idadePosicaoMs(atual, agora), 5_000);
  assert.equal(idadePosicaoLabel(atual, agora), 'agora');
  assert.equal(frescorPosicao(atual, agora), 'atual');
  assert.equal(idadePosicaoLabel({ timestamp: agora - 2 * 60_000 }, agora), 'há 2 min');
  assert.equal(frescorPosicao({ timestamp: agora - 10 * 60_000 }, agora), 'antigo');
  assert.equal(idadePosicaoLabel({ timestamp: 'não é data' }, agora), 'idade indisponível');
  assert.equal(frescorPosicao({ timestamp: agora + 1 }, agora), 'indisponível');
});

test('política de localização reserva alta precisão para trilha e emergência', () => {
  assert.equal(opcoesLocalizacao('cidade').enableHighAccuracy, false);
  assert.equal(opcoesLocalizacao('cidade').minDistanceM, 12);
  assert.equal(opcoesLocalizacao('bussola').enableHighAccuracy, false);
  assert.equal(opcoesLocalizacao('trilha').enableHighAccuracy, true);
  assert.equal(opcoesLocalizacao('emergencia').maximumAge, 0);
  assert.equal(opcoesLocalizacao('desconhecido').enableHighAccuracy, false);
});

test('distanciaLocalM mede deslocamento e rejeita posições inválidas', () => {
  const distancia = distanciaLocalM({ lat: 0, lon: 0 }, { lat: 0, lon: 0.001 });
  assert.ok(distancia > 100 && distancia < 120);
  assert.equal(distanciaLocalM(null, { lat: 0, lon: 0 }), Infinity);
});
