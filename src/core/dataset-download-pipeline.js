/**
 * Pipeline de download -> verificação -> ativação.
 *
 * Costura o adapter de rede/sessão ao orquestrador de dataset sem dar ao
 * downloader qualquer poder sobre manifesto, licença ou dataset ativo.
 * Todas as dependências são injetáveis para permitir testes sem IndexedDB.
 */

function falha(codigo, motivo, extra = {}) {
  return { ok: false, codigo, motivo, ...extra };
}

export function criarPipelineDownloadDataset({ session, sync }) {
  if (!session || typeof session.iniciar !== 'function') {
    throw new TypeError('session.iniciar é obrigatório.');
  }
  if (!sync || typeof sync.avancar !== 'function' || typeof sync.armazenarBytes !== 'function' || typeof sync.ativar !== 'function') {
    throw new TypeError('sync precisa expor avancar, armazenarBytes e ativar.');
  }

  let executando = false;

  return {
    emExecucao: () => executando,

    async executar(response, { signal = null, metadata = {} } = {}) {
      if (executando) {
        return falha('PIPELINE_EM_ANDAMENTO', 'Já existe uma instalação de dataset em andamento.');
      }
      executando = true;

      try {
        const baixado = await session.iniciar(response, { signal });
        if (!baixado.ok) return baixado;

        const entrandoVerificacao = sync.avancar('VERIFYING', {
          totalBytes: baixado.sizeBytes,
          downloadCompletoEm: Date.now(),
        });
        if (!entrandoVerificacao.ok) return entrandoVerificacao;

        const armazenado = await sync.armazenarBytes(baixado.bytes, metadata);
        if (!armazenado.ok) return armazenado;

        const ativado = await sync.ativar();
        if (!ativado.ok) return ativado;

        return {
          ok: true,
          sizeBytes: baixado.sizeBytes,
          pacote: armazenado.pacote ?? null,
          transacao: ativado.transacao ?? null,
        };
      } catch (erro) {
        return falha('PIPELINE_FALHOU', erro?.message ?? 'Falha inesperada no pipeline de download.');
      } finally {
        executando = false;
      }
    },
  };
}
