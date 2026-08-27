import { h } from '../ui/helpers.js';
import {
  URL_RELEASE_MAIS_RECENTE,
  URL_RELEASES,
  VERSAO_ATUAL,
  nomeVersao,
  releaseMaisNova,
  urlDownload,
} from './atualizacao.js';

function abrirOficialmente(url) {
  if (typeof window.open === 'function') {
    const janela = window.open(url, '_blank', 'noopener,noreferrer');
    if (janela) return;
  }
  window.location.assign(url);
}

/**
 * Cria um botão que só aparece quando há uma atualização detectada.
 *
 * - Service worker waiting: confirma, ativa e recarrega a aplicação.
 * - Release remota: confirma e abre o download/página oficial; APK não pode
 *   instalar a si próprio dentro do navegador ou WebView.
 */
export function criarControleAtualizacao() {
  const botao = h('button', {
    className: 'vg-atualizacao',
    type: 'button',
    hidden: true,
    ariaLabel: 'Atualização disponível',
  }, 'ATUALIZAÇÃO');
  const registrosObservados = new WeakSet();
  let releaseConhecida = null;
  let registroConhecido = null;
  let removido = false;

  function mostrar({ texto, titulo, atualizarServiceWorker, url }) {
    if (removido) return;
    botao.hidden = false;
    botao.textContent = texto;
    botao.title = titulo;
    botao.onclick = () => {
      if (atualizarServiceWorker) {
        if (!window.confirm('Atualizar a aplicação agora? A tela será recarregada.')) return;
        botao.disabled = true;
        botao.textContent = 'ATUALIZANDO…';
        const recarregar = () => window.location.reload();
        navigator.serviceWorker?.addEventListener('controllerchange', recarregar, { once: true });
        atualizarServiceWorker.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
      if (!window.confirm('Abrir a página oficial para baixar a atualização?')) return;
      abrirOficialmente(url || URL_RELEASES);
    };
  }

  function verificarServiceWorker(registro = registroConhecido) {
    if (!registro) return;
    registroConhecido = registro;
    if (registro.waiting) {
      mostrar({
        texto: 'ATUALIZAÇÃO PRONTA',
        titulo: 'Nova versão armazenada. Toque para atualizar com confirmação.',
        atualizarServiceWorker: registro.waiting,
      });
      return;
    }
    const instalando = registro.installing;
    if (instalando) {
      instalando.addEventListener('statechange', () => {
        if (instalando.state === 'installed' && navigator.serviceWorker.controller) verificarServiceWorker(registro);
      });
    }
  }

  async function verificarRelease() {
    if (removido || navigator.onLine === false || releaseConhecida) return;
    try {
      const resposta = await fetch(URL_RELEASE_MAIS_RECENTE, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
      });
      if (!resposta.ok) return;
      const release = await resposta.json();
      if (!releaseMaisNova(release, VERSAO_ATUAL)) return;
      releaseConhecida = release;
      const versao = nomeVersao(release) || 'nova versão';
      mostrar({
        texto: `ATUALIZAÇÃO · ${versao}`,
        titulo: 'Toque para abrir o download oficial. A instalação sempre depende de confirmação do sistema.',
        url: urlDownload(release),
      });
    } catch {
      /* Sem rede ou API indisponível: o app continua funcionando localmente. */
    }
  }

  function observarRegistro(registro) {
    if (!registro || registrosObservados.has(registro)) return;
    registrosObservados.add(registro);
    registro.addEventListener('updatefound', () => verificarServiceWorker(registro));
  }

  function aoServiceWorkerPronto(event) {
    const registro = event.detail?.registration;
    observarRegistro(registro);
    verificarServiceWorker(registro);
  }
  function aoOnline() { verificarRelease(); }
  function aoVisivel() { if (!document.hidden) verificarRelease(); }

  addEventListener('vanguard:sw-ready', aoServiceWorkerPronto);
  addEventListener('online', aoOnline);
  document.addEventListener('visibilitychange', aoVisivel);
  if (navigator.serviceWorker) navigator.serviceWorker.ready.then((registro) => {
    observarRegistro(registro);
    verificarServiceWorker(registro);
  }).catch(() => {});
  setTimeout(verificarRelease, 2500);

  return {
    elemento: botao,
    desmontar() {
      removido = true;
      removeEventListener('vanguard:sw-ready', aoServiceWorkerPronto);
      removeEventListener('online', aoOnline);
      document.removeEventListener('visibilitychange', aoVisivel);
    },
  };
}
