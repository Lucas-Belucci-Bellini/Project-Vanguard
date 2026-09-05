/**
 * Download do artefato e verificação de integridade.
 *
 * ## A regra que governa este arquivo
 *
 * Item 11 do pedido: *"Não instalar um APK simplesmente porque o download
 * terminou."* Um download que completou prova que os bytes chegaram, não que
 * são os bytes certos — proxy que injeta, CDN que serve versão errada, disco
 * que corrompe, e o caso que importa, alguém trocando o arquivo no caminho.
 *
 * Por isso o resultado só é entregue como **válido** depois de o SHA-256
 * calculado bater com o publicado. Quando não bate, o arquivo é descartado e o
 * erro é dito — nunca se entrega o material duvidoso "para o usuário decidir",
 * porque o usuário não tem como decidir isso.
 *
 * O módulo não toca DOM e recebe `fetch` e `crypto` por parâmetro: é o que
 * permite testar o caminho do checksum inválido sem rede.
 */

export const RESULTADO_DOWNLOAD = Object.freeze({
  OK: 'OK',
  CANCELADO: 'CANCELADO',
  ERRO_REDE: 'ERRO_REDE',
  CHECKSUM_INVALIDO: 'CHECKSUM_INVALIDO',
  SEM_CHECKSUM: 'SEM_CHECKSUM',
});

/** SHA-256 em hexadecimal minúsculo. */
export async function sha256Hex(bytes, cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.subtle) throw new Error('SubtleCrypto indisponível: não dá para verificar a integridade.');
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Baixa com progresso. `onProgresso({recebidos, total, fracao})` é chamado
 * conforme os pedaços chegam; `total` pode ser `null` quando o servidor não
 * informa tamanho — nesse caso `fracao` também é `null`, e a interface mostra
 * atividade em vez de porcentagem. Inventar uma porcentagem que não se conhece
 * é pior que não mostrar nenhuma.
 */
export async function baixarComProgresso(url, {
  fetchApi = globalThis.fetch,
  sinal = null,
  onProgresso = () => {},
} = {}) {
  const resposta = await fetchApi(url, { signal: sinal, cache: 'no-store' });
  if (!resposta.ok) {
    const erro = new Error(`o servidor respondeu ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }

  const cabecalho = Number(resposta.headers?.get?.('content-length'));
  const total = Number.isFinite(cabecalho) && cabecalho > 0 ? cabecalho : null;

  // Sem corpo legível em pedaços (ambiente de teste, resposta opaca), cai para
  // o caminho simples: os bytes chegam de uma vez e o progresso vai a 100%.
  if (!resposta.body?.getReader) {
    const buffer = new Uint8Array(await resposta.arrayBuffer());
    onProgresso({ recebidos: buffer.byteLength, total: total ?? buffer.byteLength, fracao: 1 });
    return buffer;
  }

  const leitor = resposta.body.getReader();
  const pedacos = [];
  let recebidos = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    pedacos.push(value);
    recebidos += value.byteLength;
    onProgresso({ recebidos, total, fracao: total ? recebidos / total : null });
  }

  const bytes = new Uint8Array(recebidos);
  let offset = 0;
  for (const pedaco of pedacos) { bytes.set(pedaco, offset); offset += pedaco.byteLength; }
  return bytes;
}

/**
 * Baixa e **só devolve OK se o checksum bater**.
 *
 * Sem checksum publicado o resultado é `SEM_CHECKSUM`, não OK: a ausência da
 * verificação é informação que a interface precisa mostrar, e não algo a
 * silenciar tratando como sucesso.
 */
export async function baixarEVerificar(release, {
  fetchApi = globalThis.fetch,
  cryptoApi = globalThis.crypto,
  sinal = null,
  onProgresso = () => {},
} = {}) {
  if (!release?.apk?.url) {
    return { resultado: RESULTADO_DOWNLOAD.ERRO_REDE, erro: 'a release não traz um APK para baixar' };
  }

  let esperado = null;
  if (release.checksums?.url) {
    try {
      const resposta = await fetchApi(release.checksums.url, { signal: sinal, cache: 'no-store' });
      if (resposta.ok) {
        const { hashDoArquivo } = await import('./releases.js');
        esperado = hashDoArquivo(await resposta.text(), release.apk.nome);
      }
    } catch {
      /* Falhar ao ler o checksum não é falha de download; vira SEM_CHECKSUM. */
    }
  }

  let bytes;
  try {
    bytes = await baixarComProgresso(release.apk.url, { fetchApi, sinal, onProgresso });
  } catch (erro) {
    // Cancelamento é escolha do usuário, não defeito — a interface trata
    // diferente, então o resultado precisa distinguir.
    if (erro?.name === 'AbortError' || sinal?.aborted) {
      return { resultado: RESULTADO_DOWNLOAD.CANCELADO };
    }
    return { resultado: RESULTADO_DOWNLOAD.ERRO_REDE, erro: String(erro?.message ?? erro) };
  }

  if (!esperado) {
    return { resultado: RESULTADO_DOWNLOAD.SEM_CHECKSUM, bytes, bytesTotal: bytes.byteLength };
  }

  const obtido = await sha256Hex(bytes, cryptoApi);
  if (obtido !== esperado) {
    // O arquivo é descartado aqui: não devolvemos os bytes. Quem chama não
    // tem como instalar por engano o que não passou na verificação.
    return { resultado: RESULTADO_DOWNLOAD.CHECKSUM_INVALIDO, esperado, obtido };
  }

  return { resultado: RESULTADO_DOWNLOAD.OK, bytes, bytesTotal: bytes.byteLength, sha256: obtido };
}
