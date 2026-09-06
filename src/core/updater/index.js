/**
 * O contrato do updater — a única porta que a interface conhece.
 *
 * Item 4 do pedido: *"Não espalhar lógica de atualização por várias páginas."*
 * A tela pergunta ao updater e mostra o que ele responde; ela não sabe o que é
 * uma tag, um canal, um checksum ou um `Intent`.
 *
 * Tudo entra por parâmetro (fetch, relógio, armazenamento, plataforma) para
 * que os cenários do item 19 — versão igual, menor, maior, beta, erro de rede,
 * checksum inválido, release sem APK — sejam testáveis sem rede e sem
 * aparelho.
 *
 * ## O updater nunca é requisito para o aplicativo abrir
 *
 * Item 21: ele é opcional. Toda falha aqui vira estado (`SEM_INTERNET`,
 * `ERRO`), nunca exceção que suba. Sem rede, sem GitHub, sem release: o
 * Vanguard continua sendo mapa, GPS e bússola.
 */

import { CANAIS, canalDaVersao, compararVersoes } from './semver.js';
import { ESTADOS, criarValidadorDeUrl, escolherAtualizacao, normalizarRelease } from './releases.js';
import { RESULTADO_DOWNLOAD, baixarEVerificar } from './download.js';
import { detectarUpdaterDePlataforma } from './plataformas.js';

export { CANAIS, ESTADOS, RESULTADO_DOWNLOAD };
export { compararVersoes, canalDaVersao } from './semver.js';

export const PREFERENCIAS_PADRAO = Object.freeze({
  // O mais conservador por padrão (item 15): nada baixa sozinho, e a
  // verificação ao iniciar é leve e cancelável.
  verificarAoIniciar: true,
  baixarAutomaticamente: 'nunca',   // 'nunca' | 'wifi' | 'sempre'
  canal: CANAIS.STABLE,
});

export function criarUpdater({
  versaoInstalada,
  urlRepositorio,
  urlApiReleases,
  fetchApi = globalThis.fetch,
  cryptoApi = globalThis.crypto,
  agora = () => Date.now(),
  estaOnline = () => globalThis.navigator?.onLine !== false,
  plataforma = detectarUpdaterDePlataforma(),
  preferencias = PREFERENCIAS_PADRAO,
  limiteHistorico = 20,
} = {}) {
  const urlOficial = criarValidadorDeUrl(urlRepositorio);
  let ultimo = {
    estado: ESTADOS.NUNCA_VERIFICADO,
    release: null,
    historico: [],
    verificadoEm: null,
    erro: null,
  };

  function estadoAtual() {
    return { ...ultimo, versaoInstalada, canal: preferencias.canal, plataforma };
  }

  return {
    getCurrentVersion: () => versaoInstalada,
    getPlatform: () => plataforma,
    getState: estadoAtual,

    /**
     * Consulta as releases. Nunca lança: devolve estado.
     *
     * `estaOnline() === false` vira `SEM_INTERNET` sem sequer tentar a rede —
     * pedir e falhar gastaria bateria para chegar à mesma conclusão.
     */
    async checkForUpdate({ sinal = null } = {}) {
      if (!estaOnline()) {
        ultimo = { ...ultimo, estado: ESTADOS.SEM_INTERNET, verificadoEm: agora(), erro: null };
        return estadoAtual();
      }
      try {
        const resposta = await fetchApi(urlApiReleases, {
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-store',
          signal: sinal,
        });
        if (!resposta.ok) {
          ultimo = { ...ultimo, estado: ESTADOS.ERRO, verificadoEm: agora(), erro: `HTTP ${resposta.status}` };
          return estadoAtual();
        }
        const cru = await resposta.json();
        // O endpoint de lista devolve array; o de "latest" devolve objeto. Aceitar
        // os dois evita que a escolha do endpoint vire mudança de contrato.
        const lista = Array.isArray(cru) ? cru : [cru];
        const releases = lista
          .map((r) => normalizarRelease(r, { urlOficial }))
          .filter(Boolean)
          .slice(0, limiteHistorico);

        const decisao = escolherAtualizacao(releases, {
          versaoInstalada,
          canal: preferencias.canal,
        });
        ultimo = { ...decisao, verificadoEm: agora(), erro: null };
        return estadoAtual();
      } catch (erro) {
        if (erro?.name === 'AbortError') return estadoAtual();
        ultimo = { ...ultimo, estado: ESTADOS.ERRO, verificadoEm: agora(), erro: String(erro?.message ?? erro) };
        return estadoAtual();
      }
    },

    isUpdateAvailable: () => ultimo.estado === ESTADOS.DISPONIVEL && Boolean(ultimo.release),
    getLatestVersion: () => ultimo.release?.versao ?? null,
    getReleaseInfo: () => ultimo.release,
    getHistory: () => ultimo.historico,

    /** Uma release anterior pode ser rebaixada? Só por escolha explícita. */
    ehDowngrade: (release) => Boolean(release) && compararVersoes(release.versao, versaoInstalada) < 0,

    /**
     * Baixa e verifica. A plataforma decide se isso sequer faz sentido — no
     * iOS e na Web não faz, e responder com a limitação é mais útil que
     * tentar e falhar.
     */
    async download(release = ultimo.release, opcoes = {}) {
      if (!plataforma.podeBaixar) {
        return { resultado: RESULTADO_DOWNLOAD.ERRO_REDE, erro: plataforma.limitacoes[0] ?? 'plataforma não baixa artefatos' };
      }
      if (!release) return { resultado: RESULTADO_DOWNLOAD.ERRO_REDE, erro: 'nenhuma release selecionada' };
      return baixarEVerificar(release, { fetchApi, cryptoApi, ...opcoes });
    },

    /**
     * A instalação nativa. Enquanto a plataforma não puder, isto responde o
     * que falta em vez de tentar — e o que falta está escrito em
     * `plataformas.js`, não escondido aqui.
     */
    async install() {
      if (!plataforma.podeInstalar) {
        return { instalou: false, motivo: 'PLATAFORMA_NAO_SUPORTA', limitacoes: plataforma.limitacoes };
      }
      return { instalou: false, motivo: 'NAO_IMPLEMENTADO', limitacoes: plataforma.limitacoes };
    },
  };
}
