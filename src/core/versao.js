/**
 * Identidade do que está rodando: versão, commit e identificador de build.
 *
 * ## Por que isto existe
 *
 * A tela "Sobre" exibia a palavra **PROTÓTIPO** onde deveria estar a versão.
 * Num app que se atualiza por APK, a versão na tela é o que a pessoa usa para
 * saber se o aparelho já recebeu a correção.
 *
 * Depois veio um caso pior, e é o motivo do commit e do identificador de build
 * estarem aqui: **o site mostrava páginas que o aplicativo não tinha**. A
 * investigação levou horas porque não havia como perguntar ao aparelho "que
 * bundle é este?". Agora há: `#/diagnostico` mostra versão, commit e build, e
 * comparar com a release é leitura de tela.
 *
 * Os três valores são injetados pelo Vite (`define`) a partir do `package.json`
 * e do git — a mesma fonte que o `versionName` do Android e o gate do workflow
 * conferem. Nada aqui é segredo: o SHA é público.
 *
 * Fora do build (em `node --test`) as constantes não existem, e aí o honesto é
 * dizer que não sabe — nunca inventar um número.
 */

/* global __APP_VERSION__, __BUILD_COMMIT__, __BUILD_ID__ */

function injetado(valor) {
  return typeof valor === 'string' && valor ? valor : null;
}

export const VERSAO_APP = injetado(typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null);
export const COMMIT_BUILD = injetado(typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : null);

/**
 * Identificador único do build: `versao+commit.AAAAMMDDHHMM`.
 *
 * É ele que versiona o cache do service worker. Um build novo produz um
 * identificador novo, o SW é registrado numa URL nova, o cache antigo é
 * apagado no `activate` — e o aplicativo deixa de poder rodar um bundle velho
 * por tempo indeterminado.
 */
export const BUILD_ID = injetado(typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : null);

/** Rótulo pronto para tela: nunca uma versão inventada. */
export function rotuloDaVersao(versao = VERSAO_APP) {
  return versao ? `v${versao}` : 'VERSÃO INDISPONÍVEL';
}

/** `true` quando o app está rodando dentro do APK/IPA, não no navegador. */
export function ehNativo(capacitorApi = globalThis.Capacitor) {
  try {
    return capacitorApi?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * Onde este bundle está rodando, do ponto de vista de quem depura.
 * A origem entra de propósito: `http://localhost` é a WebView do Capacitor com
 * `useLegacyBridge`, e foi justamente o protocolo dela que impediu o service
 * worker de registrar no aplicativo por quatro versões.
 */
export function ambienteDeExecucao({
  capacitorApi = globalThis.Capacitor,
  janela = typeof window !== 'undefined' ? window : null,
} = {}) {
  const nativo = ehNativo(capacitorApi);
  let plataforma = 'web';
  try {
    plataforma = capacitorApi?.getPlatform?.() ?? 'web';
  } catch {
    plataforma = 'web';
  }
  return {
    nativo,
    plataforma,
    origem: janela?.location?.origin ?? null,
    protocolo: janela?.location?.protocol ?? null,
    contextoSeguro: janela?.isSecureContext === true,
    agente: janela?.navigator?.userAgent ?? null,
  };
}

/**
 * Resumo de identidade, pronto para a tela de diagnóstico.
 * Cada campo ausente aparece como `null` para o chamador dizer INDISPONÍVEL —
 * nenhum valor é preenchido por conveniência.
 */
export function identidadeDoBuild(opcoes = {}) {
  const ambiente = ambienteDeExecucao(opcoes);
  return {
    versao: VERSAO_APP,
    commit: COMMIT_BUILD,
    build: BUILD_ID,
    ...ambiente,
  };
}
