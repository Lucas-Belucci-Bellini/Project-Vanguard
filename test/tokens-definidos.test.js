import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * Todo token usado tem de existir.
 *
 * A regra do projeto é "tokens primeiro": nenhum hex ou px solto em folha de
 * página, sempre `variables.css`. O que ninguém cobrava era o outro lado —
 * **usar um token que não existe**. O navegador não avisa: `var(--nao-existe)`
 * sem fallback torna a declaração inválida e ela é **descartada em silêncio**.
 *
 * O efeito é uma regra de estilo que simplesmente não acontece. Foi assim que
 * o rótulo ATENÇÃO do diagnóstico ficou com a mesma cor do texto normal — um
 * estado de alerta indistinguível de tudo o mais — e ninguém viu, porque não
 * havia erro nenhum, só ausência.
 *
 * Duas grafias do mesmo token (`--color-ambar` e `--color-amber`) convivendo no
 * repositório é o sintoma clássico: nada quebra quando você erra o nome.
 */

const RAIZ = new URL('..', import.meta.url).pathname;
const ESTILOS = path.join(RAIZ, 'src/styles');

/** Nomes definidos em qualquer folha (`--token: valor`). */
function tokensDefinidos() {
  const definidos = new Set();
  for (const arquivo of fs.readdirSync(ESTILOS).filter((f) => f.endsWith('.css'))) {
    const fonte = fs.readFileSync(path.join(ESTILOS, arquivo), 'utf8');
    for (const m of fonte.matchAll(/(--[\w-]+)\s*:/g)) definidos.add(m[1]);
  }
  return definidos;
}

/** Referências `var(--token)` por arquivo, ignorando as que trazem fallback. */
function referencias(arquivo) {
  const fonte = fs.readFileSync(path.join(ESTILOS, arquivo), 'utf8');
  const usadas = new Set();
  for (const m of fonte.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
    // `var(--x, algo)` tem fallback: se o token não existir, o valor alternativo
    // vale e a declaração continua válida. Só cobramos as sem rede.
    if (m[2] === ')') usadas.add(m[1]);
  }
  return usadas;
}

const DEFINIDOS = tokensDefinidos();
const FOLHAS = fs.readdirSync(ESTILOS).filter((f) => f.endsWith('.css'));

test('a varredura enxerga tokens de verdade', () => {
  // Sem esta guarda, um regex quebrado faria o teste passar vazio.
  assert.ok(DEFINIDOS.size > 50, `esperava dezenas de tokens definidos, achei ${DEFINIDOS.size}`);
  assert.ok(DEFINIDOS.has('--color-warning'), 'o token de aviso deveria estar definido');
  assert.ok(FOLHAS.length > 5, `esperava várias folhas, achei ${FOLHAS.length}`);
});

test('diagnostico.css não usa nenhum token indefinido', () => {
  // A tela de diagnóstico é a que responde "o app está atualizado?" e "qual
  // tela falhou?". Um estado de alerta sem cor ali custa caro.
  const orfas = [...referencias('diagnostico.css')].filter((t) => !DEFINIDOS.has(t));
  assert.deepEqual(orfas, [], `tokens usados e nunca definidos: ${orfas.join(', ')}`);
});

test('nenhuma folha ganha token órfão NOVO', () => {
  /*
   * O repositório já tinha 34 referências órfãs quando este teste nasceu, em
   * dez folhas. Consertá-las todas de uma vez é decisão de design, não de
   * teste: `--color-blue` não tem equivalente óbvio em `variables.css`, e
   * escolher um seria inventar cor no lugar de quem desenha.
   *
   * Então o teste tranca o que importa agora: a dívida não cresce. Baixar este
   * número ao consertar uma folha é bem-vindo; subir é regressão.
   */
  const TETO = 34;
  const orfas = [];
  for (const folha of FOLHAS) {
    for (const token of referencias(folha)) {
      if (!DEFINIDOS.has(token)) orfas.push(`${folha}: ${token}`);
    }
  }
  assert.ok(orfas.length <= TETO,
    `referências órfãs subiram de ${TETO} para ${orfas.length}:\n  ${orfas.join('\n  ')}`);
});
