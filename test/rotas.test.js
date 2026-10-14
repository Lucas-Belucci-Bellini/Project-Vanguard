import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Contrato das rotas.
 *
 * Uma rota que aponta para um arquivo renomeado, ou um botão que leva a um
 * hash que não existe mais, é um defeito que só aparece quando alguém toca
 * nele em campo — e aí a tela some no meio de uma caminhada. Estes testes
 * leem `src/core/rotas.js` e o resto do código para cobrar quatro coisas que não
 * dependem de navegador: a rota existe, o módulo existe, a exportação existe,
 * e ninguém aponta para lugar nenhum.
 *
 * O que eles NÃO fazem é dizer que a tela funciona. Isso é
 * `scripts/verificar-rotas.mjs` (renderiza) e `scripts/verificar-fluxos.mjs`
 * (aperta os botões), que precisam de navegador.
 */

const raizSrc = new URL('../src/', import.meta.url);
/*
 * Dois arquivos, duas responsabilidades. A tabela saiu de `main.js` para
 * `core/rotas.js` quando o autoteste passou a precisar dela — mas o SHELL, que
 * monta o menu e filtra a rota legada, continua em `main.js`. Ler os dois
 * mantém cada asserção sobre o arquivo que de fato decide aquilo.
 */
const rotasJs = fs.readFileSync(new URL('core/rotas.js', raizSrc), 'utf8');
const mainJs = fs.readFileSync(new URL('main.js', raizSrc), 'utf8');

/** Lê a tabela ROTAS do próprio `core/rotas.js`, sem uma segunda cópia para esquecer. */
function rotasDeclaradas() {
  const bloco = rotasJs.slice(rotasJs.indexOf('const ROTAS = ['));
  const linhas = [...bloco.matchAll(/\{\s*hash:\s*'([^']+)'[\s\S]*?carregar:[^}]*?import\('([^']+)'\)[\s\S]*?m\.(\w+)[\s\S]*?\}/g)];
  return linhas.map(([bruto, hash, modulo, exportacao]) => ({
    hash,
    modulo,
    exportacao,
    legada: /legada:\s*true/.test(bruto),
    secundaria: /secundária:\s*true/.test(bruto),
  }));
}

const ROTAS = rotasDeclaradas();

test('a tabela de rotas foi lida e não está vazia', () => {
  assert.ok(ROTAS.length >= 12, `só ${ROTAS.length} rotas lidas de core/rotas.js — o parser ou a tabela mudou`);
  assert.ok(ROTAS.every((r) => r.hash.startsWith('#/')), 'toda rota é um hash');
});

test('cada rota aponta para um módulo que existe', () => {
  for (const rota of ROTAS) {
    // `carregar` mora em `src/core/`, então `../pages/x.js` resolve a `src/pages/x.js`.
    const arquivo = new URL(rota.modulo.replace('../', ''), raizSrc);
    assert.ok(fs.existsSync(arquivo), `${rota.hash} aponta para ${rota.modulo}, que não existe`);
  }
});

test('cada rota importa uma função que o módulo realmente exporta', () => {
  // Renomear a fábrica sem atualizar a rota dá tela em branco, não erro de
  // build: o `import()` resolve e `m.nomeAntigo` vem `undefined`.
  for (const rota of ROTAS) {
    const fonte = fs.readFileSync(new URL(rota.modulo.replace('../', ''), raizSrc), 'utf8');
    const exporta = new RegExp(`export\\s+(async\\s+)?function\\s+${rota.exportacao}\\b`).test(fonte)
      || new RegExp(`export\\s*\\{[^}]*\\b${rota.exportacao}\\b`).test(fonte);
    assert.ok(exporta, `${rota.modulo} não exporta ${rota.exportacao}`);
  }
});

test('nenhum hash é declarado duas vezes', () => {
  const vistos = ROTAS.map((r) => r.hash);
  assert.deepEqual(vistos, [...new Set(vistos)], 'há hash repetido na tabela de rotas');
});

test('nenhuma página fica órfã, sem rota que a alcance', () => {
  // Um arquivo de página sem rota é código morto que ninguém percebe: passa no
  // build, entra no repositório e some do produto.
  const paginas = fs.readdirSync(new URL('pages/', raizSrc)).filter((n) => n.endsWith('.js'));
  const roteadas = new Set(ROTAS.map((r) => path.basename(r.modulo)));
  const orfas = paginas.filter((p) => !roteadas.has(p));
  assert.deepEqual(orfas, [], 'páginas sem rota — remova o arquivo ou publique a rota');
});

test('nenhum link interno aponta para uma rota que não existe', () => {
  // Ligações fantasmas: `location.hash = '#/x'` e `href: '#/x'` espalhados
  // pelas telas. O único jeito de saber que continuam válidas é conferir.
  const conhecidas = new Set(ROTAS.map((r) => r.hash));
  const quebrados = [];
  function varrer(dir) {
    for (const nome of fs.readdirSync(dir, { withFileTypes: true })) {
      const alvo = new URL(`${nome.name}${nome.isDirectory() ? '/' : ''}`, dir);
      if (nome.isDirectory()) { varrer(alvo); continue; }
      if (!nome.name.endsWith('.js')) continue;
      const fonte = fs.readFileSync(alvo, 'utf8');
      for (const [, hash] of fonte.matchAll(/['"`](#\/[a-z0-9-]+)['"`]/gi)) {
        if (!conhecidas.has(hash)) quebrados.push(`${nome.name} → ${hash}`);
      }
    }
  }
  varrer(raizSrc);
  assert.deepEqual(quebrados, [], 'link interno para rota inexistente');
});

test('a rota legada existe, está marcada e fica fora do menu', () => {
  // `#/tiro` é a tela do ambiente de testes de Arma 3. Ela continua acessível
  // por link direto para não quebrar histórico, mas não pode aparecer como
  // funcionalidade do aplicativo civil.
  const legadas = ROTAS.filter((r) => r.legada);
  assert.equal(legadas.length, 1, 'esperava exatamente uma rota legada');
  assert.equal(legadas[0].hash, '#/tiro');
  assert.match(mainJs, /ROTAS\.filter\(\(rota\) => !rota\.legada\)/, 'o menu tem de excluir a rota legada');
});

test('a tela legada se declara legada para quem abre o link', () => {
  // Documentação não alcança quem chegou pela URL. O aviso mora na tela.
  const tiro = fs.readFileSync(new URL('pages/tiro.js', raizSrc), 'utf8');
  assert.match(tiro, /tiro__legado/, 'a tela legada precisa renderizar o aviso');
  assert.match(tiro, /TELA LEGADA/, 'o aviso precisa dizer que a tela é legada');
  assert.match(tiro, /Arma 3/, 'o aviso precisa nomear o ambiente de simulação');
});

test('toda rota está na matriz de rotas, e a matriz não inventa rotas', () => {
  const matriz = fs.readFileSync(new URL('../docs/ROUTE-MATRIX.md', import.meta.url), 'utf8');
  const naMatriz = new Set([...matriz.matchAll(/`(#\/[a-z0-9-]+)`/gi)].map(([, h]) => h));
  const faltando = ROTAS.map((r) => r.hash).filter((h) => !naMatriz.has(h));
  assert.deepEqual(faltando, [], 'rota sem linha na matriz — documente antes de publicar');
  const sobrando = [...naMatriz].filter((h) => !ROTAS.some((r) => r.hash === h));
  assert.deepEqual(sobrando, [], 'a matriz cita rota que não existe mais');
});

test('toda rota tem um contrato escrito em docs/ROUTES/', () => {
  const dir = new URL('../docs/ROUTES/', import.meta.url);
  assert.ok(fs.existsSync(dir), 'falta o diretório docs/ROUTES/');
  const contratos = new Set(fs.readdirSync(dir).map((n) => n.replace(/\.md$/, '').toLowerCase()));
  const semContrato = ROTAS.map((r) => r.hash.replace('#/', '')).filter((n) => !contratos.has(n));
  assert.deepEqual(semContrato, [], 'rota sem contrato em docs/ROUTES/');
});

test('todo contrato responde as perguntas obrigatórias', () => {
  // A regra do projeto: se a página existe, ela responde por que existe, o que
  // a pessoa faz nela, de onde vêm os dados e o que acontece sem dado.
  const dir = new URL('../docs/ROUTES/', import.meta.url);
  const secoes = ['Objetivo', 'Entrada', 'Dados necessários', 'Dependências', 'Ações', 'Saídas', 'Estados', 'Limitações', 'Testes'];
  for (const nome of fs.readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const texto = fs.readFileSync(new URL(nome, dir), 'utf8');
    for (const secao of secoes) {
      assert.ok(new RegExp(`^##\\s+${secao}`, 'm').test(texto), `${nome} não tem a seção "${secao}"`);
    }
  }
});
