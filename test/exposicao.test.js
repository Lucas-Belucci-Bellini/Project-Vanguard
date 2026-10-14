import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITES_EXPOSICAO, NIVEIS_EXPOSICAO, avaliarExposicao } from '../src/core/exposicao.js';
import { posicaoSolar } from '../src/engine/sol.js';

const LONDRINA = { lat: -23.31, lon: -51.16 };
const MIN = 60_000;
// Meio-dia local no verão: sol alto de verdade, calculado e não suposto.
const SOL_ALTO = Date.parse('2026-12-15T15:00:00.000Z');
const NOITE = Date.parse('2026-12-15T04:00:00.000Z');

test('o cenário de teste tem mesmo o sol alto e o sol posto', () => {
  assert.ok(posicaoSolar({ ...LONDRINA, instanteMs: SOL_ALTO }).elevacaoDeg > LIMITES_EXPOSICAO.elevacaoAltaDeg);
  assert.ok(posicaoSolar({ ...LONDRINA, instanteMs: NOITE }).elevacaoDeg < 0);
});

test('sol a pino sozinho já eleva o nível e pede vibração', () => {
  const avaliacao = avaliarExposicao({ posicao: LONDRINA, agora: SOL_ALTO });
  assert.equal(avaliacao.nivel, NIVEIS_EXPOSICAO.ALTO);
  assert.equal(avaliacao.vibrar, true);
  assert.match(avaliacao.motivos.join(' '), /quase a pino/);
});

test('de noite o sol não gera alerta nenhum', () => {
  const avaliacao = avaliarExposicao({ posicao: LONDRINA, agora: NOITE });
  assert.equal(avaliacao.nivel, NIVEIS_EXPOSICAO.NORMAL);
  assert.equal(avaliacao.vibrar, false);
  assert.match(avaliacao.motivos.join(' '), /abaixo do horizonte/);
});

test('tempo sem parada eleva o nível mesmo com o sol baixo', () => {
  const avaliacao = avaliarExposicao({ posicao: LONDRINA, agora: NOITE, ultimaParadaEm: NOITE - 130 * MIN });
  assert.equal(avaliacao.nivel, NIVEIS_EXPOSICAO.ALTO);
  assert.equal(avaliacao.minutosSemParada, 130);
  assert.match(avaliacao.motivos.join(' '), /130 min sem parada/);
});

test('sol a pino somado a muito tempo sem parada vira crítico', () => {
  const avaliacao = avaliarExposicao({ posicao: LONDRINA, agora: SOL_ALTO, ultimaParadaEm: SOL_ALTO - 150 * MIN });
  assert.equal(avaliacao.nivel, NIVEIS_EXPOSICAO.CRITICO);
  assert.equal(avaliacao.gravidadeAlerta, 'CRITICO');
  assert.equal(avaliacao.tipoAlerta, 'EXPOSICAO_SOL');
  assert.match(avaliacao.recomendacao, /primeira sombra/);
});

test('sem temperatura o alerta diz que o aparelho não mede temperatura', () => {
  const avaliacao = avaliarExposicao({ posicao: LONDRINA, agora: NOITE });
  assert.equal(avaliacao.temperaturaC, null);
  assert.match(avaliacao.motivos.join(' '), /não mede temperatura do ar/);
});

test('temperatura só conta com valor, fonte e horário recentes', () => {
  const comFonte = avaliarExposicao({
    posicao: LONDRINA,
    agora: NOITE,
    temperatura: { valorC: 34, fonte: 'open-meteo', medidoEm: NOITE - 10 * MIN },
  });
  assert.equal(comFonte.nivel, NIVEIS_EXPOSICAO.ALTO);
  assert.equal(comFonte.temperaturaC, 34);
  assert.equal(comFonte.fonteTemperatura, 'open-meteo');
});

test('temperatura sem fonte ou velha demais é ignorada com o motivo dito', () => {
  const semFonte = avaliarExposicao({ posicao: LONDRINA, agora: NOITE, temperatura: { valorC: 39, medidoEm: NOITE } });
  assert.equal(semFonte.nivel, NIVEIS_EXPOSICAO.NORMAL);
  assert.match(semFonte.motivos.join(' '), /valor, fonte e horário/);

  const velha = avaliarExposicao({
    posicao: LONDRINA,
    agora: NOITE,
    temperatura: { valorC: 39, fonte: 'open-meteo', medidoEm: NOITE - 5 * 60 * MIN },
  });
  assert.equal(velha.nivel, NIVEIS_EXPOSICAO.NORMAL);
  assert.equal(velha.temperaturaC, null);
  assert.match(velha.motivos.join(' '), /velha demais/);
});

test('calor confirmado por fonte recente leva direto ao crítico', () => {
  const avaliacao = avaliarExposicao({
    posicao: LONDRINA,
    agora: NOITE,
    temperatura: { valorC: 38, fonte: 'estação local', medidoEm: NOITE - MIN },
  });
  assert.equal(avaliacao.nivel, NIVEIS_EXPOSICAO.CRITICO);
});

test('o aviso respeita o intervalo mínimo para não virar chocalho', () => {
  const recente = avaliarExposicao({ posicao: LONDRINA, agora: SOL_ALTO, ultimoAvisoEm: SOL_ALTO - 5 * MIN });
  assert.equal(recente.nivel, NIVEIS_EXPOSICAO.ALTO);
  assert.equal(recente.vibrar, false);

  const passado = avaliarExposicao({ posicao: LONDRINA, agora: SOL_ALTO, ultimoAvisoEm: SOL_ALTO - 20 * MIN });
  assert.equal(passado.vibrar, true);
});

test('nível de atenção não vibra: só ALTO e CRÍTICO interrompem a caminhada', () => {
  const avaliacao = avaliarExposicao({ posicao: LONDRINA, agora: NOITE, ultimaParadaEm: NOITE - 100 * MIN });
  assert.equal(avaliacao.nivel, NIVEIS_EXPOSICAO.ATENCAO);
  assert.equal(avaliacao.vibrar, false);
});

test('sem posição o módulo diz que não dá para calcular, em vez de supor', () => {
  const avaliacao = avaliarExposicao({ posicao: { lat: -23.31, lon: null }, agora: SOL_ALTO });
  assert.equal(avaliacao.elevacaoSolarDeg, null);
  assert.match(avaliacao.motivos.join(' '), /Sem posição válida/);
});

test('o tipo do aviso separa sol de cansaço para o ritmo ser reconhecível', () => {
  const porSol = avaliarExposicao({ posicao: LONDRINA, agora: SOL_ALTO });
  assert.equal(porSol.tipoAlerta, 'EXPOSICAO_SOL');

  const porCansaco = avaliarExposicao({ posicao: LONDRINA, agora: NOITE, ultimaParadaEm: NOITE - 130 * MIN });
  assert.equal(porCansaco.tipoAlerta, 'SEM_PARADA');
  assert.equal(porCansaco.gravidadeAlerta, 'ALTO');
});
