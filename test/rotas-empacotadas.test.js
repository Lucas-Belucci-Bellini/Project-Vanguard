import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * Rota → módulo → chunk empacotado.
 *
 * Este teste existe para falhar quando alguém adiciona uma rota e esquece
 * metade da cadeia. O modo de falha que ele cobre é o caro: a rota existe no
 * menu, a página existe em `src/pages/`, o site funciona — e o pacote móvel
 * não tem o módulo, porque ninguém conferiu que o build o produziu.
 *
 * A lista de rotas é **lida do `src/main.js`**, nunca copiada para cá. Uma
 * lista copiada envelhece em silêncio e passaria a testar um app que não
 * existe mais — que é a própria classe de defeito que este arquivo persegue.
 */

const RAIZ = new URL('..', import.meta.url).pathname;
/* A lista saiu do `main.js` para `core/rotas.js` quando o autoteste passou a
 * precisar dela. O teste segue lendo a FONTE, nunca uma cópia. */
const MAIN = fs.readFileSync(path.join(RAIZ, 'src/core/rotas.js'), 'utf8');

/** Extrai `{ hash, modulo }` de cada entrada do array ROTAS do main.js. */
function rotasDeclaradas() {
  const bloco = MAIN.slice(MAIN.indexOf('const ROTAS = ['), MAIN.length);
  assert.ok(bloco.length > 0, 'não achei o array ROTAS em src/core/rotas.js');
  const rotas = [];
  const re = /hash:\s*'([^']+)'[\s\S]*?import\('\.\.\/pages\/([^']+)'\)/g;
  let m;
  while ((m = re.exec(bloco)) !== null) rotas.push({ hash: m[1], modulo: m[2] });
  return rotas;
}

const ROTAS = rotasDeclaradas();

test('o main.js declara as rotas oficiais e nenhuma se perdeu na leitura', () => {
  // Se este número cair sem alguém ter removido uma rota de propósito, a
  // extração acima quebrou — e os testes seguintes passariam vazios, que é
  // pior que falhar.
  assert.ok(ROTAS.length >= 13, `esperava ao menos 13 rotas, li ${ROTAS.length}`);
  const oficiais = ['#/inicio', '#/mapa', '#/navegacao', '#/bussola', '#/socorro',
    '#/escuta', '#/noturno', '#/doar', '#/contexto', '#/sobrevivencia',
    '#/sobre', '#/diagnostico', '#/tiro'];
  for (const hash of oficiais) {
    assert.ok(ROTAS.some((r) => r.hash === hash), `a rota ${hash} sumiu de core/rotas.js`);
  }
});

test('toda rota aponta para um módulo de página que existe', () => {
  for (const { hash, modulo } of ROTAS) {
    const arquivo = path.join(RAIZ, 'src/pages', modulo);
    assert.ok(fs.existsSync(arquivo), `${hash} importa src/pages/${modulo}, que não existe`);
  }
});

test('todo módulo de página exporta a função que a rota consome', () => {
  const bloco = MAIN.slice(MAIN.indexOf('const ROTAS = ['), MAIN.length);
  const re = /import\('\.\.\/pages\/([^']+)'\)\.then\(\(m\) => m\.(\w+)\)/g;
  let m;
  let conferidos = 0;
  while ((m = re.exec(bloco)) !== null) {
    const [, modulo, exportado] = m;
    const fonte = fs.readFileSync(path.join(RAIZ, 'src/pages', modulo), 'utf8');
    assert.match(fonte, new RegExp(`export\\s+(async\\s+)?function\\s+${exportado}\\b|export\\s*\\{[^}]*\\b${exportado}\\b`),
      `src/pages/${modulo} não exporta \`${exportado}\` — a rota carregaria \`undefined\` e a tela ficaria em branco`);
    conferidos += 1;
  }
  assert.equal(conferidos, ROTAS.length, 'nem toda rota teve o export conferido');
});

/*
 * A parte que depende do build só roda quando há `dist/`. Assim `npm test`
 * continua valendo num clone limpo, mas quem acabou de buildar recebe a
 * verificação inteira — e o CI, que builda, sempre a recebe.
 */
const DIST = path.join(RAIZ, 'dist/assets');
const TEM_BUILD = fs.existsSync(DIST);

test('o build produz um chunk para cada página', { skip: TEM_BUILD ? false : 'sem dist/ — rode `npm run build`' }, () => {
  const chunks = fs.readdirSync(DIST).filter((f) => f.endsWith('.js'));
  const semChunk = [];
  for (const { hash, modulo } of ROTAS) {
    const base = modulo.replace(/\.js$/, '');
    // Vite nomeia o chunk pelo módulo de origem mais um hash de conteúdo.
    const achou = chunks.some((c) => c === `${base}.js` || c.startsWith(`${base}-`));
    if (!achou) semChunk.push(`${hash} → esperava um chunk de ${base} em dist/assets/`);
  }
  assert.deepEqual(semChunk, [], `páginas sem chunk no build:\n  ${semChunk.join('\n  ')}`);
});

test('o index.html do build referencia um bundle de entrada', { skip: TEM_BUILD ? false : 'sem dist/' }, () => {
  const indice = fs.readFileSync(path.join(RAIZ, 'dist/index.html'), 'utf8');
  assert.match(indice, /assets\/index-[\w-]+\.js/, 'o index.html não aponta para o bundle de entrada');
});
