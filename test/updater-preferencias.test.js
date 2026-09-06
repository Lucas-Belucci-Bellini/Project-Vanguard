import assert from 'node:assert/strict';
import test from 'node:test';

import { CANAIS } from '../src/core/updater/semver.js';
import { CHAVE_PREFERENCIAS, PADRAO, criarPreferencias, normalizar, podeBaixarAutomaticamente } from '../src/core/updater/preferencias.js';

function armazenamentoFalso(inicial = null) {
  let dados = inicial;
  return {
    getItem: (k) => (k === CHAVE_PREFERENCIAS ? dados : null),
    setItem: (k, v) => { if (k === CHAVE_PREFERENCIAS) dados = v; },
    espiar: () => dados,
  };
}

test('o padrão é o mais conservador: nada baixa sozinho', () => {
  // Item 15 do pedido. Baixar dezenas de MB na rede de dados de quem está em
  // campo, sem pedir, é a gentileza que ninguém pediu.
  assert.equal(PADRAO.baixarAutomaticamente, 'nunca');
  assert.equal(PADRAO.canal, CANAIS.STABLE);
});

test('valor desconhecido volta ao padrão em vez de virar lixo', () => {
  const p = normalizar({ canal: 'canal-inventado', baixarAutomaticamente: 'talvez', verificarAoIniciar: 'sim' });
  assert.equal(p.canal, CANAIS.STABLE);
  assert.equal(p.baixarAutomaticamente, 'nunca');
  assert.equal(p.verificarAoIniciar, PADRAO.verificarAoIniciar);
});

test('a preferência sobrevive ao recarregamento', () => {
  const arm = armazenamentoFalso();
  criarPreferencias({ armazenamento: arm }).gravar({ canal: CANAIS.BETA });
  assert.equal(criarPreferencias({ armazenamento: arm }).ler().canal, CANAIS.BETA);
});

test('preferência corrompida não impede o app de abrir', () => {
  const p = criarPreferencias({ armazenamento: armazenamentoFalso('{quebrado') });
  assert.deepEqual(p.ler(), { ...PADRAO });
});

test('"somente wi-fi" NÃO baixa quando a conexão é desconhecida', () => {
  // Sem informação de meio físico, gastar dados por palpite é o erro caro.
  // Não baixar só adia um toque.
  const prefs = { ...PADRAO, baixarAutomaticamente: 'wifi' };
  assert.equal(podeBaixarAutomaticamente(prefs, { tipoDeConexao: null }), false);
  assert.equal(podeBaixarAutomaticamente(prefs, { tipoDeConexao: 'cellular' }), false);
  assert.equal(podeBaixarAutomaticamente(prefs, { tipoDeConexao: 'wifi' }), true);
  assert.equal(podeBaixarAutomaticamente(prefs, { tipoDeConexao: 'ethernet' }), true);
});

test('"nunca" nunca baixa, mesmo em wi-fi', () => {
  assert.equal(podeBaixarAutomaticamente(PADRAO, { tipoDeConexao: 'wifi' }), false);
});

test('"sempre" baixa em qualquer conexão — é escolha explícita', () => {
  const prefs = { ...PADRAO, baixarAutomaticamente: 'sempre' };
  assert.equal(podeBaixarAutomaticamente(prefs, { tipoDeConexao: 'cellular' }), true);
});
