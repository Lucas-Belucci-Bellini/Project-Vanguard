import assert from 'node:assert/strict';
import test from 'node:test';

import { CANAIS, analisar, canalAceito, canalDaVersao, compararVersoes, versaoDaTag } from '../src/core/updater/semver.js';

/**
 * O defeito que estes testes trancam era total: o comparador anterior
 * classificava TODA tag real deste projeto como versão inválida, e inválida
 * fica abaixo de tudo. `releaseMaisNova` devolvia `false` sempre — o
 * aplicativo nunca detectou uma atualização, em nenhuma versão publicada.
 */

test('a tag REAL do projeto é lida — era aqui que tudo quebrava', () => {
  // `mobile-v1.4.4`: o comparador antigo fazia replace(/^v/) (não casava) e
  // depois split('-'), então a base virava "mobile".
  assert.equal(versaoDaTag('mobile-v1.4.4'), '1.4.4');
  assert.equal(compararVersoes('mobile-v1.4.4', '1.4.3'), 1, 'a release nova tem de ser MAIOR que a instalada');
  assert.equal(compararVersoes('mobile-v1.0.0', '1.4.3'), -1);
  assert.equal(compararVersoes('mobile-v1.4.3', '1.4.3'), 0);
});

test('outros formatos de tag continuam funcionando', () => {
  for (const [tag, esperado] of [['v1.4.4', '1.4.4'], ['1.4.4', '1.4.4'], ['release-2.0.0', '2.0.0'], ['mobile-v2.0.0-beta.1', '2.0.0-beta.1']]) {
    assert.equal(versaoDaTag(tag), esperado, tag);
  }
});

test('o que não é versão continua sendo recusado', () => {
  for (const lixo of ['', null, undefined, 'sem-numero', 'v1.4', '1.4.4.4-x', {}]) {
    assert.equal(analisar(lixo), null, String(lixo));
  }
});

test('ordem básica de precedência', () => {
  assert.equal(compararVersoes('1.3.3', '1.3.2'), 1);
  assert.equal(compararVersoes('1.4.0', '1.3.3'), 1);
  assert.equal(compararVersoes('2.0.0', '1.4.0'), 1);
  assert.equal(compararVersoes('1.3.2', '1.3.3'), -1);
});

test('precedência de pré-lançamento segue a especificação, não ordem de string', () => {
  // Estes quatro casos são os que o comparador anterior errava por usar
  // localeCompare no pré-lançamento inteiro.
  assert.equal(compararVersoes('1.0.0-alpha.2', '1.0.0-alpha.10'), -1, 'identificador numérico compara como NÚMERO');
  assert.equal(compararVersoes('1.0.0-alpha.beta', '1.0.0-alpha.1'), 1, 'numérico tem precedência MENOR que alfanumérico');
  assert.equal(compararVersoes('1.0.0-alpha', '1.0.0-alpha.1'), -1, 'mais campos vence com prefixo igual');
  assert.equal(compararVersoes('1.0.0-rc.1', '1.0.0'), -1, 'pré-lançamento é menor que o lançamento');
});

test('a cadeia completa da especificação fica em ordem', () => {
  const ordem = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta',
    '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
  for (let i = 0; i < ordem.length - 1; i += 1) {
    assert.equal(compararVersoes(ordem[i], ordem[i + 1]), -1, `${ordem[i]} deveria ser menor que ${ordem[i + 1]}`);
  }
});

test('build metadata não altera precedência', () => {
  assert.equal(compararVersoes('1.4.4+abc123', '1.4.4+zzz999'), 0);
  assert.equal(compararVersoes('1.4.4+abc', '1.4.3'), 1);
});

test('o canal sai do pré-lançamento, não de um campo à parte', () => {
  assert.equal(canalDaVersao('1.4.4'), CANAIS.STABLE);
  assert.equal(canalDaVersao('2.0.0-beta.1'), CANAIS.BETA);
  assert.equal(canalDaVersao('2.0.0-rc.1'), CANAIS.BETA);
  assert.equal(canalDaVersao('2.0.0-alpha.3'), CANAIS.ALPHA);
  // Pré-lançamento que não nomeia canal conhecido cai no mais restrito.
  assert.equal(canalDaVersao('2.0.0-experimental'), CANAIS.ALPHA);
});

test('2.0.0-beta.1 NUNCA é oferecida a quem assina estável', () => {
  // É a exigência literal do item 6 do pedido.
  assert.equal(canalAceito(CANAIS.STABLE, canalDaVersao('2.0.0-beta.1')), false);
  assert.equal(canalAceito(CANAIS.STABLE, canalDaVersao('1.4.4')), true);
  // Quem assina beta recebe beta E estável — não faria sentido perder correções.
  assert.equal(canalAceito(CANAIS.BETA, CANAIS.STABLE), true);
  assert.equal(canalAceito(CANAIS.BETA, CANAIS.BETA), true);
  assert.equal(canalAceito(CANAIS.BETA, CANAIS.ALPHA), false);
  assert.equal(canalAceito(CANAIS.ALPHA, CANAIS.ALPHA), true);
});
