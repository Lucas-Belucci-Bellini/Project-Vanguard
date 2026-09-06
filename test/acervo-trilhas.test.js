import test from 'node:test';
import assert from 'node:assert/strict';

import { ORIGEM_TRILHA, acervoEmMemoria, criarAcervo } from '../src/core/dados/acervo-trilhas.js';

const T0 = 1_700_000_000_000;
const pontos = (n) => Array.from({ length: n }, (_, i) => ({ lat: -23.31 + i / 111_320, lon: -51.16, timestamp: T0 + i * 1000 }));
const novo = () => criarAcervo({ guarda: acervoEmMemoria(), relogio: () => T0 });

test('guarda uma trilha com nome, origem e contagem', async () => {
  const acervo = novo();
  const r = await acervo.guardar({ nome: 'Ana — dia 1', pontos: pontos(50), origem: ORIGEM_TRILHA.IMPORTADA, arquivo: 'ana.gpx' });
  assert.equal(r.guardada, true);
  assert.equal(r.trilha.nome, 'Ana — dia 1');
  assert.equal(r.trilha.totalPontos, 50);
  assert.equal(r.trilha.arquivo, 'ana.gpx');
  assert.equal((await acervo.listar()).length, 1);
});

test('trilha vazia ou sem nome é recusada, com motivo', async () => {
  const acervo = novo();
  assert.equal((await acervo.guardar({ nome: 'x', pontos: [] })).motivo, 'TRILHA_VAZIA');
  assert.equal((await acervo.guardar({ nome: '  ', pontos: pontos(3) })).motivo, 'SEM_NOME');
});

test('guardar VÁRIAS trilhas não sobrescreve as anteriores', async () => {
  // É a razão de o acervo existir: comparar dez peregrinos exige guardar dez.
  const acervo = novo();
  for (const nome of ['Ana', 'Bento', 'Célia']) await acervo.guardar({ nome, pontos: pontos(10) });
  const lista = await acervo.listar();
  assert.equal(lista.length, 3);
  assert.deepEqual(new Set(lista.map((t) => t.nome)), new Set(['Ana', 'Bento', 'Célia']));
});

test('APAGAR exige o nome exato — lista é fácil de tocar por engano', async () => {
  const acervo = novo();
  const { trilha } = await acervo.guardar({ nome: 'Ana — dia 1', pontos: pontos(10) });
  assert.equal((await acervo.remover(trilha.id, 'Ana')).motivo, 'NOME_NAO_CONFERE');
  assert.equal((await acervo.remover(trilha.id, '')).motivo, 'NOME_NAO_CONFERE');
  assert.equal((await acervo.listar()).length, 1, 'nada foi apagado');
  assert.equal((await acervo.remover(trilha.id, 'Ana — dia 1')).removida, true);
  assert.equal((await acervo.listar()).length, 0);
});

test('remover o que não existe não finge que removeu', async () => {
  assert.equal((await novo().remover('não-existe', 'x')).motivo, 'NAO_ENCONTRADA');
});

test('a lista vem da mais recente para a mais antiga', async () => {
  let t = T0;
  const acervo = criarAcervo({ guarda: acervoEmMemoria(), relogio: () => (t += 1000) });
  await acervo.guardar({ nome: 'primeira', pontos: pontos(5) });
  await acervo.guardar({ nome: 'segunda', pontos: pontos(5) });
  assert.equal((await acervo.listar())[0].nome, 'segunda');
});

test('a origem viaja com a trilha — comparar 2019 com hoje é legítimo, mas tem de aparecer', async () => {
  const acervo = novo();
  await acervo.guardar({ nome: 'Wikiloc 2019', pontos: pontos(20), origem: ORIGEM_TRILHA.REFERENCIA });
  assert.equal((await acervo.listar())[0].origem, ORIGEM_TRILHA.REFERENCIA);
});
