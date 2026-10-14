import test from 'node:test';
import assert from 'node:assert/strict';
import { declinacaoSolarDeg, posicaoSolar } from '../src/engine/sol.js';

const MIN = 60_000;

/** Varre o dia e devolve o instante de maior elevação (meio-dia solar). */
function meioDiaSolar({ lat, lon, diaIso }) {
  const inicio = Date.parse(`${diaIso}T00:00:00.000Z`);
  let melhor = { instanteMs: inicio, elevacaoDeg: -Infinity };
  for (let minuto = 0; minuto < 1440; minuto += 1) {
    const instanteMs = inicio + minuto * MIN;
    const { elevacaoDeg } = posicaoSolar({ lat, lon, instanteMs });
    if (elevacaoDeg > melhor.elevacaoDeg) melhor = { instanteMs, elevacaoDeg };
  }
  return melhor;
}

test('a declinação nos solstícios chega à obliquidade da eclíptica', () => {
  // 23,44° é a obliquidade publicada; é o valor que a declinação atinge nos
  // solstícios, e serve de âncora externa para a implementação.
  const junho = declinacaoSolarDeg(Date.parse('2026-06-21T12:00:00Z'));
  const dezembro = declinacaoSolarDeg(Date.parse('2026-12-21T12:00:00Z'));
  assert.ok(Math.abs(junho - 23.44) < 0.2, `junho: ${junho}`);
  assert.ok(Math.abs(dezembro + 23.44) < 0.2, `dezembro: ${dezembro}`);
});

test('a declinação passa por zero nos equinócios', () => {
  assert.ok(Math.abs(declinacaoSolarDeg(Date.parse('2026-03-20T14:46:00Z'))) < 0.3);
  assert.ok(Math.abs(declinacaoSolarDeg(Date.parse('2026-09-23T00:06:00Z'))) < 0.3);
});

test('a elevação máxima do dia obedece a identidade 90 − |lat − δ|', () => {
  // Identidade da esfera, independente do algoritmo: no meio-dia solar o zênite
  // vale a diferença entre latitude e declinação.
  for (const [lat, lon, dia] of [
    [-23.31, -51.16, '2026-09-12'],
    [0, 0, '2026-06-21'],
    [51.5, -0.12, '2026-12-21'],
    [-33.87, 151.21, '2026-03-20'],
  ]) {
    const { instanteMs, elevacaoDeg } = meioDiaSolar({ lat, lon, diaIso: dia });
    const esperado = 90 - Math.abs(lat - declinacaoSolarDeg(instanteMs));
    assert.ok(Math.abs(elevacaoDeg - esperado) < 0.4, `lat ${lat} em ${dia}: ${elevacaoDeg} vs ${esperado}`);
  }
});

test('a elevação é simétrica em torno do meio-dia solar', () => {
  const { instanteMs } = meioDiaSolar({ lat: -23.31, lon: -51.16, diaIso: '2026-09-12' });
  for (const deslocamentoMin of [30, 90, 180]) {
    const antes = posicaoSolar({ lat: -23.31, lon: -51.16, instanteMs: instanteMs - deslocamentoMin * MIN }).elevacaoDeg;
    const depois = posicaoSolar({ lat: -23.31, lon: -51.16, instanteMs: instanteMs + deslocamentoMin * MIN }).elevacaoDeg;
    assert.ok(Math.abs(antes - depois) < 0.5, `${deslocamentoMin} min: ${antes} vs ${depois}`);
  }
});

test('no meio-dia solar o sol está no meridiano — norte ou sul exatos', () => {
  const { instanteMs } = meioDiaSolar({ lat: -23.31, lon: -51.16, diaIso: '2026-09-12' });
  const { azimuteDeg } = posicaoSolar({ lat: -23.31, lon: -51.16, instanteMs });
  const distanciaDoMeridiano = Math.min(azimuteDeg, Math.abs(azimuteDeg - 180), Math.abs(azimuteDeg - 360));
  assert.ok(distanciaDoMeridiano < 1, `azimute ${azimuteDeg}`);
});

test('à noite o sol fica abaixo do horizonte', () => {
  const noite = posicaoSolar({ lat: -23.31, lon: -51.16, instanteMs: Date.parse('2026-09-12T04:00:00Z') });
  assert.ok(noite.elevacaoDeg < 0);
  assert.equal(noite.acimaDoHorizonte, false);
});

test('os hemisférios vivem estações opostas no mesmo instante', () => {
  const solsticioJunho = Date.parse('2026-06-21T12:00:00Z');
  const norte = meioDiaSolar({ lat: 40, lon: 0, diaIso: '2026-06-21' }).elevacaoDeg;
  const sul = meioDiaSolar({ lat: -40, lon: 0, diaIso: '2026-06-21' }).elevacaoDeg;
  assert.ok(norte > sul, `norte ${norte} deveria superar sul ${sul}`);
  assert.ok(declinacaoSolarDeg(solsticioJunho) > 0);
});

test('no círculo polar em pleno verão o sol não se põe', () => {
  const elevacoes = Array.from({ length: 24 }, (_, hora) =>
    posicaoSolar({ lat: 78, lon: 15, instanteMs: Date.parse('2026-06-21T00:00:00Z') + hora * 60 * MIN }).elevacaoDeg);
  assert.ok(elevacoes.every((elevacao) => elevacao > 0), `mínima ${Math.min(...elevacoes)}`);
});

test('entrada não numérica é recusada em vez de devolver posição inventada', () => {
  assert.throws(() => posicaoSolar({ lat: 'norte', lon: 0 }), TypeError);
  assert.throws(() => posicaoSolar({ lat: 0, lon: null }), TypeError);
});
