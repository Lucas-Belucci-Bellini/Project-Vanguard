/**
 * Shell do Vanguard Field.
 * A navegação é por hash para continuar funcionando como site estático e dentro
 * de um contêiner móvel, sem depender de servidor ou sinal durante a troca de
 * telas.
 */

import { h, empty } from './ui/helpers.js';
import { estado, CHAVES } from './core/estado.js';
import { criarControleAtualizacao } from './core/atualizacao-ui.js';
import { recuperarDatasetNoBoot } from './core/dataset-boot-recovery.js';
import { criarNavegador } from './core/navegacao.js';
import { registrarServiceWorker } from './core/service-worker.js';
import { falhasDeTela } from './core/falhas-tela-app.js';

const ROTAS = [
  { hash: '#/inicio', titulo: 'Início', icone: '⌂', carregar: () => import('./pages/inicio.js').then((m) => m.inicioPage) },
  { hash: '#/mapa', titulo: 'Mapa', icone: '⊕', carregar: () => import('./pages/mapa.js').then((m) => m.mapaPage) },
  { hash: '#/navegacao', titulo: 'Navegação', icone: '⌖', carregar: () => import('./pages/navegacao.js').then((m) => m.navegacaoPage) },
  { hash: '#/bussola', titulo: 'Bússola', icone: '◉', carregar: () => import('./pages/bussola.js').then((m) => m.bussolaPage) },
  { hash: '#/socorro', titulo: 'Socorro', icone: '!', carregar: () => import('./pages/socorro.js').then((m) => m.socorroPage) },
  { hash: '#/escuta', titulo: 'Escuta', icone: '◎', carregar: () => import('./pages/escuta.js').then((m) => m.escutaPage), secundária: true },
  { hash: '#/noturno', titulo: 'Noturno', icone: '◐', carregar: () => import('./pages/noturno.js').then((m) => m.noturnoPage), secundária: true },
  { hash: '#/doar', titulo: 'Apoiar', icone: '＋', carregar: () => import('./pages/doar.js').then((m) => m.doarPage), secundária: true },
  { hash: '#/contexto', titulo: 'Contexto', icone: '◈', carregar: () => import('./pages/contexto.js').then((m) => m.contextoPage), secundária: true },
  { hash: '#/sobrevivencia', titulo: 'Sobrevivência', icone: '⌁', carregar: () => import('./pages/sobrevivencia.js').then((m) => m.sobrevivenciaPage), secundária: true },
  { hash: '#/sobre', titulo: 'Sobre', icone: 'i', carregar: () => import('./pages/sobre.js').then((m) => m.sobrePage), secundária: true },
  { hash: '#/diagnostico', titulo: 'Diagnóstico', icone: '⌁', carregar: () => import('./pages/diagnostico.js').then((m) => m.diagnosticoPage), secundária: true },
  /* A tela legada continua acessível por link direto enquanto o app migra. */
  { hash: '#/tiro', titulo: 'Cálculo legado', carregar: () => import('./pages/tiro.js').then((m) => m.tiroPage), legada: true }
];

const PADRAO = '#/inicio';
let navegador = null;

function montarShell() {
  const abas = ROTAS.filter((rota) => !rota.legada).map((rota) =>
    h('button', {
      className: `vg-aba${rota.secundária ? ' vg-aba--secundaria' : ''}`,
      dataset: { hash: rota.hash },
      type: 'button',
      ariaLabel: rota.titulo,
      onclick: () => { location.hash = rota.hash; }
    },
      h('span', { className: 'vg-aba__icone', ariaHidden: 'true' }, rota.icone),
      h('span', { className: 'vg-aba__texto' }, rota.titulo)
    )
  );

  const seletorModo = h('select', {
    className: 'vg-modo',
    title: 'Modo de tela',
    ariaLabel: 'Modo de tela',
    onchange: (e) => {
      document.documentElement.dataset.modo = e.target.value;
      estado.set(CHAVES.MODO, e.target.value);
    }
  },
    h('option', { value: 'tatico' }, 'TÁTICO'),
    h('option', { value: 'noite' }, 'NOITE'),
    h('option', { value: 'dia' }, 'DIA')
  );
  seletorModo.value = estado.get(CHAVES.MODO, 'tatico');
  document.documentElement.dataset.modo = seletorModo.value;

  // Duas linhas curtas em vez de uma linha longa: o cabeçalho tem 64 px de
  // altura e sobra vertical, mas a largura é o recurso escasso num celular de
  // 360 px. Uma linha só empurrava o seletor de modo para fora da tela.
  const gpsRede = h('span', { className: 'vg-status__rede' }, 'ONLINE');
  const gpsStatus = h('span', { className: 'vg-status__text' }, 'GPS LOCAL');
  const status = h('div', { className: 'vg-status', title: 'A localização é mantida no dispositivo por padrão', 'aria-label': 'Status de conectividade e localização local', 'aria-live': 'polite' },
    h('span', { className: 'vg-status__dot', ariaHidden: 'true' }),
    h('span', { className: 'vg-status__linhas' }, gpsRede, gpsStatus));
  const atualizarConectividade = () => {
    const online = navigator.onLine !== false;
    gpsRede.textContent = online ? 'ONLINE' : 'OFFLINE';
    status.classList.toggle('is-offline', !online);
    status.title = online
      ? 'Internet disponível; a posição continua local por padrão.'
      : 'Sem internet; recursos locais continuam disponíveis, mas sincronização e envio ficam pendentes.';
  };
  addEventListener('online', atualizarConectividade);
  addEventListener('offline', atualizarConectividade);
  atualizarConectividade();

  const controleAtualizacao = criarControleAtualizacao();

  const salto = h('a', { className: 'vg-salto-conteudo', href: '#vg-main' }, 'Pular para o conteúdo principal');
  const header = h('header', { className: 'vg-header' },
    h('div', { className: 'vg-marca' },
      h('span', { className: 'vg-marca__sigla' }, 'V'),
      h('span', null, 'ANGUARD'),
      h('small', null, 'FIELD NAVIGATION')
    ),
    h('div', { className: 'vg-header__meta' }, status, controleAtualizacao.elemento, seletorModo)
  );

  const nav = h('nav', { className: 'vg-abas', 'aria-label': 'Navegação principal' }, abas);
  const main = h('main', { className: 'vg-main', id: 'vg-main', tabindex: '-1', 'aria-label': 'Conteúdo principal', 'aria-busy': 'false' });
  salto.onclick = (evento) => {
    evento.preventDefault();
    main.focus({ preventScroll: false });
  };
  document.body.append(salto, header, main, nav);
  return { abas, main, gpsRede, gpsStatus, status, desmontarAtualizacao: controleAtualizacao.desmontar };
}

function lerHash(bruto) {
  const hash = bruto || PADRAO;
  const corte = hash.indexOf('?');
  if (corte < 0) return { caminho: hash, query: {} };
  return {
    caminho: hash.slice(0, corte),
    query: Object.fromEntries(new URLSearchParams(hash.slice(corte + 1)))
  };
}

async function navegar({ abas, main }) {
  const { caminho, query } = lerHash(location.hash);
  const rota = ROTAS.find((r) => r.hash === caminho) ?? ROTAS[0];
  for (const aba of abas) {
    const ativa = aba.dataset.hash === rota.hash;
    if (ativa) aba.setAttribute('aria-current', 'page');
    else aba.removeAttribute('aria-current');
  }
  document.title = `VANGUARD · ${rota.titulo}`;
  main.setAttribute('aria-busy', 'true');
  // A guarda de corrida vive no navegador: duas trocas rápidas de aba não
  // podem montar duas telas no mesmo contêiner nem deixar a primeira viva
  // sem desmontagem.
  await navegador.navegar({ carregar: rota.carregar, props: { query } });
  main.setAttribute('aria-busy', 'false');
  main.focus({ preventScroll: true });
}

async function boot() {
  const shell = montarShell();
  if (!location.hash) location.hash = PADRAO;

  const recovery = await recuperarDatasetNoBoot();
  if (!recovery.ok) {
    console.error('[Vanguard] Falha na recuperação do dataset durante o boot.', recovery);
    shell.status.setAttribute('data-dataset-recovery', 'error');
    shell.status.title = 'A recuperação do dataset offline falhou; consulte o diagnóstico antes de iniciar uma nova atualização.';
  } else {
    shell.status.setAttribute('data-dataset-recovery', recovery.estado ?? 'ok');
  }

  navegador = criarNavegador({
    container: shell.main,
    esvaziar: empty,
    aoErro: (erro) => {
      // A falha é registrada ANTES de ser pintada: o aviso na tela some na
      // próxima navegação, e era só isso que existia. O registro é o que
      // permite ao Diagnóstico dizer depois qual tela falhou e por quê — a
      // diferença entre "não abre no app" e "o chunk da rota X não chegou ao
      // pacote".
      const { tipo } = falhasDeTela.registrar(lerHash(location.hash).caminho, erro);
      console.error('[Vanguard] Falha ao carregar tela.', { tipo, erro });
      const explicacao = tipo === 'CHUNK_NAO_CARREGOU'
        ? 'O módulo desta tela não chegou a carregar — o pacote pode estar incompleto ou desatualizado. Abra Diagnóstico → TELAS.'
        : 'Abra Diagnóstico → TELAS para o registro completo.';
      shell.main.append(h('div', { className: 'vg-pagina vg-erro-pagina' },
        h('div', { className: 'vg-aviso vg-aviso--perigo', role: 'alert' },
          h('strong', null, `Falha ao carregar a tela: ${erro.message}`),
          h('br'),
          h('span', null, explicacao))
      ));
    },
  });

  addEventListener('hashchange', () => navegar(shell));
  navegar(shell);
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

/* O service worker é registrado aqui, e não no `index.html`, para poder usar o
 * identificador de build injetado no bundle. Falhar no registro nunca derruba o
 * aplicativo: sem ele o app perde o cache offline, não a navegação. */
void registrarServiceWorker();
