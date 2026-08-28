/**
 * Sessão de download do dataset.
 *
 * Mantém rede, checkpoint e ciclo de vida do dataset separados. A sessão
 * controla execução, progresso, cancelamento e checkpoint; não ativa pacote,
 * não altera manifesto e não decide se uma fonte pode ser redistribuída.
 */

import { criarDownloaderDataset } from './dataset-download.js';
import { criarCheckpointStorage } from './dataset-download-checkpoint-storage.js';

export function criarSessaoDownloadDataset({
  downloader = null,
  checkpointStorage = null,
  maxBytes = null,
  onProgress = () => {},
} = {}) {
  const backend = downloader ?? criarDownloaderDataset({ maxBytes });
  const checkpoints = checkpointStorage ?? criarCheckpointStorage();
  let estado = 'IDLE';
  let resultado = null;
  let controlador = null;
  let datasetAtual = null;

  const salvarCheckpoint = async (evento, metadata = {}) => {
    if (!datasetAtual || !checkpoints?.salvar) return { ok: true, ignorado: true };
    return checkpoints.salvar({
      version: 1,
      datasetId: datasetAtual,
      recebido: evento.recebido,
      total: evento.total,
      etag: metadata.etag ?? null,
      lastModified: metadata.lastModified ?? null,
    });
  };

  return {
    estado: () => estado,
    resultado: () => resultado,

    async checkpoint(datasetId) {
      if (!checkpoints?.ler) return { ok: false, codigo: 'CHECKPOINT_STORAGE_INDISPONIVEL' };
      return checkpoints.ler(datasetId);
    },

    async iniciar(response, { signal = null, datasetId = null, metadata = {} } = {}) {
      if (estado === 'DOWNLOADING') {
        return { ok: false, codigo: 'DOWNLOAD_EM_ANDAMENTO', motivo: 'Já existe um download em andamento.' };
      }
      if (datasetId !== null && (typeof datasetId !== 'string' || !datasetId.trim())) {
        return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId precisa ser uma string não vazia.' };
      }

      estado = 'DOWNLOADING';
      resultado = null;
      controlador = signal;
      datasetAtual = datasetId;

      const progresso = async (evento) => {
        onProgress(evento);
        await salvarCheckpoint(evento, metadata);
      };

      const final = await backend.baixar(response, {
        signal,
        onProgress: progresso,
      });

      resultado = final;
      estado = final.ok ? 'COMPLETED' : (final.codigo === 'DOWNLOAD_CANCELADO' ? 'CANCELLED' : 'FAILED');

      if (datasetAtual && final.ok && checkpoints?.remover) {
        await checkpoints.remover(datasetAtual);
      }
      controlador = null;
      return final;
    },

    cancelar() {
      if (estado !== 'DOWNLOADING') {
        return { ok: false, codigo: 'DOWNLOAD_NAO_ATIVO', motivo: 'Não há download ativo para cancelar.' };
      }
      if (!controlador || typeof controlador.abort !== 'function') {
        return { ok: false, codigo: 'SINAL_CANCELAMENTO_INDISPONIVEL', motivo: 'A sessão foi iniciada sem AbortController/AbortSignal controlável.' };
      }
      controlador.abort();
      return { ok: true, estado: 'CANCELLING' };
    },

    limpar() {
      if (estado === 'DOWNLOADING') {
        return { ok: false, codigo: 'DOWNLOAD_EM_ANDAMENTO', motivo: 'Finalize ou cancele o download antes de limpar a sessão.' };
      }
      estado = 'IDLE';
      resultado = null;
      controlador = null;
      datasetAtual = null;
      return { ok: true };
    },
  };
}
