/**
 * Adapter de download para pacotes de dataset.
 *
 * Responsabilidade deliberadamente pequena: consumir um Response/ReadableStream,
 * controlar cancelamento e progresso e devolver bytes completos ao orquestrador.
 * Não conhece catálogo de fontes, manifesto, storage ou ativação.
 *
 * O adapter não autoriza nenhuma URL por conta própria. A camada chamadora deve
 * decidir se a origem é permitida e se o pacote pode ser redistribuído offline.
 */

function falha(codigo, motivo, extra = {}) {
  return { ok: false, codigo, motivo, ...extra };
}

function tamanhoValido(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

export async function baixarDataset(response, {
  onProgress = () => {},
  signal = null,
  maxBytes = null,
} = {}) {
  if (!response || typeof response !== 'object') {
    return falha('DOWNLOAD_RESPONSE_INVALIDO', 'É necessário fornecer um Response válido.');
  }
  if (!response.ok) {
    return falha('DOWNLOAD_HTTP', `Download recusado com status HTTP ${response.status}.`, { status: response.status });
  }
  if (!response.body || typeof response.body.getReader !== 'function') {
    return falha('DOWNLOAD_STREAM_INDISPONIVEL', 'A resposta não fornece ReadableStream.');
  }
  if (maxBytes !== null && !tamanhoValido(maxBytes)) {
    return falha('MAX_BYTES_INVALIDO', 'maxBytes precisa ser um inteiro não negativo ou null.');
  }

  const total = Number(response.headers?.get?.('content-length')) || null;
  if (total !== null && maxBytes !== null && total > maxBytes) {
    return falha('DOWNLOAD_LIMITE', 'O tamanho declarado excede o limite permitido.', { total, maxBytes });
  }

  const reader = response.body.getReader();
  const partes = [];
  let recebido = 0;

  const emitir = () => {
    const percentual = total ? Math.min(100, (recebido / total) * 100) : null;
    onProgress({ recebido, total, percentual });
  };

  emitir();

  try {
    while (true) {
      if (signal?.aborted) {
        try { await reader.cancel(); } catch {}
        return falha('DOWNLOAD_CANCELADO', 'O download foi cancelado.', { recebido, total });
      }

      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      recebido += value.byteLength;
      if (maxBytes !== null && recebido > maxBytes) {
        try { await reader.cancel(); } catch {}
        return falha('DOWNLOAD_LIMITE', 'O download excedeu o limite permitido.', { recebido, total, maxBytes });
      }
      partes.push(new Uint8Array(value));
      emitir();
    }
  } catch (erro) {
    return falha('DOWNLOAD_FALHOU', erro?.message ?? 'Falha durante a leitura do stream.', { recebido, total });
  }

  if (total !== null && recebido !== total) {
    return falha('DOWNLOAD_INCOMPLETO', 'O stream terminou antes do tamanho declarado.', { recebido, total });
  }

  const bytes = new Uint8Array(recebido);
  let offset = 0;
  for (const parte of partes) {
    bytes.set(parte, offset);
    offset += parte.byteLength;
  }
  emitir();
  return { ok: true, bytes, sizeBytes: bytes.byteLength, total, progresso: 100 };
}

export function criarDownloaderDataset(opcoes = {}) {
  return {
    baixar: (response, configuracao = {}) => baixarDataset(response, { ...opcoes, ...configuracao }),
  };
}
