/**
 * Guarda de paridade: o que cada plataforma empacota é o que o `dist` produziu?
 *
 * Este script existe por causa de um bug que custou horas: o site mostrava
 * páginas que o aplicativo não tinha. A cadeia
 * `src → build → dist → cap sync → plataforma → APK/IPA` tem seis pontos onde
 * uma versão antiga pode sobreviver, e nenhum deles avisava. Rodar isto antes
 * de empacotar transforma "descobrir no aparelho" em "falhar no CI".
 *
 * A comparação é por conteúdo (SHA-256), não por data: `cap sync` copia
 * arquivos, e data de arquivo não prova nada sobre o que há dentro dele.
 *
 * Todo arquivo do `dist` precisa existir nos assets da plataforma com o **mesmo
 * hash**. O contrário não vale: o Capacitor injeta os próprios arquivos
 * (`cordova.js`, `cordova_plugins.js`, plugins, `capacitor.config.json`) que
 * legitimamente não existem no `dist` — eles são listados, não tratados como
 * erro.
 *
 * ## Por que iOS também
 *
 * A versão anterior olhava só o Android, e `mobile:sync:ios` não chamava
 * guarda nenhuma: a cópia do iOS não era conferida por ninguém. Como os dois
 * diretórios de assets são **gerados** e ignorados pelo git (`ios/.gitignore`,
 * `android/.gitignore`), um clone limpo nasce sem eles — e um `sync` que não
 * roda deixa a plataforma vazia sem nenhum aviso. Verificar as duas custa o
 * mesmo e fecha o lado que ninguém olhava.
 *
 * Uso:
 *   npm run verificar:paridade            # toda plataforma que tiver assets
 *   npm run verificar:paridade -- android # só uma
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const DIST = path.join(RAIZ, 'dist');

const PLATAFORMAS = {
  android: { assets: 'android/app/src/main/assets/public', projeto: 'android' },
  ios: { assets: 'ios/App/App/public', projeto: 'ios' },
};

/** Arquivos que o Capacitor injeta e que não vêm do `dist`. */
const INJETADOS = [
  /^cordova\.js$/,
  /^cordova_plugins\.js$/,
  /^cordova-js-src\//,
  /^plugins\//,
  /^capacitor\.config\.json$/,
];

function listar(raiz, prefixo = '') {
  const saida = [];
  for (const entrada of fs.readdirSync(path.join(raiz, prefixo), { withFileTypes: true })) {
    const relativo = path.join(prefixo, entrada.name);
    if (entrada.isDirectory()) saida.push(...listar(raiz, relativo));
    else saida.push(relativo);
  }
  return saida;
}

function hash(arquivo) {
  return crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex').slice(0, 16);
}

function falhar(mensagem, detalhes = []) {
  console.error(`\n✗ PARIDADE QUEBRADA: ${mensagem}`);
  for (const linha of detalhes.slice(0, 20)) console.error(`   ${linha}`);
  if (detalhes.length > 20) console.error(`   … e mais ${detalhes.length - 20}`);
  console.error('\nA plataforma seria empacotada com um bundle diferente do que o build produziu.');
  console.error('Rode `npm run mobile:sync:android` (ou `:ios`) e verifique de novo.\n');
  process.exit(1);
}

/** Confere uma plataforma. Devolve o resumo; sai do processo se divergir. */
function conferir(nome, noDist) {
  const base = path.join(RAIZ, PLATAFORMAS[nome].assets);
  const naPlataforma = new Map(listar(base).map((rel) => [rel, hash(path.join(base, rel))]));

  const faltando = [];
  const divergentes = [];
  for (const rel of noDist) {
    const esperado = hash(path.join(DIST, rel));
    const encontrado = naPlataforma.get(rel);
    if (encontrado === undefined) faltando.push(rel);
    else if (encontrado !== esperado) divergentes.push(`${rel}  dist=${esperado}  ${nome}=${encontrado}`);
  }

  if (faltando.length) falhar(`[${nome}] ${faltando.length} arquivo(s) do dist não chegaram à plataforma`, faltando);
  if (divergentes.length) falhar(`[${nome}] ${divergentes.length} arquivo(s) com conteúdo diferente`, divergentes);

  const extras = [...naPlataforma.keys()].filter((rel) => !noDist.includes(rel));
  const injetados = extras.filter((rel) => INJETADOS.some((re) => re.test(rel)));
  const inesperados = extras.filter((rel) => !injetados.includes(rel));

  console.log(`\n✓ [${nome}] paridade confirmada: ${noDist.length} arquivo(s) do dist com o mesmo conteúdo`);
  console.log(`  injetados pelo Capacitor (esperado): ${injetados.length}`);
  if (inesperados.length) {
    // Não é falha: pode ser resíduo de um sync anterior. Mas precisa aparecer,
    // porque arquivo órfão nos assets é exatamente como um bundle antigo
    // sobrevive sem ninguém notar.
    console.log(`  ⚠ ${inesperados.length} arquivo(s) nos assets sem origem no dist — possível resíduo:`);
    for (const rel of inesperados.slice(0, 10)) console.log(`     ${rel}`);
  }

  // A identidade do build tem de estar no bundle empacotado, senão o
  // diagnóstico do aparelho não consegue dizer qual versão está rodando.
  const indice = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
  const entrada = indice.match(/assets\/index-[\w-]+\.js/)?.[0];
  if (!entrada) falhar(`[${nome}] o index.html empacotado não referencia um bundle de entrada`);
  const principal = fs.readFileSync(path.join(base, entrada), 'utf8');
  const versao = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
  if (!principal.includes(versao)) {
    falhar(`[${nome}] o bundle empacotado não contém a versão ${versao} do package.json`, [`entrada: ${entrada}`]);
  }
  console.log(`  identidade no bundle: versão ${versao} presente em ${entrada}`);
}

if (!fs.existsSync(DIST)) falhar('não existe `dist/` — rode `npm run build` antes.');
const noDist = listar(DIST);

const pedidas = process.argv.slice(2).filter((arg) => arg in PLATAFORMAS);
const alvos = pedidas.length ? pedidas : Object.keys(PLATAFORMAS);

const conferidas = [];
const semAssets = [];
for (const nome of alvos) {
  const temProjeto = fs.existsSync(path.join(RAIZ, PLATAFORMAS[nome].projeto));
  const temAssets = fs.existsSync(path.join(RAIZ, PLATAFORMAS[nome].assets));
  if (!temProjeto) continue;              // plataforma não existe neste repo
  if (!temAssets) { semAssets.push(nome); continue; }
  conferir(nome, noDist);
  conferidas.push(nome);
}

// Plataforma pedida explicitamente e sem assets é erro: foi pedida, tem de
// existir. Sem pedido, é só um aviso — o diretório é gerado, e um clone limpo
// legitimamente ainda não rodou `cap sync`.
for (const nome of semAssets) {
  if (pedidas.includes(nome)) {
    falhar(`[${nome}] não existem assets — rode \`npx cap sync ${nome}\` antes.`);
  }
  console.log(`\n⚠ [${nome}] projeto existe mas está sem assets web (nunca sincronizado nesta árvore).`);
  console.log(`  Os assets são gerados e ignorados pelo git; rode \`npm run mobile:sync:${nome}\` para preenchê-los.`);
}

if (!conferidas.length) falhar('nenhuma plataforma tinha assets para conferir.');
console.log(`\n✓ plataformas conferidas: ${conferidas.join(', ')}`);
