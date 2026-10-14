/**
 * Registro do service worker.
 *
 * ## O defeito que este arquivo existe para não repetir
 *
 * O registro ficava embutido no `index.html` com esta condição:
 *
 *     if ('serviceWorker' in navigator && location.protocol === 'https:')
 *
 * A WebView do Capacitor com `useLegacyBridge` serve o aplicativo em
 * **`http://localhost`**. O protocolo não é `https:`, então o service worker
 * **nunca registrou dentro do APK** — em nenhuma das versões publicadas. Duas
 * consequências, ambas medidas:
 *
 * 1. O preparo de mapa offline conversa com o service worker por mensagem e
 *    espera `navigator.serviceWorker.ready`. Sem registro essa promessa **não
 *    resolve nunca**: no aplicativo, o botão "Preparar área offline" travava
 *    para sempre, sem erro e sem aviso.
 * 2. O aplicativo não tinha shell offline nenhum — o que passava despercebido
 *    porque os arquivos vêm do próprio APK.
 *
 * A condição certa é `isSecureContext`, que a especificação define como
 * verdadeiro para `https:` **e** para `localhost` — exatamente as duas origens
 * em que este aplicativo roda.
 *
 * ## Por que a URL leva o identificador de build
 *
 * O navegador só troca o service worker quando o **arquivo** dele muda. O
 * `sw.js` deste projeto é estático, então uma versão nova do aplicativo não o
 * mudava — e o cache, cujo nome era a constante `vanguard-field-shell-v9`,
 * atravessou quatro releases sem nunca ser invalidado. Registrando em
 * `/sw.js?v=<build>`, cada build é um service worker novo, com cache novo, e o
 * `activate` apaga os caches dos builds anteriores.
 */

import { BUILD_ID } from './versao.js';

export const EVENTO_SW_PRONTO = 'vanguard:sw-ready';

/** Sem identificador de build, o registro é sem versão em vez de mentir uma. */
export function urlDoServiceWorker(build = BUILD_ID) {
  return build ? `/sw.js?v=${encodeURIComponent(build)}` : '/sw.js';
}

/**
 * @param {object} [opcoes]
 * @param {Window} [opcoes.janela]
 * @param {Navigator} [opcoes.navegador]
 * @returns {Promise<{registrado: boolean, motivo: string|null}>}
 */
export async function registrarServiceWorker({
  janela = typeof window !== 'undefined' ? window : null,
  navegador = typeof navigator !== 'undefined' ? navigator : null,
  build = BUILD_ID,
} = {}) {
  if (!navegador || !('serviceWorker' in navegador)) {
    return { registrado: false, motivo: 'Este ambiente não oferece service worker.' };
  }
  // `isSecureContext` cobre https: e localhost — inclusive o http://localhost
  // da WebView. Comparar o protocolo com 'https:' excluía o aplicativo.
  if (janela && janela.isSecureContext === false) {
    return { registrado: false, motivo: 'Contexto não seguro: o navegador não permite service worker aqui.' };
  }
  try {
    const registro = await navegador.serviceWorker.register(urlDoServiceWorker(build));
    if (janela) {
      janela.__vanguardServiceWorkerRegistration = registro;
      janela.dispatchEvent(new CustomEvent(EVENTO_SW_PRONTO, { detail: { registration: registro } }));
    }
    try { await registro.update(); } catch { /* atualizar é oportunista */ }
    return { registrado: true, motivo: null };
  } catch (erro) {
    return { registrado: false, motivo: erro?.message ?? 'O registro do service worker falhou.' };
  }
}
