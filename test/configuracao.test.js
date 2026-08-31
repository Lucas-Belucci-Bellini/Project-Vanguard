import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIGURACAO_APLICATIVO,
  CONFIGURACAO_ATUALIZACAO,
} from '../src/core/configuracao.js';
import {
  URL_RELEASES,
  URL_RELEASE_MAIS_RECENTE,
  VERSAO_ATUAL,
} from '../src/core/atualizacao.js';

test('configuração pública concentra identidade e atualização oficial', () => {
  assert.deepEqual(CONFIGURACAO_APLICATIVO, {
    nome: 'Vanguard Field',
    id: 'com.projectvanguard.field',
    versao: '1.3.1',
    repositorio: 'Lucas-Belucci-Bellini/Project-Vanguard',
    urlRepositorio: 'https://github.com/Lucas-Belucci-Bellini/Project-Vanguard',
  });
  assert.equal(CONFIGURACAO_ATUALIZACAO.urlReleases, URL_RELEASES);
  assert.equal(CONFIGURACAO_ATUALIZACAO.urlReleaseMaisRecente, URL_RELEASE_MAIS_RECENTE);
  assert.equal(VERSAO_ATUAL, CONFIGURACAO_APLICATIVO.versao);
});

test('configuração pública é imutável e não expõe campos de segredo', () => {
  assert.equal(Object.isFrozen(CONFIGURACAO_APLICATIVO), true);
  assert.equal(Object.isFrozen(CONFIGURACAO_ATUALIZACAO), true);
  assert.deepEqual(Object.keys(CONFIGURACAO_APLICATIVO).sort(), [
    'id', 'nome', 'repositorio', 'urlRepositorio', 'versao',
  ]);
  assert.deepEqual(Object.keys(CONFIGURACAO_ATUALIZACAO).sort(), [
    'urlReleaseMaisRecente', 'urlReleases',
  ]);
});
