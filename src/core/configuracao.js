/**
 * Configuração pública do Vanguard Field.
 *
 * Este módulo não contém segredos, tokens ou credenciais. Identidade e URLs
 * oficiais ficam em um único contrato para reduzir divergência entre diagnóstico
 * e atualização sem misturar configuração pública com ambiente de publicação.
 */

const REPOSITORIO = 'Lucas-Belucci-Bellini/Project-Vanguard';
const URL_GITHUB = 'https://github.com';

export const CONFIGURACAO_APLICATIVO = Object.freeze({
  nome: 'Vanguard Field',
  id: 'com.projectvanguard.field',
  versao: '1.3.0',
  repositorio: REPOSITORIO,
  urlRepositorio: `${URL_GITHUB}/${REPOSITORIO}`,
});

export const CONFIGURACAO_ATUALIZACAO = Object.freeze({
  urlReleases: `${CONFIGURACAO_APLICATIVO.urlRepositorio}/releases`,
  urlReleaseMaisRecente: `https://api.github.com/repos/${REPOSITORIO}/releases/latest`,
});
