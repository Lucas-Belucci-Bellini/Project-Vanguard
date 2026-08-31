import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

/**
 * O app é usado com a tela travada e no bolso. Qualquer estouro horizontal
 * vira um arrasto que empurra metade da interface para fora — e no campo isso
 * significa perder o seletor de modo ou a barra de abas sem perceber.
 * Estas invariantes são de layout, não de aparência: mudaram, o app volta a
 * poder ser arrastado para fora da área visível.
 */

const css = fs.readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');

/** Junta as declarações de todos os blocos cujo seletor bate exatamente. */
function declaracoesDe(seletor) {
  const blocos = [];
  const regex = /([^{}]+)\{([^{}]*)\}/g;
  let achado;
  while ((achado = regex.exec(css))) {
    const alvos = achado[1].split(',').map((parte) => parte.trim());
    if (alvos.includes(seletor)) blocos.push(achado[2]);
  }
  return blocos.join(';');
}

test('a raiz do documento trava a rolagem horizontal', () => {
  const raiz = declaracoesDe('html');
  assert.ok(raiz, 'esperava um bloco para html');
  // `clip` é a trava real: não cria contexto de rolagem, então `position: fixed`
  // continua preso à viewport. `hidden` fica antes como reserva para WebView
  // antigo — se só sobrar `hidden`, a barra de abas volta a esticar.
  assert.match(raiz, /overflow-x:\s*clip/, 'html precisa de overflow-x: clip');
  assert.match(raiz, /max-width:\s*100%/, 'html precisa de max-width: 100%');
});

test('no cabeçalho a marca cede espaço antes dos controles', () => {
  const marca = declaracoesDe('.vg-marca');
  // Sem `min-width: 0` um filho com `white-space: nowrap` recusa encolher e
  // empurra o resto para fora da tela, por mais estreito que seja o aparelho.
  assert.match(marca, /min-width:\s*0/, '.vg-marca precisa poder encolher');
  assert.match(marca, /flex:\s*0\s+1\s+auto/, '.vg-marca precisa de flex-shrink 1');

  const meta = declaracoesDe('.vg-header__meta');
  assert.match(meta, /flex:\s*0\s+0\s+auto/, '.vg-header__meta não pode ser espremido');
});

test('o subtítulo da marca só aparece onde sobra largura', () => {
  const marcaSmall = declaracoesDe('.vg-marca small');
  assert.match(marcaSmall, /display:\s*none/, 'o subtítulo começa oculto');
  assert.match(css, /@media \(min-width: 480px\) \{\s*\.vg-marca small \{ display: block; \}/,
    'o subtítulo só volta a partir de 480px');
});

test('a barra de abas fixa não ultrapassa a viewport', () => {
  assert.match(declaracoesDe('.vg-abas'), /max-width:\s*100%/, '.vg-abas precisa de max-width: 100%');
});

test('nenhuma página repete a marca que o cabeçalho já mostra sempre', () => {
  const paginas = fs.readdirSync(new URL('../src/pages/', import.meta.url)).filter((n) => n.endsWith('.js'));
  const repetem = paginas.filter((nome) => {
    const fonte = fs.readFileSync(new URL(`../src/pages/${nome}`, import.meta.url), 'utf8');
    return /'VANGUARD FIELD \//.test(fonte);
  });
  assert.deepEqual(repetem, [], 'o cabeçalho já carrega a marca em todas as telas');
});
