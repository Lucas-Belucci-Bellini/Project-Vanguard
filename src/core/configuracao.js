/**
 * Configuração pública do Vanguard Field.
 *
 * Este módulo não contém segredos, tokens ou credenciais. Identidade e URLs
 * oficiais ficam em um único contrato para reduzir divergência entre diagnóstico
 * e atualização sem misturar configuração pública com ambiente de publicação.
 */

import { VERSAO_APP } from './versao.js';

const REPOSITORIO = 'Lucas-Belucci-Bellini/Project-Vanguard';
const URL_GITHUB = 'https://github.com';

/*
 * A versão vem do `package.json` pelo build, nunca digitada aqui.
 *
 * Ela estava cravada em `'1.3.1'` e ficou para trás em quatro releases. Não
 * era só um número errado numa tela: `atualizacao.js` usa este valor como "a
 * versão instalada" para comparar com a última release do GitHub. Com a
 * constante congelada, o app rodando 1.4.1 se achava 1.3.1 e anunciava
 * atualização disponível para uma versão que ele já era — e nunca conseguiria
 * dizer que estava em dia.
 *
 * Fora do build a versão é desconhecida, e `0.0.0-sem-build` diz isso em vez
 * de fingir um número: qualquer release publicada é maior que ele, então o
 * comportamento seguro (avisar que há atualização) é o que acontece.
 */
export const VERSAO_SEM_BUILD = '0.0.0-sem-build';

export const CONFIGURACAO_APLICATIVO = Object.freeze({
  nome: 'Vanguard Field',
  id: 'com.projectvanguard.field',
  versao: VERSAO_APP ?? VERSAO_SEM_BUILD,
  repositorio: REPOSITORIO,
  urlRepositorio: `${URL_GITHUB}/${REPOSITORIO}`,
});

export const CONFIGURACAO_ATUALIZACAO = Object.freeze({
  urlReleases: `${CONFIGURACAO_APLICATIVO.urlRepositorio}/releases`,
  urlReleaseMaisRecente: `https://api.github.com/repos/${REPOSITORIO}/releases/latest`,
  /* A LISTA, não só a mais recente: o histórico de versões é a tela de
   * Atualizações, e `latest` sozinho não traz as anteriores. */
  urlListaReleases: `https://api.github.com/repos/${REPOSITORIO}/releases?per_page=20`,
});
