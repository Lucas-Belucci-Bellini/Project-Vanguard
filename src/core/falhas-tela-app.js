/**
 * A instância do registro de falhas que o aplicativo usa.
 *
 * Fica separada de `falhas-tela.js` para que o módulo com a lógica continue
 * puro e testável: aqui é o único lugar que toca `localStorage` e a identidade
 * do build. O acesso ao storage vai dentro de `try` porque em janela anônima,
 * com dados de site bloqueados, o próprio *acessador* lança — e uma exceção
 * aqui derrubaria o boot inteiro por causa de um registro de diagnóstico.
 */

import { criarRegistroDeFalhas } from './falhas-tela.js';
import { BUILD_ID } from './versao.js';

function armazenamentoSeguro() {
  try {
    const teste = '__vanguard_probe__';
    localStorage.setItem(teste, '1');
    localStorage.removeItem(teste);
    return localStorage;
  } catch {
    return null;
  }
}

export const falhasDeTela = criarRegistroDeFalhas({
  armazenamento: armazenamentoSeguro(),
  build: BUILD_ID,
});
