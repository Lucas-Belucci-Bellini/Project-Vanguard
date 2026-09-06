/**
 * A instância do updater que o aplicativo usa.
 *
 * Fica separada do contrato para que `updater/index.js` continue puro e
 * testável: aqui é o único lugar que toca globais — `localStorage`,
 * `navigator`, `Capacitor` e a configuração publicada.
 */

import { CONFIGURACAO_APLICATIVO, CONFIGURACAO_ATUALIZACAO } from '../configuracao.js';
import { identidadeDoBuild } from '../versao.js';
import { criarUpdater } from './index.js';
import { criarPreferencias } from './preferencias.js';
import { detectarUpdaterDePlataforma } from './plataformas.js';

function armazenamentoSeguro() {
  try {
    const teste = '__vanguard_updater_probe__';
    localStorage.setItem(teste, '1');
    localStorage.removeItem(teste);
    return localStorage;
  } catch {
    return null;
  }
}

export const preferenciasUpdater = criarPreferencias({ armazenamento: armazenamentoSeguro() });

/** O tipo de conexão, quando o navegador o expõe — nunca chutado. */
export function tipoDeConexao(navegador = globalThis.navigator) {
  const tipo = navegador?.connection?.type;
  if (typeof tipo === 'string' && tipo) return tipo;
  // `effectiveType` descreve VELOCIDADE ('4g'), não meio físico: um wi-fi lento
  // reporta '3g' e um 5G reporta '4g'. Usá-lo para decidir "é wi-fi?" mandaria
  // baixar em dados móveis. Sem `type`, a resposta honesta é desconhecido.
  return null;
}

export const updaterApp = criarUpdater({
  versaoInstalada: CONFIGURACAO_APLICATIVO.versao,
  urlRepositorio: CONFIGURACAO_APLICATIVO.urlRepositorio,
  // A lista, não o `latest`: o histórico de releases é requisito (item 14), e
  // `latest` sozinho não traz as versões anteriores.
  urlApiReleases: CONFIGURACAO_ATUALIZACAO.urlListaReleases,
  preferencias: preferenciasUpdater.ler(),
  plataforma: (() => {
    // A plataforma vem de `identidadeDoBuild()`, que já resolve nativo/web e o
    // nome da plataforma num lugar só — não há função separada, e criar uma
    // seria uma segunda fonte para a mesma pergunta.
    const identidade = identidadeDoBuild();
    return detectarUpdaterDePlataforma({
      nativo: identidade.nativo,
      plataforma: identidade.plataforma,
    });
  })(),
});
