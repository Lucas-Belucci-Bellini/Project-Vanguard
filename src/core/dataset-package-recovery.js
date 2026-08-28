/**
 * Reconciliação física de pacote + checkpoint após interrupção.
 *
 * Esta camada não ativa datasets. Ela apenas remove estados físicos que não
 * podem ser retomados com segurança e preserva STAGING quando pacote e
 * checkpoint concordam.
 */

export async function reconciliarPacoteDownload({ packageStorage, checkpointStorage, datasetId } = {}) {
  if (!packageStorage?.lerPacote || !packageStorage?.removerPacote) {
    return { ok: false, codigo: 'PACKAGE_STORAGE_INDISPONIVEL', motivo: 'Package Storage não fornece operações de reconciliação.' };
  }
  if (!checkpointStorage?.ler) {
    return { ok: false, codigo: 'CHECKPOINT_STORAGE_INDISPONIVEL', motivo: 'Checkpoint Storage não fornece leitura para reconciliação.' };
  }
  if (typeof datasetId !== 'string' || datasetId.trim().length === 0) {
    return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' };
  }

  const [pacoteResult, checkpointResult] = await Promise.all([
    packageStorage.lerPacote(datasetId),
    checkpointStorage.ler(datasetId),
  ]);
  if (!pacoteResult.ok) return pacoteResult;
  if (!checkpointResult.ok) return checkpointResult;

  const pacote = pacoteResult.pacote ?? null;
  const checkpoint = checkpointResult.checkpoint ?? null;

  if (!pacote && !checkpoint) return { ok: true, estado: 'CLEAN', datasetId };

  // ACTIVE nunca é apagado por esta reconciliação. O pacote ativo pertence ao
  // estado publicado; um checkpoint órfão pode ser removido separadamente.
  if (pacote?.state === 'ACTIVE') {
    return {
      ok: true,
      estado: 'ACTIVE_PRESERVED',
      datasetId,
      pacoteState: pacote.state,
      checkpoint,
    };
  }

  if (pacote && pacote.state !== 'STAGING') {
    return { ok: false, codigo: 'PACKAGE_STATE_INVALIDO', motivo: 'Pacote físico possui estado desconhecido.', estado: pacote.state };
  }

  if (pacote && checkpoint) {
    if (pacote.sizeBytes !== checkpoint.recebido) {
      const removido = await packageStorage.removerPacote(datasetId);
      if (!removido.ok) return removido;
      return {
        ok: true,
        estado: 'STAGING_DISCARDED_DIVERGENT',
        datasetId,
        motivo: 'STAGING e checkpoint divergiam; o STAGING incompleto foi descartado.',
        stagingBytes: pacote.sizeBytes,
        checkpointBytes: checkpoint.recebido,
      };
    }
    return { ok: true, estado: 'STAGING_RESUMABLE', datasetId, stagingBytes: pacote.sizeBytes, checkpoint };
  }

  if (pacote && !checkpoint) {
    const removido = await packageStorage.removerPacote(datasetId);
    if (!removido.ok) return removido;
    return { ok: true, estado: 'STAGING_DISCARDED_ORPHAN', datasetId, motivo: 'STAGING sem checkpoint não pode ser retomado com segurança.' };
  }

  // Checkpoint sem bytes físicos é preservado: ele não prova que o conteúdo
  // existe, mas pode ser usado para diagnóstico. A retomada exige STAGING.
  return { ok: true, estado: 'CHECKPOINT_ORPHAN', datasetId, checkpoint };
}

export async function descartarCheckpointOrfao({ checkpointStorage, datasetId } = {}) {
  if (!checkpointStorage?.remover) return { ok: false, codigo: 'CHECKPOINT_STORAGE_INDISPONIVEL', motivo: 'Checkpoint Storage não fornece remoção.' };
  if (typeof datasetId !== 'string' || datasetId.trim().length === 0) return { ok: false, codigo: 'DATASET_ID_INVALIDO', motivo: 'datasetId é obrigatório.' };
  return checkpointStorage.remover(datasetId);
}
