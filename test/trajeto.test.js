import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPOS_PARADA,
  encerrarParada,
  encerrarTrajeto,
  iniciarParada,
  iniciarTrajeto,
  paradaAberta,
  resumoTrajeto,
} from '../src/core/trajeto.js';

const INICIO = Date.parse('2026-09-12T06:00:00.000Z');
const MIN = 60_000;
const HORA = 60 * MIN;

function trajetoDe(...eventos) {
  let trajeto = iniciarTrajeto({ id: 'peregrinacao', agora: INICIO }).trajeto;
  for (const evento of eventos) {
    const resultado = evento(trajeto);
    assert.equal(resultado.ok, true, resultado.motivo);
    trajeto = resultado.trajeto;
  }
  return trajeto;
}

test('o trajeto guarda início e ainda não tem fim', () => {
  const { ok, trajeto } = iniciarTrajeto({ agora: INICIO });
  assert.equal(ok, true);
  assert.equal(trajeto.iniciadoEm, '2026-09-12T06:00:00.000Z');
  assert.equal(trajeto.encerradoEm, null);
  assert.deepEqual(trajeto.paradas, []);
});

test('o tempo total corre enquanto o trajeto está aberto', () => {
  const trajeto = trajetoDe();
  const resumo = resumoTrajeto(trajeto, { agora: INICIO + 3 * HORA });
  assert.equal(resumo.ativo, true);
  assert.equal(resumo.encerrado, false);
  assert.equal(resumo.duracaoTotalMs, 3 * HORA);
  assert.equal(resumo.duracaoTotalLabel, '3h 00min');
  assert.equal(resumo.tempoEmMarchaMs, 3 * HORA);
  assert.equal(resumo.tempoDescansandoMs, 0);
});

test('encerrar o trajeto congela o total no instante do botão', () => {
  const trajeto = trajetoDe((t) => encerrarTrajeto(t, { agora: INICIO + 8 * HORA }));
  const resumo = resumoTrajeto(trajeto, { agora: INICIO + 40 * HORA });
  assert.equal(resumo.encerrado, true);
  assert.equal(resumo.ativo, false);
  assert.equal(resumo.duracaoTotalMs, 8 * HORA);
  assert.equal(resumo.encerradoEm, '2026-09-12T14:00:00.000Z');
});

test('descanso sai do tempo de marcha mas continua no total', () => {
  const trajeto = trajetoDe(
    (t) => iniciarParada(t, { agora: INICIO + HORA }),
    (t) => encerrarParada(t, { agora: INICIO + HORA + 20 * MIN }),
    (t) => encerrarTrajeto(t, { agora: INICIO + 5 * HORA }),
  );
  const resumo = resumoTrajeto(trajeto);
  assert.equal(resumo.duracaoTotalMs, 5 * HORA);
  assert.equal(resumo.tempoDescansandoMs, 20 * MIN);
  assert.equal(resumo.tempoEmMarchaMs, 5 * HORA - 20 * MIN);
  assert.equal(resumo.paradas, 1);
});

test('parada aberta é contada até agora, sem esperar o fim', () => {
  const trajeto = trajetoDe((t) => iniciarParada(t, { agora: INICIO + 2 * HORA }));
  const resumo = resumoTrajeto(trajeto, { agora: INICIO + 2 * HORA + 15 * MIN });
  assert.equal(resumo.emParada, true);
  assert.equal(resumo.tipoParadaAtual, TIPOS_PARADA.DESCANSO);
  assert.equal(resumo.tempoDescansandoMs, 15 * MIN);
  assert.equal(resumo.tempoEmMarchaMs, 2 * HORA);
});

test('várias paradas somam e o pernoite é contado à parte', () => {
  const trajeto = trajetoDe(
    (t) => iniciarParada(t, { agora: INICIO + HORA }),
    (t) => encerrarParada(t, { agora: INICIO + HORA + 10 * MIN }),
    (t) => iniciarParada(t, { agora: INICIO + 3 * HORA }),
    (t) => encerrarParada(t, { agora: INICIO + 3 * HORA + 20 * MIN }),
    (t) => iniciarParada(t, { tipo: TIPOS_PARADA.PERNOITE, agora: INICIO + 12 * HORA }),
    (t) => encerrarParada(t, { agora: INICIO + 19 * HORA }),
    (t) => encerrarTrajeto(t, { agora: INICIO + 24 * HORA }),
  );
  const resumo = resumoTrajeto(trajeto);
  assert.equal(resumo.paradas, 2);
  assert.equal(resumo.pernoites, 1);
  assert.equal(resumo.tempoDescansandoMs, 10 * MIN + 20 * MIN + 7 * HORA);
  assert.equal(resumo.tempoEmMarchaMs, 24 * HORA - (30 * MIN + 7 * HORA));
});

test('encerrar o trajeto fecha a parada aberta no mesmo instante', () => {
  const trajeto = trajetoDe(
    (t) => iniciarParada(t, { agora: INICIO + HORA }),
    (t) => encerrarTrajeto(t, { agora: INICIO + 2 * HORA }),
  );
  assert.equal(paradaAberta(trajeto), null);
  // Sem esse fechamento o descanso cresceria para sempre depois do fim.
  assert.equal(resumoTrajeto(trajeto, { agora: INICIO + 100 * HORA }).tempoDescansandoMs, HORA);
});

test('a parada guarda onde o grupo parou quando há posição', () => {
  const trajeto = trajetoDe((t) => iniciarParada(t, { agora: INICIO + HORA, posicao: { lat: -23.31, lon: -51.16 }, nota: 'sombra' }));
  assert.equal(trajeto.paradas[0].lat, -23.31);
  assert.equal(trajeto.paradas[0].nota, 'sombra');
});

test('posição inválida não vira coordenada na parada', () => {
  const trajeto = trajetoDe((t) => iniciarParada(t, { agora: INICIO + HORA, posicao: { lat: -23.31, lon: null } }));
  assert.equal(Object.hasOwn(trajeto.paradas[0], 'lat'), false);
});

test('duas paradas abertas ao mesmo tempo são recusadas', () => {
  const trajeto = trajetoDe((t) => iniciarParada(t, { agora: INICIO + HORA }));
  const segunda = iniciarParada(trajeto, { agora: INICIO + 2 * HORA });
  assert.equal(segunda.ok, false);
  assert.equal(segunda.codigo, 'PARADA_EM_ANDAMENTO');
});

test('trajeto encerrado não aceita parada nem novo encerramento', () => {
  const trajeto = trajetoDe((t) => encerrarTrajeto(t, { agora: INICIO + HORA }));
  assert.equal(iniciarParada(trajeto, { agora: INICIO + 2 * HORA }).codigo, 'TRAJETO_ENCERRADO');
  assert.equal(encerrarTrajeto(trajeto, { agora: INICIO + 2 * HORA }).codigo, 'TRAJETO_ENCERRADO');
});

test('tempo que anda para trás é recusado em vez de virar duração negativa', () => {
  const trajeto = trajetoDe();
  assert.equal(iniciarParada(trajeto, { agora: INICIO - HORA }).codigo, 'PARADA_ANTES_DO_INICIO');
  assert.equal(encerrarTrajeto(trajeto, { agora: INICIO - HORA }).codigo, 'FIM_ANTES_DO_INICIO');
  const comParada = trajetoDe((t) => iniciarParada(t, { agora: INICIO + 2 * HORA }));
  assert.equal(encerrarParada(comParada, { agora: INICIO + HORA }).codigo, 'FIM_ANTES_DO_INICIO');
});

test('encerrar parada inexistente e operar sem trajeto são recusados', () => {
  assert.equal(encerrarParada(trajetoDe(), {}).codigo, 'SEM_PARADA_ABERTA');
  assert.equal(iniciarParada(null, {}).codigo, 'SEM_TRAJETO');
  assert.equal(encerrarTrajeto(null, {}).codigo, 'SEM_TRAJETO');
});

test('sem trajeto o resumo diz que não começou em vez de mostrar zero', () => {
  const resumo = resumoTrajeto(null);
  assert.equal(resumo.duracaoTotalMs, null);
  assert.equal(resumo.duracaoTotalLabel, 'trajeto não iniciado');
  assert.equal(resumo.ativo, false);
});

test('as funções não alteram o trajeto recebido', () => {
  const original = iniciarTrajeto({ agora: INICIO }).trajeto;
  iniciarParada(original, { agora: INICIO + HORA });
  encerrarTrajeto(original, { agora: INICIO + HORA });
  assert.deepEqual(original.paradas, []);
  assert.equal(original.encerradoEm, null);
});
