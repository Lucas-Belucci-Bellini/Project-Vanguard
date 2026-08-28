import { normalizarManifestoDataset } from './dataset-manifest.js';

export const ESTADOS_SYNC_DATASET = Object.freeze({
  IDLE: 'IDLE',
  CHECKING: 'CHECKING',
  AVAILABLE: 'AVAILABLE',
  DOWNLOADING: 'DOWNLOADING',
  VERIFYING: 'VERIFYING',
  STAGING: 'STAGING',
  ACTIVATING: 'ACTIVATING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
  ROLLED_BACK: 'ROLLED_BACK',
  CANCELLED: 'CANCELLED',
});

const TERMINAIS = new Set([
  ESTADOS_SYNC_DATASET.COMPLETE,
  ESTADOS_SYNC_DATASET.ROLLED_BACK,
  ESTADOS_SYNC_DATASET.CANCELLED,
]);

const TRANSICOES = Object.freeze({
  [ESTADOS_SYNC_DATASET.IDLE]: [ESTADOS_SYNC_DATASET.CHECKING, ESTADOS_SYNC_DATASET.CANCELLED],
  [ESTADOS_SYNC_DATASET.CHECKING]: [ESTADOS_SYNC_DATASET.AVAILABLE, ESTADOS_SYNC_DATASET.FAILED, ESTADOS_SYNC_DATASET.CANCELLED],
  [ESTADOS_SYNC_DATASET.AVAILABLE]: [ESTADOS_SYNC_DATASET.DOWNLOADING, ESTADOS_SYNC_DATASET.CANCELLED],
  [ESTADOS_SYNC_DATASET.DOWNLOADING]: [ESTADOS_SYNC_DATASET.VERIFYING, ESTADOS_SYNC_DATASET.FAILED, ESTADOS_SYNC_DATASET.CANCELLED],
  [ESTADOS_SYNC_DATASET.VERIFYING]: [ESTADOS_SYNC_DATASET.STAGING, ESTADOS_SYNC_DATASET.FAILED, ESTADOS_SYNC_DATASET.CANCELLED],
  [ESTADOS_SYNC_DATASET.STAGING]: [ESTADOS_SYNC_DATASET.ACTIVATING, ESTADOS_SYNC_DATASET.FAILED, ESTADOS_SYNC_DATASET.CANCELLED],
  [ESTADOS_SYNC_DATASET.ACTIVATING]: [ESTADOS_SYNC_DATASET.COMPLETE, ESTADOS_SYNC_DATASET.FAILED],
  [ESTADOS_SYNC_DATASET.FAILED]: [ESTADOS_SYNC_DATASET.ROLLED_BACK],
});

function copiar(valor) {
  if (valor == null || typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) return valor.map(copiar);
  return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, copiar(item)]));
}

function dataIso(agora) {
  const valor = Number(agora);
  return Number.isFinite(valor) ? new Date(valor).toISOString() : new Date().toISOString();
}

function somaTamanhos(manifesto) {
  return manifesto.regions.reduce((total, regiao) => total + regiao.sizeBytes, 0);
}

function resultadoFalha(codigo, motivo, transacao = null) {
  return { ok: false, codigo, motivo, transacao: transacao ? copiar(transacao) : null };
}

export function transacaoDatasetEmAndamento(transacao) {
  return Boolean(transacao && !TERMINAIS.has(transacao.estado));
}

export function criarTransacaoDataset({ ativo = null, manifesto, transacaoAtiva = null, agora = Date.now() } = {}) {
  if (transacaoDatasetEmAndamento(transacaoAtiva)) {
    return resultadoFalha('ATUALIZACAO_EM_ANDAMENTO', 'Já existe uma atualização do dataset em andamento.');
  }

  const normalizado = normalizarManifestoDataset(manifesto);
  if (!normalizado.valido) {
    return resultadoFalha('MANIFESTO_INVALIDO', 'O manifesto não pode iniciar uma transação.', { ...normalizado, manifesto: null });
  }

  const novo = normalizado.manifesto;
  if (ativo?.datasetId && ativo.datasetId !== novo.datasetId) {
    return resultadoFalha('DATASET_ID_DIVERGENTE', 'O dataset novo não corresponde ao dataset ativo.');
  }
  if (ativo?.version === novo.version) {
    return resultadoFalha('SEM_ATUALIZACAO', 'A versão nova é igual à versão ativa.');
  }

  const transacao = {
    id: `${novo.datasetId}:${novo.version}`,
    datasetId: novo.datasetId,
    estado: ESTADOS_SYNC_DATASET.IDLE,
    ativo: copiar(ativo),
    novo: copiar(novo),
    staging: null,
    bytesRecebidos: 0,
    totalBytes: somaTamanhos(novo),
    tentativas: 0,
    iniciadoEm: dataIso(agora),
    concluidoEm: null,
    erro: null,
  };
  return { ok: true, transacao };
}

export function transicionarDataset(transacao, proximoEstado, detalhes = {}) {
  if (!transacao || !Object.hasOwn(ESTADOS_SYNC_DATASET, proximoEstado)) {
    return resultadoFalha('TRANSACAO_INVALIDA', 'Transação ou estado de destino inválido.', transacao);
  }
  if (TERMINAIS.has(transacao.estado)) {
    return resultadoFalha('TRANSACAO_FINALIZADA', 'Uma transação finalizada não pode mudar de estado.', transacao);
  }
  if (!TRANSICOES[transacao.estado]?.includes(proximoEstado)) {
    return resultadoFalha('TRANSICAO_INVALIDA', `Não é permitido mudar de ${transacao.estado} para ${proximoEstado}.`, transacao);
  }
  const atualizacoes = copiar(detalhes);
  delete atualizacoes.estado;
  const seguinte = {
    ...copiar(transacao),
    ...atualizacoes,
    estado: proximoEstado,
  };
  return { ok: true, transacao: seguinte };
}

export function falharTransacaoDataset(transacao, { codigo = 'ERRO_ATUALIZACAO', motivo = 'A atualização falhou.', tentativas = null } = {}) {
  if (!transacao || TERMINAIS.has(transacao.estado) || transacao.estado === ESTADOS_SYNC_DATASET.FAILED) {
    return resultadoFalha('TRANSACAO_FINALIZADA', 'Não é possível registrar falha neste estado.', transacao);
  }
  const seguinte = {
    ...copiar(transacao),
    estado: ESTADOS_SYNC_DATASET.FAILED,
    erro: { codigo, motivo },
    tentativas: tentativas == null ? Number(transacao.tentativas ?? 0) : Math.max(0, Number(tentativas) || 0),
  };
  return { ok: true, transacao: seguinte };
}

export function verificarPacoteDataset(transacao, { bytes, checksum, verificadoEm = Date.now() } = {}) {
  if (transacao?.estado !== ESTADOS_SYNC_DATASET.VERIFYING) {
    return resultadoFalha('ESTADO_INVALIDO', 'O pacote só pode ser verificado no estado VERIFYING.', transacao);
  }
  const bytesRecebidos = Number(bytes);
  if (!Number.isInteger(bytesRecebidos) || bytesRecebidos < 0 || bytesRecebidos !== transacao.totalBytes) {
    return falharTransacaoDataset(transacao, {
      codigo: 'TAMANHO_INVALIDO',
      motivo: 'O tamanho recebido não corresponde ao tamanho declarado pelo manifesto.',
    });
  }
  if (String(checksum ?? '').toLowerCase() !== transacao.novo.checksum) {
    return falharTransacaoDataset(transacao, {
      codigo: 'CHECKSUM_INVALIDO',
      motivo: 'O checksum do pacote não corresponde ao manifesto.',
    });
  }
  return transicionarDataset(transacao, ESTADOS_SYNC_DATASET.STAGING, {
    bytesRecebidos,
    staging: { checksum: transacao.novo.checksum, bytes: bytesRecebidos, verificadoEm: dataIso(verificadoEm) },
    erro: null,
  });
}

export function solicitarAtivacaoDataset(transacao) {
  if (transacao?.estado !== ESTADOS_SYNC_DATASET.STAGING || !transacao.staging) {
    return resultadoFalha('STAGING_NAO_VALIDO', 'Somente um pacote verificado em staging pode ser ativado.', transacao);
  }
  return transicionarDataset(transacao, ESTADOS_SYNC_DATASET.ACTIVATING);
}

export function concluirAtivacaoDataset(transacao, { concluidoEm = Date.now() } = {}) {
  if (transacao?.estado !== ESTADOS_SYNC_DATASET.ACTIVATING) {
    return resultadoFalha('ATIVACAO_NAO_SOLICITADA', 'A ativação deve ser solicitada antes da conclusão.', transacao);
  }
  return transicionarDataset(transacao, ESTADOS_SYNC_DATASET.COMPLETE, {
    ativo: copiar(transacao.novo),
    staging: null,
    concluidoEm: dataIso(concluidoEm),
    erro: null,
    limpezaTemporaria: 'PERMITIDA',
  });
}

export function cancelarTransacaoDataset(transacao) {
  if (!transacao || TERMINAIS.has(transacao.estado) || transacao.estado === ESTADOS_SYNC_DATASET.ACTIVATING || transacao.estado === ESTADOS_SYNC_DATASET.FAILED) {
    return resultadoFalha('CANCELAMENTO_INVALIDO', 'A transação não pode ser cancelada neste estado.', transacao);
  }
  return transicionarDataset(transacao, ESTADOS_SYNC_DATASET.CANCELLED, {
    staging: null,
    limpezaTemporaria: 'PERMITIDA',
    erro: null,
  });
}

export function rollbackTransacaoDataset(transacao) {
  if (transacao?.estado !== ESTADOS_SYNC_DATASET.FAILED) {
    return resultadoFalha('ROLLBACK_INVALIDO', 'Rollback só pode ocorrer depois de uma falha.', transacao);
  }
  return transicionarDataset(transacao, ESTADOS_SYNC_DATASET.ROLLED_BACK, {
    staging: null,
    ativo: copiar(transacao.ativo),
    limpezaTemporaria: 'PERMITIDA',
  });
}
