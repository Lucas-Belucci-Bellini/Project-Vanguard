/**
 * Consulta das releases publicadas — a API, nunca a página HTML.
 *
 * Item 5 do pedido: "Nunca depender de scraping da página HTML do GitHub."
 * A razão não é estética: o HTML do GitHub muda sem aviso e sem versionamento,
 * então um raspador quebra em silêncio num dia qualquer, e o app volta a não
 * saber de atualização nenhuma — que é exatamente o estado que estamos saindo.
 *
 * ## Toda URL é conferida contra o repositório oficial
 *
 * A resposta da API é dado externo. Um `browser_download_url` apontando para
 * outro host levaria o usuário a baixar um APK de origem desconhecida, e o
 * updater estaria entregando exatamente o ataque que ele deveria evitar. Cada
 * URL passa por `urlOficial` antes de ser oferecida.
 */

import { CANAIS, analisar, canalAceito, canalDaVersao, compararVersoes, versaoDaTag } from './semver.js';

export const ESTADOS = Object.freeze({
  ATUALIZADO: 'ATUALIZADO',
  DISPONIVEL: 'DISPONIVEL',
  VERIFICANDO: 'VERIFICANDO',
  SEM_INTERNET: 'SEM_INTERNET',
  ERRO: 'ERRO',
  NUNCA_VERIFICADO: 'NUNCA_VERIFICADO',
});

/** Aceita só URLs https dentro do repositório oficial. */
export function criarValidadorDeUrl(urlRepositorio) {
  const oficial = new URL(urlRepositorio);
  const prefixo = `${oficial.pathname}/`;
  return function urlOficial(url) {
    if (typeof url !== 'string') return null;
    try {
      const candidata = new URL(url);
      if (candidata.protocol !== 'https:') return null;
      if (candidata.origin !== oficial.origin) return null;
      if (!candidata.pathname.startsWith(prefixo)) return null;
      return candidata.toString();
    } catch {
      return null;
    }
  };
}

/**
 * Normaliza uma release da API para o formato que o resto do updater consome.
 * Devolve `null` para rascunho ou release sem versão legível — não adianta
 * oferecer o que não dá para comparar.
 */
export function normalizarRelease(bruta, { urlOficial }) {
  if (!bruta || typeof bruta !== 'object') return null;
  if (bruta.draft) return null;
  const versao = versaoDaTag(bruta.tag_name);
  if (!versao || !analisar(versao)) return null;

  const ativos = Array.isArray(bruta.assets) ? bruta.assets : [];
  const escolher = (teste) => {
    const achado = ativos.find((a) => typeof a?.name === 'string' && teste(a.name.toLowerCase()));
    if (!achado) return null;
    const url = urlOficial(achado.browser_download_url);
    return url ? { nome: achado.name, url, bytes: Number(achado.size) || null } : null;
  };

  return {
    tag: String(bruta.tag_name),
    versao,
    // `prerelease` da API é uma dica; o canal REAL vem do pré-lançamento da
    // versão. Uma release marcada estável com tag `-beta.1` é beta, e é a tag
    // que descreve o artefato.
    canal: canalDaVersao(versao),
    marcadaPrerelease: Boolean(bruta.prerelease),
    notas: typeof bruta.body === 'string' ? bruta.body : '',
    publicadaEm: typeof bruta.published_at === 'string' ? bruta.published_at : null,
    pagina: urlOficial(bruta.html_url),
    apk: escolher((n) => n.endsWith('.apk')),
    checksums: escolher((n) => n === 'sha256sums'),
    manifesto: escolher((n) => n === 'build-manifest.txt'),
  };
}

/**
 * Lê o `SHA256SUMS` publicado e devolve o hash daquele arquivo.
 *
 * O formato é o do `sha256sum`: `<hash>  <caminho>`. O caminho publicado tem
 * prefixo (`mobile-artifacts/…`), então a comparação é pelo nome do arquivo —
 * casar o caminho inteiro quebraria a cada mudança de diretório na pipeline.
 */
export function hashDoArquivo(textoSha256sums, nomeArquivo) {
  if (typeof textoSha256sums !== 'string' || !nomeArquivo) return null;
  for (const linha of textoSha256sums.split('\n')) {
    const casou = linha.trim().match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (!casou) continue;
    const [, hash, caminho] = casou;
    if (caminho.split('/').pop() === nomeArquivo) return hash.toLowerCase();
  }
  return null;
}

/**
 * Decide o que fazer diante de uma lista de releases.
 *
 * **Nunca propõe downgrade** (item 19): uma release mais antiga que a
 * instalada não é atualização, e oferecer "atualizar" para trás é como se
 * perde uma correção já aplicada.
 */
export function escolherAtualizacao(releases, { versaoInstalada, canal = CANAIS.STABLE }) {
  const candidatas = (Array.isArray(releases) ? releases : [])
    .filter(Boolean)
    .filter((r) => canalAceito(canal, r.canal))
    .sort((a, b) => compararVersoes(b.versao, a.versao));

  const maisNova = candidatas[0] ?? null;
  if (!maisNova) return { estado: ESTADOS.ATUALIZADO, release: null, historico: candidatas };

  const ordem = compararVersoes(maisNova.versao, versaoInstalada);
  return {
    estado: ordem > 0 ? ESTADOS.DISPONIVEL : ESTADOS.ATUALIZADO,
    release: ordem > 0 ? maisNova : null,
    // O histórico sai mesmo quando não há atualização: a tela de Atualizações
    // mostra as versões anteriores, e baixar de novo uma release conhecida é
    // requisito (item 13).
    historico: candidatas,
  };
}
