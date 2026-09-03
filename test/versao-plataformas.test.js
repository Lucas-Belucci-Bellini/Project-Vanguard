import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * A versão do app existe em três lugares fora do `package.json`: o Gradle do
 * Android e as duas configurações do Xcode. Nenhum deles é gerado — e por isso
 * eles derivam.
 *
 * Não é hipótese. A `MARKETING_VERSION` do iOS ficou em **1.3.1 por seis
 * releases** (1.4.0, 1.4.1, 1.4.2, 1.4.3, 1.4.4 e 1.5.0), enquanto o Android era
 * atualizado à mão a cada uma. É a mesma armadilha que já custou caro em
 * `CONFIGURACAO_APLICATIVO.versao`, congelada em `'1.3.1'` por quatro releases:
 * o app anunciava atualização para uma versão que ele já era.
 *
 * Enquanto o iOS não tem pipeline de release, isso não morde. No dia em que
 * tiver, morde em silêncio — o número certo estará no `package.json` e o
 * errado, no artefato. Este teste é o que impede o dia.
 */

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leia = (caminho) => readFileSync(join(raiz, caminho), 'utf8');

const { version: VERSAO } = JSON.parse(leia('package.json'));

/** 1.6.0 → 160. A mesma regra nas duas plataformas, para o número ser comparável. */
function codigoDaVersao(versao) {
  const [maior, menor, correcao] = versao.split('.').map(Number);
  return maior * 100 + menor * 10 + correcao;
}

test('a versão do package.json é um semver de três números', () => {
  assert.match(VERSAO, /^\d+\.\d+\.\d+$/, `versão inesperada: ${VERSAO}`);
});

test('o Android declara a mesma versão do package.json', () => {
  const gradle = leia('android/app/build.gradle');

  const nome = gradle.match(/versionName\s+"([^"]+)"/);
  assert.ok(nome, 'versionName não encontrado em android/app/build.gradle');
  assert.equal(nome[1], VERSAO,
    `android/app/build.gradle diz ${nome[1]} e o package.json diz ${VERSAO}`);

  const codigo = gradle.match(/versionCode\s+(\d+)/);
  assert.ok(codigo, 'versionCode não encontrado em android/app/build.gradle');
  assert.equal(Number(codigo[1]), codigoDaVersao(VERSAO),
    `versionCode ${codigo[1]} não corresponde a ${VERSAO} (esperado ${codigoDaVersao(VERSAO)})`);
});

test('o iOS declara a mesma versão do package.json, nas duas configurações', () => {
  const pbxproj = leia('ios/App/App.xcodeproj/project.pbxproj');

  const nomes = [...pbxproj.matchAll(/MARKETING_VERSION\s*=\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(nomes.length >= 2, `esperava Debug e Release, achei ${nomes.length} MARKETING_VERSION`);
  for (const nome of nomes) {
    assert.equal(nome, VERSAO, `MARKETING_VERSION ${nome} ≠ package.json ${VERSAO}`);
  }

  const codigos = [...pbxproj.matchAll(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(codigos.length >= 2, `esperava Debug e Release, achei ${codigos.length} CURRENT_PROJECT_VERSION`);
  for (const codigo of codigos) {
    assert.equal(Number(codigo), codigoDaVersao(VERSAO),
      `CURRENT_PROJECT_VERSION ${codigo} não corresponde a ${VERSAO}`);
  }
});

test('o código de versão sobe junto com a versão', () => {
  // O Android recusa instalar um versionCode menor ou igual ao instalado: se a
  // regra não for monotônica, a atualização falha no aparelho e a build fica
  // verde do mesmo jeito.
  const ordem = ['1.3.1', '1.4.0', '1.4.4', '1.5.0', '1.6.0', '2.0.0'];
  for (let i = 1; i < ordem.length; i += 1) {
    assert.ok(
      codigoDaVersao(ordem[i]) > codigoDaVersao(ordem[i - 1]),
      `${ordem[i]} (${codigoDaVersao(ordem[i])}) deveria ser maior que ${ordem[i - 1]} (${codigoDaVersao(ordem[i - 1])})`
    );
  }
});
