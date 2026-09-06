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

/**
 * 1.6.0 → 10600. A mesma regra nas duas plataformas, para o número ser
 * comparável.
 *
 * ## Por que os campos são largos
 *
 * A regra anterior era `maior*100 + menor*10 + correcao`, e ela quebrava no
 * dia em que o `menor` chegasse a 10:
 *
 *     1.10.0 → 1*100 + 10*10 + 0 = 200
 *     2.0.0  → 2*100 +  0*10 + 0 = 200   ← o MESMO número
 *
 * `versionCode` repetido é o Android recusando a instalação: ele exige um
 * código **estritamente maior** que o instalado. A build fica verde, a
 * atualização falha no aparelho, e o defeito só aparece em campo — a mesma
 * família do conflito de certificado do ADR-0042.
 *
 * O teste de monotonicidade abaixo existia e passava, porque a lista de
 * exemplo ia de `1.3.1` a `2.0.0` sem nunca cruzar `menor >= 10`. Amostra
 * escolhida a dedo concorda com o defeito; hoje a lista cruza, e há uma
 * varredura que cobra ausência de colisão.
 *
 * Com 100 por campo cabem 99 correções por minor e 99 minors por maior. E a
 * troca é segura: o maior código já publicado é 190 (1.9.0), e a regra nova
 * dá 11000 para a 1.10.0 — bem acima dele.
 */
function codigoDaVersao(versao) {
  const [maior, menor, correcao] = versao.split('.').map(Number);
  return maior * 10_000 + menor * 100 + correcao;
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
  // A lista PRECISA cruzar `menor >= 10`: era justamente o que a antiga não
  // fazia, e por isso ela passava com a fórmula quebrada.
  const ordem = ['1.3.1', '1.4.0', '1.4.4', '1.5.0', '1.6.0', '1.9.0', '1.10.0', '1.10.1', '1.11.0', '2.0.0', '2.0.1', '2.10.0'];
  for (let i = 1; i < ordem.length; i += 1) {
    assert.ok(
      codigoDaVersao(ordem[i]) > codigoDaVersao(ordem[i - 1]),
      `${ordem[i]} (${codigoDaVersao(ordem[i])}) deveria ser maior que ${ordem[i - 1]} (${codigoDaVersao(ordem[i - 1])})`
    );
  }
});

test('nenhuma versão plausível colide com outra no versionCode', () => {
  // Colisão é indistinguível de regressão para o Android: ele recusa código
  // menor OU IGUAL ao instalado. Varre um intervalo inteiro em vez de confiar
  // numa lista escolhida a dedo — foi a lista curta que deixou passar o
  // `1.10.0` e o `2.0.0` valendo 200 os dois.
  const vistos = new Map();
  for (let maior = 1; maior <= 3; maior += 1) {
    for (let menor = 0; menor <= 30; menor += 1) {
      for (let correcao = 0; correcao <= 20; correcao += 1) {
        const versao = `${maior}.${menor}.${correcao}`;
        const codigo = codigoDaVersao(versao);
        assert.ok(!vistos.has(codigo), `${versao} colide com ${vistos.get(codigo)} — ambos dão ${codigo}`);
        vistos.set(codigo, versao);
      }
    }
  }
});

test('a regra nova fica acima do maior código já publicado', () => {
  // Trocar a regra só é seguro se o código novo superar tudo que já foi ao
  // aparelho. O maior publicado é 190, da 1.9.0.
  const MAIOR_PUBLICADO = 190;
  assert.ok(codigoDaVersao(VERSAO) > MAIOR_PUBLICADO,
    `${VERSAO} dá ${codigoDaVersao(VERSAO)}, que não supera o ${MAIOR_PUBLICADO} já instalado`);
});
