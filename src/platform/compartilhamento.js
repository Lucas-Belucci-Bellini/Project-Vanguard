export const ESTADOS_COMPARTILHAMENTO = Object.freeze({
  COMPARTILHADO: 'COMPARTILHADO',
  COPIADO: 'COPIADO',
  BAIXADO: 'BAIXADO',
  CANCELADO: 'CANCELADO',
  INDISPONIVEL: 'INDISPONÍVEL',
  FALHA: 'FALHA',
});

function retorno(estado, canal, detalhe) {
  return { estado, canal, detalhe };
}

function textoValido(texto) {
  return typeof texto === 'string' && texto.trim().length > 0;
}

/**
 * Compartilha texto apenas pelo gesto explícito que invoca esta função.
 * A confirmação significa que o sistema aceitou a operação, não que o
 * destinatário recebeu a mensagem.
 */
export async function compartilharTexto({ texto, title = 'Vanguard Field', navigatorApi = globalThis.navigator } = {}) {
  if (!textoValido(texto)) return retorno(ESTADOS_COMPARTILHAMENTO.FALHA, 'NENHUM', 'Texto vazio ou inválido.');

  if (typeof navigatorApi?.share === 'function') {
    try {
      await navigatorApi.share({ title, text: texto });
      return retorno(ESTADOS_COMPARTILHAMENTO.COMPARTILHADO, 'WEB_SHARE', 'O sistema operacional aceitou o texto para compartilhamento.');
    } catch (erro) {
      if (erro?.name === 'AbortError') return retorno(ESTADOS_COMPARTILHAMENTO.CANCELADO, 'WEB_SHARE', 'Compartilhamento cancelado pela pessoa.');
    }
  }

  if (typeof navigatorApi?.clipboard?.writeText === 'function') {
    try {
      await navigatorApi.clipboard.writeText(texto);
      return retorno(ESTADOS_COMPARTILHAMENTO.COPIADO, 'CLIPBOARD', 'Texto copiado para a área de transferência.');
    } catch {
      /* O fallback final mantém a operação local e explícita. */
    }
  }

  return retorno(ESTADOS_COMPARTILHAMENTO.INDISPONIVEL, 'NENHUM', 'Este ambiente não oferece compartilhamento ou clipboard utilizável.');
}

function criarArquivo({ blob, fileName, mimeType, FileCtor }) {
  if (typeof FileCtor !== 'function') return null;
  try {
    return new FileCtor([blob], fileName, { type: mimeType || blob.type || 'application/octet-stream' });
  } catch {
    return null;
  }
}

function baixarArquivo({ blob, fileName, documentApi, urlApi }) {
  if (typeof documentApi?.createElement !== 'function' || typeof urlApi?.createObjectURL !== 'function') return false;
  let url;
  try {
    url = urlApi.createObjectURL(blob);
    const link = documentApi.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    link.click();
    return true;
  } catch {
    return false;
  } finally {
    if (url && typeof urlApi.revokeObjectURL === 'function') urlApi.revokeObjectURL(url);
  }
}

/**
 * Compartilha um arquivo quando o Web Share para arquivos é suportado; caso
 * contrário, tenta o download local. O fallback não promete que o arquivo
 * foi salvo em uma pasta específica do Android/iOS.
 */
export async function compartilharArquivo({
  blob,
  fileName,
  title = 'Vanguard Field',
  texto,
  mimeType,
  navigatorApi = globalThis.navigator,
  documentApi = globalThis.document,
  urlApi = globalThis.URL,
  FileCtor = globalThis.File,
} = {}) {
  if (!blob || !textoValido(fileName)) return retorno(ESTADOS_COMPARTILHAMENTO.FALHA, 'NENHUM', 'Arquivo ou nome inválido.');

  const arquivo = criarArquivo({ blob, fileName, mimeType, FileCtor });
  if (arquivo && typeof navigatorApi?.share === 'function') {
    let suportado = true;
    try {
      suportado = typeof navigatorApi.canShare !== 'function' || navigatorApi.canShare({ files: [arquivo] });
    } catch {
      suportado = false;
    }
    if (suportado) {
      try {
        await navigatorApi.share({ title, text: texto, files: [arquivo] });
        return retorno(ESTADOS_COMPARTILHAMENTO.COMPARTILHADO, 'WEB_SHARE_FILE', 'O sistema operacional aceitou o arquivo para compartilhamento.');
      } catch (erro) {
        if (erro?.name === 'AbortError') return retorno(ESTADOS_COMPARTILHAMENTO.CANCELADO, 'WEB_SHARE_FILE', 'Compartilhamento cancelado pela pessoa.');
      }
    }
  }

  if (baixarArquivo({ blob, fileName, documentApi, urlApi })) {
    return retorno(ESTADOS_COMPARTILHAMENTO.BAIXADO, 'DOWNLOAD', 'Arquivo disponibilizado para download local.');
  }
  return retorno(ESTADOS_COMPARTILHAMENTO.INDISPONIVEL, 'NENHUM', 'Este ambiente não oferece compartilhamento de arquivos nem download utilizável.');
}
