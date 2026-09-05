/**
 * Regras locais para identificar versões novas sem instalar nada automaticamente.
 * O APK não pode substituir a si próprio; no nativo, a ação abre a página da
 * release e deixa o instalador do sistema pedir confirmação ao usuário.
 */

import { CONFIGURACAO_APLICATIVO, CONFIGURACAO_ATUALIZACAO } from './configuracao.js';
import { compararVersoes } from './updater/semver.js';

export const VERSAO_ATUAL = CONFIGURACAO_APLICATIVO.versao;
export const URL_RELEASES = CONFIGURACAO_ATUALIZACAO.urlReleases;
export const URL_RELEASE_MAIS_RECENTE = CONFIGURACAO_ATUALIZACAO.urlReleaseMaisRecente;
const ORIGEM_GITHUB = new URL(CONFIGURACAO_APLICATIVO.urlRepositorio);
const CAMINHO_REPOSITORIO_OFICIAL = `${ORIGEM_GITHUB.pathname}/`;

function urlOficial(url) {
  if (typeof url !== 'string') return null;
  try {
    const candidata = new URL(url);
    if (candidata.protocol !== 'https:' || candidata.origin !== ORIGEM_GITHUB.origin || !candidata.pathname.startsWith(CAMINHO_REPOSITORIO_OFICIAL)) return null;
    return candidata.toString();
  } catch {
    return null;
  }
}

/*
 * A comparação de versões mora em `updater/semver.js`.
 *
 * A versão anterior vivia aqui e tinha um defeito total: fazia
 * `replace(/^v/i, '')` e depois `split('-', 2)`. Com as tags reais deste
 * projeto — `mobile-v1.4.4` — o replace não casava e o split cortava no
 * primeiro hífen, então a base virava `"mobile"`. Não são três números, a
 * versão era classificada como INVÁLIDA, e inválida fica abaixo de tudo.
 *
 * Medido: `releaseMaisNova({tag_name:'mobile-v1.4.4'}, '1.0.0')` devolvia
 * `false`. O aplicativo nunca detectou uma atualização, em nenhuma versão
 * publicada — era por isso que descobrir versão nova exigia abrir o GitHub.
 *
 * Delegar em vez de manter duas implementações é o ponto: duas regras de
 * comparação divergem em silêncio, e a divergência aqui significa o botão do
 * cabeçalho e a tela de Atualizações discordarem sobre haver versão nova.
 */
export { compararVersoes };

export function releaseMaisNova(release, versaoAtual = VERSAO_ATUAL) {
  if (!release || typeof release !== 'object' || release.draft || !release.tag_name) return false;
  return compararVersoes(release.tag_name, versaoAtual) > 0;
}

export function nomeVersao(release) {
  if (!release || typeof release !== 'object') return null;
  const tag = typeof release.tag_name === 'string' ? release.tag_name.trim() : '';
  return tag || null;
}

export function urlDownload(release) {
  if (!release || typeof release !== 'object') return URL_RELEASES;
  const apk = Array.isArray(release.assets)
    ? release.assets.find((asset) => typeof asset?.name === 'string' && asset.name.toLowerCase().endsWith('.apk'))
    : null;
  const downloadOficial = urlOficial(apk?.browser_download_url);
  if (downloadOficial) return downloadOficial;
  return urlOficial(release.html_url) || URL_RELEASES;
}
