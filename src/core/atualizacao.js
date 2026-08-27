/**
 * Regras locais para identificar versões novas sem instalar nada automaticamente.
 * O APK não pode substituir a si próprio; no nativo, a ação abre a página da
 * release e deixa o instalador do sistema pedir confirmação ao usuário.
 */

import { CONFIGURACAO_APLICATIVO, CONFIGURACAO_ATUALIZACAO } from './configuracao.js';

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

function partesVersao(valor) {
  const texto = String(valor ?? '').trim().replace(/^v/i, '');
  const [base, pre = ''] = texto.split('-', 2);
  const numeros = base.split('.').map((parte) => Number.parseInt(parte, 10));
  if (numeros.length !== 3 || numeros.some((numero) => !Number.isInteger(numero) || numero < 0)) return null;
  return { numeros, pre };
}

/** Retorna 1 se a > b, -1 se a < b e 0 se iguais; inválidos ficam abaixo. */
export function compararVersoes(a, b) {
  const esquerda = partesVersao(a);
  const direita = partesVersao(b);
  if (!esquerda && !direita) return 0;
  if (!esquerda) return -1;
  if (!direita) return 1;
  for (let indice = 0; indice < 3; indice += 1) {
    if (esquerda.numeros[indice] !== direita.numeros[indice]) {
      return esquerda.numeros[indice] > direita.numeros[indice] ? 1 : -1;
    }
  }
  if (esquerda.pre === direita.pre) return 0;
  if (!esquerda.pre) return 1;
  if (!direita.pre) return -1;
  return esquerda.pre.localeCompare(direita.pre, 'en', { numeric: true });
}

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
