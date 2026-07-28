/**
 * Bootstrap do Project Vanguard.
 *
 * Roteador por hash (mesmo padrão do Projeto Baluarte), páginas carregadas
 * sob demanda por `import()` dinâmico — o Vite gera um chunk por tela, então
 * abrir o app não baixa o mapa inteiro nem o computador de tiro.
 *
 * O estado compartilhado entre telas (posição da peça, alvo, sistema) mora em
 * `src/core/estado.js` e persiste no localStorage: marcar o alvo no mapa e
 * trocar para a aba de tiro tem de manter o alvo. Perder isso no meio de uma
 * missão é o tipo de detalhe que faz a ferramenta ser abandonada.
 */

import { h, $, empty } from './ui/helpers.js';
import { estado } from './core/estado.js';

const ROTAS = [
  { hash: '#/mapa', titulo: 'Mapa', carregar: () => import('./pages/mapa.js').then((m) => m.mapaPage) },
  { hash: '#/tiro', titulo: 'Tiro', carregar: () => import('./pages/tiro.js').then((m) => m.tiroPage) },
  { hash: '#/sobre', titulo: 'Sobre', carregar: () => import('./pages/sobre.js').then((m) => m.sobrePage) }
];

const PADRAO = '#/mapa';

let desmontarAtual = null;

function montarShell() {
  const abas = ROTAS.map((r) =>
    h('button', {
      className: 'vg-aba',
      dataset: { hash: r.hash },
      onclick: () => { location.hash = r.hash; }
    }, r.titulo)
  );

  const seletorModo = h('select', {
    className: 'vg-modo',
    title: 'Modo de tela — noite preserva a visão noturna',
    onchange: (e) => {
      document.documentElement.dataset.modo = e.target.value;
      estado.set('modo', e.target.value);
    }
  },
    h('option', { value: 'tatico' }, 'TÁTICO'),
    h('option', { value: 'noite' }, 'NOITE'),
    h('option', { value: 'dia' }, 'DIA')
  );
  seletorModo.value = estado.get('modo', 'tatico');
  document.documentElement.dataset.modo = seletorModo.value;

  const header = h('header', { className: 'vg-header' },
    h('div', { className: 'vg-marca' }, 'VANGUARD', h('small', null, 'PROJETO BALUARTE')),
    h('nav', { className: 'vg-abas' }, abas),
    h('div', { className: 'vg-header__dir' }, seletorModo)
  );

  const main = h('main', { className: 'vg-main', id: 'vg-main' });
  document.body.append(header, main);
  return { abas, main };
}

/**
 * Separa `#/tiro?terreno=altis` em rota e parâmetros.
 *
 * Existe para o Projeto Baluarte poder mandar contexto junto do link — abrir
 * o computador de tiro já no terreno que o operador estava olhando lá. Sem
 * isso o hash com `?` não casaria com rota nenhuma e cairia no mapa, que é
 * pior que ignorar o parâmetro: leva para a tela errada.
 */
function lerHash(bruto) {
  const hash = bruto || PADRAO;
  const corte = hash.indexOf('?');
  if (corte < 0) return { caminho: hash, query: {} };
  return {
    caminho: hash.slice(0, corte),
    query: Object.fromEntries(new URLSearchParams(hash.slice(corte + 1))),
  };
}

async function navegar({ abas, main }) {
  const { caminho, query } = lerHash(location.hash);
  const rota = ROTAS.find((r) => r.hash === caminho) ?? ROTAS[0];

  for (const b of abas) {
    if (b.dataset.hash === rota.hash) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  document.title = `VANGUARD · ${rota.titulo}`;

  /* Desmontar a tela anterior não é opcional: o mapa segura um watchPosition
   * e um mapa WebGL. Sem isso, trocar de aba vaza GPS e contexto gráfico. */
  if (desmontarAtual) { try { desmontarAtual(); } catch { /* nada a fazer */ } desmontarAtual = null; }
  empty(main);

  try {
    const pagina = await rota.carregar();
    const { elemento, desmontar } = pagina({ query });
    desmontarAtual = desmontar ?? null;
    main.append(elemento);
  } catch (erro) {
    main.append(h('div', { className: 'vg-pagina', style: { padding: '24px' } },
      h('div', { className: 'vg-aviso vg-aviso--perigo' },
        `Falha ao carregar a tela "${rota.titulo}": ${erro.message}`)
    ));
  }
}

function boot() {
  const shell = montarShell();
  if (!location.hash) location.hash = PADRAO;
  addEventListener('hashchange', () => navegar(shell));
  navegar(shell);
}

if (document.readyState === 'loading') {
  addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
