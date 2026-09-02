/**
 * Guarda de paridade: o que o Android empacota é o que o `dist` produziu?
 *
 * Este script existe por causa de um bug que custou horas: o site mostrava
 * páginas que o aplicativo não tinha. A cadeia
 * `src → build → dist → cap sync → android → APK` tem seis pontos onde uma
 * versão antiga pode sobreviver, e nenhum deles avisava. Rodar isto antes de
 * empacotar transforma "descobrir no aparelho" em "falhar no CI".
 *
 * A comparação é por conteúdo (SHA-256), não por data: `cap sync` copia
 * arquivos, e data de arquivo não prova nada sobre o que há dentro dele.
 *
 * Todo arquivo do `dist` precisa existir nos assets do Android com o **mesmo
 * hash**. O contrário não vale: o Capacitor injeta os próprios arquivos
 * (`cordova.js`, `cordova_plugins.js`, plugins) que legitimamente não existem
 * no `dist` — eles são listados, não tratados como erro.
 *
 * Uso:
 *   npm run build && npx cap sync android && npm run verificar:paridade
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const DIST = path.join(RAIZ, 'dist');
const ANDROID = path.join(RAIZ, 'android/app/src/main/assets/public');

/** Arquivos que o Capacitor injeta e que não vêm do `dist`. */
const INJETADOS = [/^cordova\.js$/, /^cordova_plugins\.js$/, /^cordova-js-src\//, /^plugins\//];

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
  console.error('\nO aplicativo seria empacotado com um bundle diferente do que o build produziu.');
  console.error('Rode `npm run mobile:sync:android` e verifique de novo.\n');
  process.exit(1);
}

if (!fs.existsSync(DIST)) falhar('não existe `dist/` — rode `npm run build` antes.');
if (!fs.existsSync(ANDROID)) falhar('não existem assets do Android — rode `npx cap sync android` antes.');

const noDist = listar(DIST);
const noAndroid = new Map(listar(ANDROID).map((rel) => [rel, hash(path.join(ANDROID, rel))]));

const faltando = [];
const divergentes = [];
for (const rel of noDist) {
  const esperado = hash(path.join(DIST, rel));
  const encontrado = noAndroid.get(rel);
  if (encontrado === undefined) faltando.push(rel);
  else if (encontrado !== esperado) divergentes.push(`${rel}  dist=${esperado}  android=${encontrado}`);
}

if (faltando.length) falhar(`${faltando.length} arquivo(s) do dist não chegaram ao Android`, faltando);
if (divergentes.length) falhar(`${divergentes.length} arquivo(s) com conteúdo diferente`, divergentes);

const extras = [...noAndroid.keys()].filter((rel) => !noDist.includes(rel));
const injetados = extras.filter((rel) => INJETADOS.some((re) => re.test(rel)));
const inesperados = extras.filter((rel) => !injetados.includes(rel));

console.log(`✓ paridade confirmada: ${noDist.length} arquivo(s) do dist presentes no Android com o mesmo conteúdo`);
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
const indice = fs.readFileSync(path.join(ANDROID, 'index.html'), 'utf8');
const entrada = indice.match(/assets\/index-[\w-]+\.js/)?.[0];
if (!entrada) falhar('o index.html empacotado não referencia um bundle de entrada');
const principal = fs.readFileSync(path.join(ANDROID, entrada), 'utf8');
const versao = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
if (!principal.includes(versao)) {
  falhar(`o bundle empacotado não contém a versão ${versao} do package.json`, [`entrada: ${entrada}`]);
}
console.log(`  identidade no bundle: versão ${versao} presente em ${entrada}`);
