/**
 * Regras locais para identificar versões novas sem instalar nada automaticamente.
 * O APK não pode substituir a si próprio; no nativo, a ação abre a página da
 * release e deixa o instalador do sistema pedir confirmação ao usuário.
 */

export const VERSAO_ATUAL = '1.0.0';
export const URL_RELEASES = 'https://github.com/Lucas-Belucci-Bellini/Project-Vanguard/releases';
export const URL_RELEASE_MAIS_RECENTE = 'https://api.github.com/repos/Lucas-Belucci-Bellini/Project-Vanguard/releases/latest';

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
  if (typeof apk?.browser_download_url === 'string' && apk.browser_download_url.startsWith('https://')) {
    return apk.browser_download_url;
  }
  return typeof release.html_url === 'string' && release.html_url.startsWith('https://')
    ? release.html_url
    : URL_RELEASES;
}
