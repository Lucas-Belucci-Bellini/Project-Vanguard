/**
 * Planejador de retomada HTTP para downloads de datasets.
 *
 * Esta camada não faz fetch nem grava bytes. Ela calcula o Range seguro a partir
 * de um checkpoint persistido e valida a resposta antes de aceitar a continuação.
 */

export function criarCheckpointDownload({ datasetId, recebido = 0, total = null, etag = null, lastModified = null } = {}) {
  if (!datasetId || typeof datasetId !== 'string') {
    throw new TypeError('datasetId é obrigatório.');
  }
  if (!Number.isInteger(recebido) || recebido < 0) {
    throw new TypeError('recebido precisa ser um inteiro não negativo.');
  }
  if (total !== null && (!Number.isInteger(total) || total < recebido)) {
    throw new TypeError('total inválido.');
  }
  return Object.freeze({ version: 1, datasetId, recebido, total, etag, lastModified });
}

export function criarRangeRetomada(checkpoint) {
  if (!checkpoint || checkpoint.version !== 1) {
    return { ok: false, codigo: 'CHECKPOINT_INVALIDO' };
  }
  if (checkpoint.recebido <= 0) {
    return { ok: false, codigo: 'RETOMADA_NAO_NECESSARIA', headers: {} };
  }
  const headers = { Range: `bytes=${checkpoint.recebido}-` };
  if (checkpoint.etag) headers['If-Range'] = checkpoint.etag;
  else if (checkpoint.lastModified) headers['If-Range'] = checkpoint.lastModified;
  return { ok: true, headers };
}

export function validarRespostaRetomada(response, checkpoint) {
  if (!response || !checkpoint) return { ok: false, codigo: 'RESPOSTA_RETOMADA_INVALIDA' };
  if (response.status !== 206) {
    return { ok: false, codigo: 'RANGE_NAO_ATENDIDO', status: response.status };
  }

  const contentRange = response.headers?.get?.('content-range') ?? '';
  const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/i.exec(contentRange);
  if (!match) return { ok: false, codigo: 'CONTENT_RANGE_INVALIDO' };

  const inicio = Number(match[1]);
  const fim = Number(match[2]);
  const total = match[3] === '*' ? null : Number(match[3]);
  if (inicio !== checkpoint.recebido || fim < inicio) {
    return { ok: false, codigo: 'RANGE_OFFSET_INCORRETO', inicio, esperado: checkpoint.recebido };
  }
  if (checkpoint.total !== null && total !== null && checkpoint.total !== total) {
    return { ok: false, codigo: 'TOTAL_RETOMADA_DIVERGENTE', total, esperado: checkpoint.total };
  }
  return { ok: true, inicio, fim, total };
}
