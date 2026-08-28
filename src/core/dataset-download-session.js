/**
 * Sessão de download do dataset.
 *
 * Mantém o adapter de rede separado do ciclo de vida do dataset. A sessão
 * controla apenas a execução, progresso e cancelamento; não ativa pacote,
 * não altera manifesto e não decide se uma fonte pode ser redistribuída.
 */

import { criarDownloaderDataset } from './dataset-download.js';

export function criarSessaoDownloadDataset({
  downloader = null,
  maxBytes = null,
  onProgress = () => {},
} = {}) {
  const backend = downloader ?? criarDownloaderDataset({ maxBytes });
  let estado = 'IDLE';
  let resultado = null;
  let controlador = null;

  return {
    estado: () => estado,
    resultado: () => resultado,

    async iniciar(response, { signal = null } = {}) {
      if (estado === 'DOWNLOADING') {
        return { ok: false, codigo: 'DOWNLOAD_EM_ANDAMENTO', motivo: 'Já existe um download em andamento.' };
      }

      estado = 'DOWNLOADING';
      resultado = null;
      controlador = signal;

      const final = await backend.baixar(response, {
        signal,
        onProgress,
      });

      resultado = final;
      estado = final.ok ? 'COMPLETED' : (final.codigo === 'DOWNLOAD_CANCELADO' ? 'CANCELLED' : 'FAILED');
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
      return { ok: true };
    },
  };
}
