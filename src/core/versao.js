/**
 * Versão do aplicativo, vinda do `package.json` no momento do build.
 *
 * A tela "Sobre" exibia a palavra **PROTÓTIPO** onde deveria estar a versão.
 * Num app que se atualiza por APK, a versão na tela é o que a pessoa usa para
 * saber se o aparelho já recebeu a correção — e "PROTÓTIPO" responde isso em
 * nenhuma versão. O valor é injetado pelo Vite (`define`) a partir do
 * `package.json`, que é a mesma fonte que o `versionName` do Android e o gate
 * do workflow de release conferem: uma fonte só, sem número decorado.
 *
 * Fora do build (em `node --test`) a constante não existe, e aí o honesto é
 * dizer que não sabe — nunca inventar um número.
 */

/* global __APP_VERSION__ */
export const VERSAO_APP = typeof __APP_VERSION__ === 'string' && __APP_VERSION__
  ? __APP_VERSION__
  : null;

/** Rótulo pronto para tela: nunca uma versão inventada. */
export function rotuloDaVersao(versao = VERSAO_APP) {
  return versao ? `v${versao}` : 'VERSÃO INDISPONÍVEL';
}
