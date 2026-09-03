/**
 * As rotas do aplicativo — fonte única.
 *
 * Ficavam dentro do `src/main.js`. Saíram para cá quando o autoteste de rotas
 * passou a precisar da mesma lista: duas cópias divergem em silêncio, e a
 * divergência seria justamente "a rota existe no menu e o autoteste não sabe
 * dela" — o defeito que o autoteste existe para encontrar.
 *
 * `carregar` é o `import()` dinâmico de cada página. Manter a função aqui (em
 * vez de só o caminho em texto) é o que permite ao autoteste exercitar o MESMO
 * caminho de carregamento que a navegação usa, e não uma imitação dele.
 */

export const ROTAS = [
  { hash: '#/inicio', titulo: 'Início', icone: '⌂', carregar: () => import('../pages/inicio.js').then((m) => m.inicioPage) },
  { hash: '#/mapa', titulo: 'Mapa', icone: '⊕', carregar: () => import('../pages/mapa.js').then((m) => m.mapaPage) },
  { hash: '#/navegacao', titulo: 'Navegação', icone: '⌖', carregar: () => import('../pages/navegacao.js').then((m) => m.navegacaoPage) },
  { hash: '#/bussola', titulo: 'Bússola', icone: '◉', carregar: () => import('../pages/bussola.js').then((m) => m.bussolaPage) },
  { hash: '#/socorro', titulo: 'Socorro', icone: '!', carregar: () => import('../pages/socorro.js').then((m) => m.socorroPage) },
  { hash: '#/escuta', titulo: 'Escuta', icone: '◎', carregar: () => import('../pages/escuta.js').then((m) => m.escutaPage), secundária: true },
  { hash: '#/noturno', titulo: 'Noturno', icone: '◐', carregar: () => import('../pages/noturno.js').then((m) => m.noturnoPage), secundária: true },
  { hash: '#/doar', titulo: 'Apoiar', icone: '＋', carregar: () => import('../pages/doar.js').then((m) => m.doarPage), secundária: true },
  { hash: '#/contexto', titulo: 'Contexto', icone: '◈', carregar: () => import('../pages/contexto.js').then((m) => m.contextoPage), secundária: true },
  { hash: '#/sobrevivencia', titulo: 'Sobrevivência', icone: '⌁', carregar: () => import('../pages/sobrevivencia.js').then((m) => m.sobrevivenciaPage), secundária: true },
  { hash: '#/sobre', titulo: 'Sobre', icone: 'i', carregar: () => import('../pages/sobre.js').then((m) => m.sobrePage), secundária: true },
  { hash: '#/diagnostico', titulo: 'Diagnóstico', icone: '⌁', carregar: () => import('../pages/diagnostico.js').then((m) => m.diagnosticoPage), secundária: true },
  /* A tela legada continua acessível por link direto enquanto o app migra. */
  { hash: '#/tiro', titulo: 'Cálculo legado', carregar: () => import('../pages/tiro.js').then((m) => m.tiroPage), legada: true }
];
