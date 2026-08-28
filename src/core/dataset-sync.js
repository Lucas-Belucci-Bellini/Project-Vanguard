/**
 * Orquestração local do ciclo de vida do dataset offline.
 *
 * Este módulo é a única costura entre o manifesto (contrato), a transação
 * (máquina de estados pura), o storage isolado (persistência) e o catálogo de
 * fontes (gate de licença). Ele não baixa nada, não calcula checksum de bytes,
 * não fala com a rede e não conhece DOM: recebe os resultados de quem faz isso
 * e garante que cada passo fique gravado antes do passo seguinte.
 *
 * A garantia que ele adiciona é de ORDEM, não de durabilidade física:
 *
 *   1. a transação é gravada antes de qualquer efeito;
 *   2. o manifesto ativo só é escrito depois de `ACTIVATING` estar gravado;
 *   3. o registro da transação só é apagado depois do ativo estar escrito.
 *
 * É isso que torna uma interrupção entre (2) e (3) recuperável em vez de
 * destrutiva. Durabilidade real de disco, quota e power loss continuam
 * dependendo do aparelho e não são provadas aqui.
 */

import { ESTADOS_DATASET, estadoFrescorDataset } from './dataset-manifest.js';
import { criarStorageDataset } from './dataset-storage.js';
import {
  ESTADOS_SYNC_DATASET,
  cancelarTransacaoDataset,
  concluirAtivacaoDataset,
  criarTransacaoDataset,
  falharTransacaoDataset,
  rollbackTransacaoDataset,
  solicitarAtivacaoDataset,
  transacaoDatasetEmAndamento,
  transicionarDataset,
  verificarPacoteDataset,
} from './dataset-transacao.js';
import { FONTES_DATASET_ATUAIS, avaliarCatalogoFontes, avaliarFonteDataset, ESTADOS_GOVERNANCA_FONTE } from '../data/fontes-dataset.js';

export const ESTADOS_RECUPERACAO_DATASET = Object.freeze({
  LIMPO: 'CLEAN',
  RESIDUO: 'RESIDUAL',
  INTERROMPIDA: 'INTERRUPTED',
  ATIVACAO_CONFIRMADA: 'ACTIVATION_CONFIRMED',
  ATIVACAO_REVERTIDA: 'ACTIVATION_REVERTED',
  ROLLBACK_APLICADO: 'ROLLBACK_APPLIED',
  ILEGIVEL: 'UNREADABLE',
});

const TERMINAIS = new Set([
  ESTADOS_SYNC_DATASET.COMPLETE,
  ESTADOS_SYNC_DATASET.ROLLED_BACK,
  ESTADOS_SYNC_DATASET.CANCELLED,
]);

function falha(codigo, motivo, extra = {}) {
  return { ok: false, codigo, motivo, ...extra };
}

function mesmoManifesto(a, b) {
  return Boolean(
    a && b &&
    a.datasetId === b.datasetId &&
    a.version === b.version &&
    a.checksum === b.checksum
  );
}

export function criarSincronizacaoDataset({
  storage = criarStorageDataset(),
  fontes = FONTES_DATASET_ATUAIS,
  relogio = () => Date.now(),
} = {}) {
  const agora = () => {
    const valor = Number(relogio());
    return Number.isFinite(valor) ? valor : Date.now();
  };

  function persistir(transacao) {
    const salvo = storage.salvarTransacao(transacao);
    return salvo.ok ? { ok: true, transacao } : salvo;
  }

  function transacaoAtual() {
    return storage.lerTransacao();
  }

  function encerrar(transacao) {
    const salvo = persistir(transacao);
    if (!salvo.ok) return salvo;
    const limpo = storage.limparTransacao();
    return limpo.ok ? { ok: true, transacao } : limpo;
  }

  function fonteDeclarada(sourceId) {
    if (typeof sourceId !== 'string' || sourceId.trim().length === 0) {
      return falha('FONTE_NAO_DECLARADA', 'A origem do pacote precisa ser declarada explicitamente.');
    }
    const registro = (Array.isArray(fontes) ? fontes : []).find((fonte) => fonte?.sourceId === sourceId);
    if (!registro) {
      return falha('FONTE_DESCONHECIDA', 'A origem declarada não existe no catálogo de fontes.');
    }
    const avaliacao = avaliarFonteDataset(registro);
    if (avaliacao.estado !== ESTADOS_GOVERNANCA_FONTE.APROVADA) {
      return falha('FONTE_NAO_APROVADA', 'A origem não está aprovada para originar pacote offline.', {
        estadoFonte: avaliacao.estado,
        criteriosAusentes: avaliacao.criteriosAusentes,
      });
    }
    return { ok: true, fonte: registro };
  }

  return {
    /**
     * Retrato consolidado do dataset local. Falhas de leitura são expostas em
     * `erros`, nunca convertidas em "não há nada".
     */
    estado({ versaoEsperada = null, maxAgeMs = null } = {}) {
      const erros = [];
      const leituraAtivo = storage.lerAtivo();
      if (!leituraAtivo.ok) erros.push({ chave: 'ativo', codigo: leituraAtivo.codigo, motivo: leituraAtivo.motivo });
      const leituraTransacao = transacaoAtual();
      if (!leituraTransacao.ok) erros.push({ chave: 'transacao', codigo: leituraTransacao.codigo, motivo: leituraTransacao.motivo });

      const ativo = leituraAtivo.ok ? leituraAtivo.valor ?? null : null;
      const transacao = leituraTransacao.ok ? leituraTransacao.valor ?? null : null;
      const emAndamento = transacaoDatasetEmAndamento(transacao);
      const catalogo = avaliarCatalogoFontes(fontes);

      return {
        storage: storage.diagnostico(),
        ativo,
        frescor: ativo
          ? estadoFrescorDataset(ativo, { versaoAtual: versaoEsperada, agora: agora(), maxAgeMs })
          : ESTADOS_DATASET.DESCONHECIDO,
        transacao,
        emAndamento,
        fontes: { podeCriarPacote: catalogo.podeCriarPacote, fontesAptas: catalogo.fontesAptas },
        // Basta UMA fonte apta: `podeCriarPacote` exige o catálogo inteiro aprovado
        // e responderia "não" mesmo havendo origem válida para esta transação.
        podeIniciar: erros.length === 0 && !emAndamento && catalogo.fontesAptas.length > 0,
        erros,
      };
    },

    /**
     * Reconciliação de partida. Decide o destino de uma transação encontrada no
     * armazenamento depois de uma interrupção (app morto, bateria, reinício do
     * sistema). Nunca retoma download não verificado.
     */
    recuperar() {
      const leitura = transacaoAtual();
      if (!leitura.ok) {
        const limpo = storage.limparTransacao();
        return {
          ok: limpo.ok,
          estado: ESTADOS_RECUPERACAO_DATASET.ILEGIVEL,
          codigo: leitura.codigo,
          motivo: leitura.motivo,
          transacao: null,
        };
      }

      const transacao = leitura.valor;
      if (!transacao) {
        return { ok: true, estado: ESTADOS_RECUPERACAO_DATASET.LIMPO, transacao: null };
      }

      if (TERMINAIS.has(transacao.estado)) {
        const limpo = storage.limparTransacao();
        return {
          ok: limpo.ok,
          estado: ESTADOS_RECUPERACAO_DATASET.RESIDUO,
          transacao,
          ...(limpo.ok ? {} : { codigo: limpo.codigo, motivo: limpo.motivo }),
        };
      }

      if (transacao.estado === ESTADOS_SYNC_DATASET.ACTIVATING) {
        const leituraAtivo = storage.lerAtivo();
        if (!leituraAtivo.ok) {
          return falha('ATIVO_ILEGIVEL', 'A ativação foi interrompida e o manifesto ativo não pôde ser lido.', {
            estado: ESTADOS_RECUPERACAO_DATASET.ILEGIVEL,
            transacao,
            origem: { codigo: leituraAtivo.codigo, motivo: leituraAtivo.motivo },
          });
        }
        if (mesmoManifesto(leituraAtivo.valor, transacao.novo)) {
          const concluida = concluirAtivacaoDataset(transacao, { concluidoEm: agora() });
          if (!concluida.ok) return concluida;
          const fim = encerrar(concluida.transacao);
          return {
            ok: fim.ok,
            estado: ESTADOS_RECUPERACAO_DATASET.ATIVACAO_CONFIRMADA,
            transacao: concluida.transacao,
            ...(fim.ok ? {} : { codigo: fim.codigo, motivo: fim.motivo }),
          };
        }
        const falhada = falharTransacaoDataset(transacao, {
          codigo: 'ATIVACAO_INTERROMPIDA',
          motivo: 'A ativação não chegou a substituir o dataset ativo.',
        });
        if (!falhada.ok) return falhada;
        const revertida = rollbackTransacaoDataset(falhada.transacao);
        if (!revertida.ok) return revertida;
        const fim = encerrar(revertida.transacao);
        return {
          ok: fim.ok,
          estado: ESTADOS_RECUPERACAO_DATASET.ATIVACAO_REVERTIDA,
          transacao: revertida.transacao,
          ...(fim.ok ? {} : { codigo: fim.codigo, motivo: fim.motivo }),
        };
      }

      const jaFalhou = transacao.estado === ESTADOS_SYNC_DATASET.FAILED;
      const base = jaFalhou
        ? { ok: true, transacao }
        : falharTransacaoDataset(transacao, {
            codigo: 'ATUALIZACAO_INTERROMPIDA',
            motivo: 'A atualização foi interrompida antes da verificação do pacote.',
          });
      if (!base.ok) return base;
      const revertida = rollbackTransacaoDataset(base.transacao);
      if (!revertida.ok) return revertida;
      const fim = encerrar(revertida.transacao);
      return {
        ok: fim.ok,
        estado: jaFalhou ? ESTADOS_RECUPERACAO_DATASET.ROLLBACK_APLICADO : ESTADOS_RECUPERACAO_DATASET.INTERROMPIDA,
        transacao: revertida.transacao,
        ...(fim.ok ? {} : { codigo: fim.codigo, motivo: fim.motivo }),
      };
    },

    /**
     * Abre uma transação. O gate de fonte é aplicado aqui, na entrada: um
     * pacote sem origem aprovada nunca chega a existir como transação.
     */
    iniciar(manifesto, { sourceId = null } = {}) {
      const leituraAtivo = storage.lerAtivo();
      if (!leituraAtivo.ok) return leituraAtivo;
      const leituraTransacao = transacaoAtual();
      if (!leituraTransacao.ok) return leituraTransacao;

      const origem = fonteDeclarada(sourceId);
      if (!origem.ok) return origem;

      const criada = criarTransacaoDataset({
        ativo: leituraAtivo.valor ?? null,
        manifesto,
        transacaoAtiva: leituraTransacao.valor ?? null,
        agora: agora(),
      });
      if (!criada.ok) return criada;
      return persistir(criada.transacao);
    },

    /** Avança um estado simples do fluxo (CHECKING, AVAILABLE, DOWNLOADING). */
    avancar(proximoEstado, detalhes = {}) {
      const leitura = transacaoAtual();
      if (!leitura.ok) return leitura;
      if (!leitura.valor) return falha('SEM_TRANSACAO', 'Não há transação de dataset em andamento.');
      const seguinte = transicionarDataset(leitura.valor, proximoEstado, detalhes);
      if (!seguinte.ok) return seguinte;
      return persistir(seguinte.transacao);
    },

    /**
     * Confere tamanho e checksum informados por quem baixou. Uma verificação
     * reprovada é gravada como falha antes de retornar, para que o rollback
     * continue possível depois de um encerramento abrupto.
     */
    verificar({ bytes, checksum } = {}) {
      const leitura = transacaoAtual();
      if (!leitura.ok) return leitura;
      if (!leitura.valor) return falha('SEM_TRANSACAO', 'Não há transação de dataset em andamento.');
      const resultado = verificarPacoteDataset(leitura.valor, { bytes, checksum, verificadoEm: agora() });
      if (!resultado.ok) return resultado;
      const salvo = persistir(resultado.transacao);
      if (!salvo.ok) return salvo;
      if (resultado.transacao.estado === ESTADOS_SYNC_DATASET.FAILED) {
        return falha(
          resultado.transacao.erro?.codigo ?? 'VERIFICACAO_REPROVADA',
          resultado.transacao.erro?.motivo ?? 'O pacote não passou na verificação.',
          { transacao: resultado.transacao },
        );
      }
      return salvo;
    },

    /**
     * Ativação em três gravações ordenadas: ACTIVATING → manifesto ativo →
     * COMPLETE → limpeza. Uma interrupção em qualquer ponto é reconciliável
     * por `recuperar()`.
     */
    ativar() {
      const leitura = transacaoAtual();
      if (!leitura.ok) return leitura;
      if (!leitura.valor) return falha('SEM_TRANSACAO', 'Não há transação de dataset em andamento.');

      const solicitada = solicitarAtivacaoDataset(leitura.valor);
      if (!solicitada.ok) return solicitada;
      const marcada = persistir(solicitada.transacao);
      if (!marcada.ok) return marcada;

      const ativo = storage.salvarAtivo(solicitada.transacao.novo);
      if (!ativo.ok) {
        const falhada = falharTransacaoDataset(solicitada.transacao, {
          codigo: 'ATIVACAO_NAO_GRAVADA',
          motivo: 'O manifesto ativo não pôde ser gravado; o dataset anterior foi preservado.',
        });
        // Best-effort: se esta gravação também falhar, o armazenamento fica em
        // `ACTIVATING` com ativo divergente, e `recuperar()` resolve como reversão.
        if (falhada.ok) persistir(falhada.transacao);
        return falha(ativo.codigo, ativo.motivo, { transacao: falhada.ok ? falhada.transacao : solicitada.transacao });
      }

      const concluida = concluirAtivacaoDataset(solicitada.transacao, { concluidoEm: agora() });
      if (!concluida.ok) return concluida;
      return encerrar(concluida.transacao);
    },

    /** Cancelamento deliberado antes da ativação. */
    cancelar() {
      const leitura = transacaoAtual();
      if (!leitura.ok) return leitura;
      if (!leitura.valor) return falha('SEM_TRANSACAO', 'Não há transação de dataset em andamento.');
      const cancelada = cancelarTransacaoDataset(leitura.valor);
      if (!cancelada.ok) return cancelada;
      return encerrar(cancelada.transacao);
    },

    /** Registra falha externa (rede, storage do pacote, decisão do chamador). */
    falhar({ codigo = 'ERRO_ATUALIZACAO', motivo = 'A atualização falhou.' } = {}) {
      const leitura = transacaoAtual();
      if (!leitura.ok) return leitura;
      if (!leitura.valor) return falha('SEM_TRANSACAO', 'Não há transação de dataset em andamento.');
      const falhada = falharTransacaoDataset(leitura.valor, { codigo, motivo });
      if (!falhada.ok) return falhada;
      return persistir(falhada.transacao);
    },

    /** Rollback explícito depois de uma falha registrada. */
    rollback() {
      const leitura = transacaoAtual();
      if (!leitura.ok) return leitura;
      if (!leitura.valor) return falha('SEM_TRANSACAO', 'Não há transação de dataset em andamento.');
      const revertida = rollbackTransacaoDataset(leitura.valor);
      if (!revertida.ok) return revertida;
      return encerrar(revertida.transacao);
    },
  };
}
