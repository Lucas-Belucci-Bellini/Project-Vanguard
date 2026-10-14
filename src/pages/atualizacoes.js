import '../styles/atualizacoes.css';
import { h } from '../ui/helpers.js';
import { CANAIS, ESTADOS, RESULTADO_DOWNLOAD } from '../core/updater/index.js';
import { preferenciasUpdater, updaterApp } from '../core/updater/app.js';

/**
 * A tela que substitui "abrir o GitHub para descobrir se há versão nova".
 *
 * O que ela mostra sempre, mesmo sem rede: a versão instalada, o canal, e
 * quando foi a última verificação. O que ela mostra quando dá: a versão
 * disponível, o histórico e o download.
 *
 * O que ela NUNCA faz: instalar sozinha (item 20) e prometer o que a
 * plataforma não entrega (item 12). Quando o Android ainda não pode instalar,
 * ela diz o que falta em vez de oferecer um botão que falharia.
 */

const ROTULO_ESTADO = Object.freeze({
  [ESTADOS.ATUALIZADO]: 'ATUALIZADO',
  [ESTADOS.DISPONIVEL]: 'NOVA VERSÃO DISPONÍVEL',
  [ESTADOS.VERIFICANDO]: 'VERIFICANDO…',
  [ESTADOS.SEM_INTERNET]: 'SEM INTERNET',
  [ESTADOS.ERRO]: 'ERRO AO CONSULTAR',
  [ESTADOS.NUNCA_VERIFICADO]: 'NUNCA VERIFICADO',
});

function quando(ms) {
  if (!ms) return 'nunca';
  try { return new Date(ms).toLocaleString('pt-BR'); } catch { return 'indisponível'; }
}

function tamanho(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function atualizacoesPage() {
  const raiz = h('div', { className: 'vg-pagina atualizacoes' });
  const wrap = h('div', { className: 'atualizacoes__wrap' });

  const estadoLinha = h('p', { className: 'atualizacoes__estado', role: 'status', 'aria-live': 'polite' }, 'Carregando…');
  const resumo = h('div', { className: 'atualizacoes__resumo' });
  const acoes = h('div', { className: 'atualizacoes__acoes' });
  const progresso = h('p', { className: 'atualizacoes__progresso', hidden: true, role: 'status', 'aria-live': 'polite' });
  const historico = h('div', { className: 'atualizacoes__historico' });
  const limitacoes = h('div', { className: 'atualizacoes__limitacoes' });

  let removido = false;
  let abortar = null;

  const verificar = h('button', { className: 'atualizacoes__botao', type: 'button' }, 'VERIFICAR AGORA');

  function pintarResumo() {
    const s = updaterApp.getState();
    const prefs = preferenciasUpdater.ler();
    const plataforma = updaterApp.getPlatform();

    estadoLinha.textContent = ROTULO_ESTADO[s.estado] ?? s.estado;
    estadoLinha.dataset.estado = s.estado;

    const linhas = [
      ['Versão instalada', s.versaoInstalada],
      ['Versão disponível', s.release?.versao ?? '—'],
      ['Canal', prefs.canal.toUpperCase()],
      ['Última verificação', quando(s.verificadoEm)],
      ['Plataforma', plataforma.nome.toUpperCase()],
    ];
    if (s.erro) linhas.push(['Detalhe do erro', s.erro]);

    resumo.replaceChildren(...linhas.map(([nome, valor]) => h('div', { className: 'atualizacoes__linha' },
      h('strong', { className: 'atualizacoes__nome' }, nome),
      h('span', { className: 'atualizacoes__valor' }, String(valor)))));
  }

  function pintarAcoes() {
    const s = updaterApp.getState();
    const plataforma = updaterApp.getPlatform();
    const filhos = [verificar];

    if (updaterApp.isUpdateAvailable() && plataforma.podeBaixar) {
      const bytes = tamanho(s.release?.apk?.bytes);
      const baixar = h('button', { className: 'atualizacoes__botao atualizacoes__botao--primario', type: 'button' },
        bytes ? `BAIXAR ${s.release.versao} · ${bytes}` : `BAIXAR ${s.release.versao}`);
      baixar.onclick = () => iniciarDownload(s.release);
      filhos.push(baixar);

      // "Depois" não é um botão que faz nada: é sair da tela. Um botão que só
      // fecha um aviso que o usuário abriu de propósito seria ruído.
    }

    if (s.release?.pagina) {
      const abrir = h('a', {
        className: 'atualizacoes__botao atualizacoes__botao--link',
        href: s.release.pagina,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, 'VER NOTAS DA VERSÃO');
      filhos.push(abrir);
    }

    acoes.replaceChildren(...filhos);
  }

  function pintarHistorico() {
    const lista = updaterApp.getHistory();
    if (!lista.length) {
      historico.replaceChildren(h('p', { className: 'atualizacoes__vazio' },
        'Nenhuma release conhecida ainda. Toque em VERIFICAR AGORA com internet disponível.'));
      return;
    }
    historico.replaceChildren(
      h('h2', { className: 'atualizacoes__titulo' }, 'HISTÓRICO'),
      ...lista.map((r) => {
        const instalada = r.versao === updaterApp.getCurrentVersion();
        const marcas = [r.canal.toUpperCase()];
        if (instalada) marcas.push('INSTALADA');
        else if (updaterApp.ehDowngrade(r)) marcas.push('ANTERIOR');
        return h('div', { className: `atualizacoes__release${instalada ? ' is-instalada' : ''}` },
          h('div', { className: 'atualizacoes__release-cabecalho' },
            h('strong', null, r.versao),
            h('span', { className: 'atualizacoes__marcas' }, marcas.join(' · '))),
          h('span', { className: 'atualizacoes__data' }, r.publicadaEm ? quando(Date.parse(r.publicadaEm)) : 'data indisponível'),
          r.apk ? h('span', { className: 'atualizacoes__asset' }, `${r.apk.nome}${tamanho(r.apk.bytes) ? ` · ${tamanho(r.apk.bytes)}` : ''}`)
                : h('span', { className: 'atualizacoes__asset' }, 'sem APK nesta release'));
      }));
  }

  function pintarLimitacoes() {
    const plataforma = updaterApp.getPlatform();
    if (!plataforma.limitacoes.length) { limitacoes.replaceChildren(); return; }
    limitacoes.replaceChildren(
      h('h2', { className: 'atualizacoes__titulo' }, 'O QUE ESTA PLATAFORMA AINDA NÃO FAZ'),
      h('ul', { className: 'atualizacoes__limites' },
        ...plataforma.limitacoes.map((texto) => h('li', null, texto))));
  }

  function pintar() {
    if (removido) return;
    pintarResumo();
    pintarAcoes();
    pintarHistorico();
    pintarLimitacoes();
  }

  async function iniciarDownload(release) {
    const controlador = typeof AbortController === 'function' ? new AbortController() : null;
    abortar = controlador;
    progresso.hidden = false;
    progresso.textContent = 'Baixando… 0%';

    const cancelar = h('button', { className: 'atualizacoes__botao', type: 'button' }, 'CANCELAR');
    cancelar.onclick = () => controlador?.abort();
    acoes.replaceChildren(cancelar);

    const r = await updaterApp.download(release, {
      sinal: controlador?.signal ?? null,
      onProgresso: ({ fracao, recebidos }) => {
        if (removido) return;
        progresso.textContent = fracao === null
          ? `Baixando… ${tamanho(recebidos) ?? `${recebidos} B`}`
          : `Baixando… ${Math.round(fracao * 100)}%`;
      },
    });
    if (removido) return;
    abortar = null;

    const mensagens = {
      [RESULTADO_DOWNLOAD.OK]: `Download concluído e verificado (SHA-256 confere). ${
        updaterApp.getPlatform().podeInstalar
          ? 'Prossiga com a instalação.'
          : 'Esta plataforma ainda não instala o arquivo pelo aplicativo — veja as limitações abaixo.'}`,
      [RESULTADO_DOWNLOAD.CANCELADO]: 'Download cancelado. Nada foi instalado.',
      [RESULTADO_DOWNLOAD.ERRO_REDE]: `Falha no download: ${r.erro ?? 'erro de rede'}. Nada foi instalado.`,
      [RESULTADO_DOWNLOAD.CHECKSUM_INVALIDO]: 'ARQUIVO REPROVADO: o SHA-256 não confere com o publicado. O arquivo foi descartado e NADA será instalado.',
      [RESULTADO_DOWNLOAD.SEM_CHECKSUM]: 'Download concluído, mas a release não publicou checksum — a integridade NÃO pôde ser verificada.',
    };
    progresso.textContent = mensagens[r.resultado] ?? 'Resultado desconhecido.';
    progresso.dataset.resultado = r.resultado;
    pintarAcoes();
  }

  verificar.onclick = async () => {
    verificar.disabled = true;
    estadoLinha.textContent = ROTULO_ESTADO[ESTADOS.VERIFICANDO];
    try {
      await updaterApp.checkForUpdate();
    } finally {
      if (!removido) { verificar.disabled = false; pintar(); }
    }
  };

  // ── Preferências ──────────────────────────────────────────────────────────
  const prefs = preferenciasUpdater.ler();

  const canal = h('select', { className: 'atualizacoes__select', ariaLabel: 'Canal de atualização' },
    h('option', { value: CANAIS.STABLE }, 'ESTÁVEL'),
    h('option', { value: CANAIS.BETA }, 'BETA'));
  canal.value = prefs.canal;
  canal.onchange = () => { preferenciasUpdater.gravar({ canal: canal.value }); pintar(); };

  const aoIniciar = h('input', { type: 'checkbox', className: 'atualizacoes__check', ariaLabel: 'Verificar ao iniciar' });
  aoIniciar.checked = prefs.verificarAoIniciar;
  aoIniciar.onchange = () => preferenciasUpdater.gravar({ verificarAoIniciar: aoIniciar.checked });

  const baixar = h('select', { className: 'atualizacoes__select', ariaLabel: 'Baixar automaticamente' },
    h('option', { value: 'nunca' }, 'NUNCA'),
    h('option', { value: 'wifi' }, 'SOMENTE WI-FI'),
    h('option', { value: 'sempre' }, 'WI-FI + DADOS MÓVEIS'));
  baixar.value = prefs.baixarAutomaticamente;
  baixar.onchange = () => preferenciasUpdater.gravar({ baixarAutomaticamente: baixar.value });

  const configuracoes = h('div', { className: 'atualizacoes__config' },
    h('h2', { className: 'atualizacoes__titulo' }, 'CONFIGURAÇÕES'),
    h('label', { className: 'atualizacoes__campo' }, h('span', null, 'Canal'), canal),
    h('label', { className: 'atualizacoes__campo' }, h('span', null, 'Verificar ao iniciar'), aoIniciar),
    h('label', { className: 'atualizacoes__campo' }, h('span', null, 'Baixar automaticamente'), baixar),
    h('p', { className: 'atualizacoes__nota' },
      'Nenhuma versão é instalada sem a sua confirmação. O padrão não baixa nada sozinho.'));

  raiz.append(wrap);
  wrap.append(
    h('header', { className: 'atualizacoes__header' },
      h('div', { className: 'atualizacoes__eyebrow' }, 'ATUALIZAÇÕES'),
      h('h1', null, 'Versão do aplicativo'),
      estadoLinha),
    resumo,
    acoes,
    progresso,
    limitacoes,
    historico,
    configuracoes);

  pintar();
  // A verificação inicial não bloqueia a tela: ela abre com o que já se sabe e
  // o resultado chega quando chegar (item 8).
  if (prefs.verificarAoIniciar) void updaterApp.checkForUpdate().then(pintar).catch(() => {});

  return {
    elemento: raiz,
    desmontar() {
      removido = true;
      abortar?.abort();
    },
  };
}
