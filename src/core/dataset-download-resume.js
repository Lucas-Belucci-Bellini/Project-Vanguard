/**
 * Planejamento e execução de retomada HTTP de downloads de datasets.
 *
 * A camada não ativa o dataset nem decide se uma URL é autorizada.
 */

export function criarCheckpointDownload({ datasetId, recebido = 0, total = null, etag = null, lastModified = null } = {}) {
  if (!datasetId || typeof datasetId !== 'string') throw new TypeError('datasetId é obrigatório.');
  if (!Number.isInteger(recebido) || recebido < 0) throw new TypeError('recebido precisa ser um inteiro não negativo.');
  if (total !== null && (!Number.isInteger(total) || total < recebido)) throw new TypeError('total inválido.');
  return Object.freeze({ version: 1, datasetId, recebido, total, etag, lastModified });
}

export function criarRangeRetomada(checkpoint) {
  if (!checkpoint || checkpoint.version !== 1) return { ok: false, codigo: 'CHECKPOINT_INVALIDO' };
  if (checkpoint.recebido <= 0) return { ok: false, codigo: 'RETOMADA_NAO_NECESSARIA', headers: {} };
  const headers = { Range: `bytes=${checkpoint.recebido}-` };
  if (checkpoint.etag) headers['If-Range'] = checkpoint.etag;
  else if (checkpoint.lastModified) headers['If-Range'] = checkpoint.lastModified;
  return { ok: true, headers };
}

export function validarRespostaRetomada(response, checkpoint) {
  if (!response || !checkpoint) return { ok: false, codigo: 'RESPOSTA_RETOMADA_INVALIDA' };
  if (response.status !== 206) return { ok: false, codigo: 'RANGE_NAO_ATENDIDO', status: response.status };
  const contentRange = response.headers?.get?.('content-range') ?? '';
  const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/i.exec(contentRange);
  if (!match) return { ok: false, codigo: 'CONTENT_RANGE_INVALIDO' };
  const inicio = Number(match[1]);
  const fim = Number(match[2]);
  const total = match[3] === '*' ? null : Number(match[3]);
  if (inicio !== checkpoint.recebido || fim < inicio || (total !== null && fim >= total)) {
    return { ok: false, codigo: 'RANGE_OFFSET_INCORRETO', inicio, esperado: checkpoint.recebido };
  }
  if (checkpoint.total !== null && total !== null && checkpoint.total !== total) {
    return { ok: false, codigo: 'TOTAL_RETOMADA_DIVERGENTE', total, esperado: checkpoint.total };
  }
  return { ok: true, inicio, fim, total };
}

export async function retomarDataset({ fetchImpl = globalThis.fetch, url, checkpoint, bytesStaging, signal = null, onProgress = () => {} } = {}) {
  if (!(bytesStaging instanceof Uint8Array)) return { ok: false, codigo: 'STAGING_BYTES_INVALIDOS' };
  if (!checkpoint || !Number.isInteger(checkpoint.recebido) || checkpoint.recebido < 0) return { ok: false, codigo: 'CHECKPOINT_INVALIDO' };
  if (bytesStaging.byteLength !== checkpoint.recebido) return { ok: false, codigo: 'STAGING_CHECKPOINT_DIVERGENTE' };
  if (typeof fetchImpl !== 'function') return { ok: false, codigo: 'FETCH_INDISPONIVEL' };
  const range = criarRangeRetomada(checkpoint);
  if (!range.ok) return range;

  let response;
  try {
    response = await fetchImpl(url, { headers: range.headers, signal });
  } catch (erro) {
    return { ok: false, codigo: 'RANGE_FETCH_FALHOU', motivo: erro?.message ?? 'Falha ao solicitar retomada.' };
  }

  const validacao = validarRespostaRetomada(response, checkpoint);
  if (!validacao.ok) return validacao;
  const sufixo = new Uint8Array(await response.arrayBuffer());
  const esperado = validacao.fim - validacao.inicio + 1;
  if (sufixo.byteLength !== esperado) return { ok: false, codigo: 'RANGE_CORPO_DIVERGENTE', esperado, recebido: sufixo.byteLength };

  const completo = new Uint8Array(bytesStaging.byteLength + sufixo.byteLength);
  completo.set(bytesStaging, 0);
  completo.set(sufixo, bytesStaging.byteLength);
  onProgress({ recebido: completo.byteLength, total: validacao.total });
  return { ok: true, bytes: completo, sizeBytes: completo.byteLength, total: validacao.total, range: validacao };
}
