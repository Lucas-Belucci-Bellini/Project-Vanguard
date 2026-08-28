/**
 * Costura de retomada HTTP com persistência física.
 * A retomada só altera STAGING. O checkpoint é atualizado depois que o sufixo recebido foi persistido.
 */
import { retomarDataset } from './dataset-download-resume.js';

export async function retomarDatasetPersistente({ fetchImpl = globalThis.fetch, packageStorage, checkpointStorage, datasetId, url, checkpoint, signal = null, onProgress = () => {} } = {}) {
  if (!packageStorage?.lerPacote || !packageStorage?.anexarPacoteStaging) return { ok: false, codigo: 'PACKAGE_STORAGE_INDISPONIVEL', motivo: 'Package Storage compatível com retomada não foi fornecido.' };
  if (!checkpointStorage?.salvar) return { ok: false, codigo: 'CHECKPOINT_STORAGE_INDISPONIVEL', motivo: 'Checkpoint Storage compatível com retomada não foi fornecido.' };
  if (!datasetId || checkpoint?.datasetId !== datasetId) return { ok: false, codigo: 'CHECKPOINT_DATASET_DIVERGENTE', motivo: 'O checkpoint não pertence ao dataset solicitado.' };

  const leitura = await packageStorage.lerPacote(datasetId);
  if (!leitura.ok) return leitura;
  if (!leitura.pacote) return { ok: false, codigo: 'PACKAGE_NOT_FOUND', motivo: 'Não existe STAGING físico para retomar.' };
  if (leitura.pacote.state !== 'STAGING') return { ok: false, codigo: 'PACKAGE_NOT_STAGING', motivo: 'Somente STAGING pode receber bytes de retomada.' };
  if (leitura.pacote.sizeBytes !== checkpoint.recebido) return { ok: false, codigo: 'STAGING_CHECKPOINT_DIVERGENTE', motivo: 'O tamanho físico do STAGING não corresponde ao checkpoint.', stagingBytes: leitura.pacote.sizeBytes, checkpointBytes: checkpoint.recebido };

  const retomada = await retomarDataset({ fetchImpl, url, checkpoint, bytesStaging: leitura.pacote.bytes, signal, onProgress: () => {} });
  if (!retomada.ok) return retomada;

  const sufixo = retomada.bytes.slice(checkpoint.recebido);
  const anexado = await packageStorage.anexarPacoteStaging(datasetId, sufixo, { etag: checkpoint.etag ?? null, lastModified: checkpoint.lastModified ?? null });
  if (!anexado.ok) return { ...anexado, codigo: anexado.codigo ?? 'STAGING_APPEND_FAILED' };

  const novoCheckpoint = { version: 1, datasetId, recebido: retomada.sizeBytes, total: retomada.total ?? checkpoint.total ?? null, etag: checkpoint.etag ?? null, lastModified: checkpoint.lastModified ?? null };
  const salvo = await checkpointStorage.salvar(novoCheckpoint);
  if (!salvo.ok) return { ...salvo, codigo: salvo.codigo ?? 'CHECKPOINT_SAVE_FAILED', persistido: true, sizeBytes: anexado.sizeBytes };

  onProgress({ recebido: novoCheckpoint.recebido, total: novoCheckpoint.total });
  return { ok: true, datasetId, sizeBytes: anexado.sizeBytes, checkpoint: salvo.checkpoint ?? novoCheckpoint, pacote: anexado };
}
