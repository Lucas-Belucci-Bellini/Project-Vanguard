import { reconciliarPacoteDownload, descartarCheckpointOrfao } from './dataset-package-recovery.js';
import { criarPackageStorage } from './dataset-package-storage.js';
import { criarCheckpointStorage } from './dataset-download-checkpoint-storage.js';
import { criarStorageDataset } from './dataset-storage.js';

/**
 * Reconcilia artefatos físicos pendentes no início da aplicação.
 * A transação persistida identifica o dataset em atualização; manifesto ativo
 * nunca é usado para adivinhar uma retomada e permanece intocado.
 */
export async function recuperarDatasetNoBoot({
  datasetStorage = criarStorageDataset(),
  packageStorage = criarPackageStorage(),
  checkpointStorage = criarCheckpointStorage(),
  reconciliar = reconciliarPacoteDownload,
  removerCheckpointOrfao = descartarCheckpointOrfao,
} = {}) {
  const transacao = datasetStorage.lerTransacao();
  if (!transacao.ok) return { ok: false, fase: 'TRANSACTION_READ', resultado: transacao };

  const pendente = transacao.valor;
  if (!pendente?.datasetId) {
    return { ok: true, estado: 'NO_PENDING_DATASET', manifestoAtivo: datasetStorage.lerAtivo() };
  }

  const reconciliacao = await reconciliar({ packageStorage, checkpointStorage, datasetId: pendente.datasetId });
  if (!reconciliacao.ok) return { ok: false, fase: 'PACKAGE_RECONCILIATION', datasetId: pendente.datasetId, resultado: reconciliacao };

  let checkpointOrfaoRemovido = false;
  if (reconciliacao.estado === 'CHECKPOINT_ORPHAN') {
    const removido = await removerCheckpointOrfao({ checkpointStorage, datasetId: pendente.datasetId });
    if (!removido.ok) return { ok: false, fase: 'ORPHAN_CHECKPOINT_CLEANUP', datasetId: pendente.datasetId, resultado: removido };
    checkpointOrfaoRemovido = true;
  }

  return { ok: true, estado: reconciliacao.estado, datasetId: pendente.datasetId, checkpointOrfaoRemovido, transacaoEstado: pendente.estado };
}
