import test from 'node:test';
import assert from 'node:assert/strict';
import { compararVersoes, releaseMaisNova, nomeVersao, urlDownload } from '../src/core/atualizacao.js';

test('compararVersoes ordena versões finais e pré-releases', () => {
  assert.equal(compararVersoes('v1.0.1', '1.0.0'), 1);
  assert.equal(compararVersoes('1.0.0', 'v1.0.0'), 0);
  assert.equal(compararVersoes('1.0.0-rc.2', '1.0.0'), -1);
  assert.equal(compararVersoes('1.0.0', '1.0.0-rc.2'), 1);
});

test('compararVersoes trata versões inválidas como inferiores', () => {
  assert.equal(compararVersoes('1.0.0', 'sem-versao'), 1);
  assert.equal(compararVersoes('sem-versao', '1.0.0'), -1);
  assert.equal(compararVersoes('sem-versao', 'outra'), 0);
});

test('releaseMaisNova recusa rascunhos e releases iguais ou anteriores', () => {
  assert.equal(releaseMaisNova({ tag_name: 'v1.0.1', draft: false }), true);
  assert.equal(releaseMaisNova({ tag_name: 'v1.0.0', draft: false }), false);
  assert.equal(releaseMaisNova({ tag_name: 'v1.0.0-rc.2', draft: false }), false);
  assert.equal(releaseMaisNova({ tag_name: 'v1.0.1', draft: true }), false);
  assert.equal(releaseMaisNova(null), false);
});

test('nomeVersao extrai tag pública sem alterar o objeto remoto', () => {
  assert.equal(nomeVersao({ tag_name: ' v1.2.3 ' }), 'v1.2.3');
  assert.equal(nomeVersao({ tag_name: '' }), null);
  assert.equal(nomeVersao(undefined), null);
});

test('urlDownload prioriza APK HTTPS e não aceita URL externa insegura', () => {
  assert.equal(urlDownload({ assets: [{ name: 'vanguard.apk', browser_download_url: 'https://github.com/exemplo/app.apk' }] }), 'https://github.com/exemplo/app.apk');
  assert.equal(urlDownload({ html_url: 'https://github.com/Lucas-Belucci-Bellini/Project-Vanguard/releases/tag/v1.0.1' }), 'https://github.com/Lucas-Belucci-Bellini/Project-Vanguard/releases/tag/v1.0.1');
  assert.equal(urlDownload({ assets: [{ name: 'vanguard.apk', browser_download_url: 'javascript:alert(1)' }], html_url: 'http://inseguro.test' }), 'https://github.com/Lucas-Belucci-Bellini/Project-Vanguard/releases');
});
