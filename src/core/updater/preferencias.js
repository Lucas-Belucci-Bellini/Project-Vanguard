/**
 * Preferências de atualização, persistidas.
 *
 * O padrão é o mais conservador que o item 15 pede: **nada baixa sozinho**.
 * Verificar é barato e não consome dados de forma relevante; baixar dezenas de
 * megabytes por conta própria, na rede de dados de quem está em campo, é o
 * tipo de gentileza que ninguém pediu.
 *
 * A escolha do canal também é conservadora: `stable`. Quem quiser beta escolhe.
 */

import { CANAIS } from './semver.js';

export const CHAVE_PREFERENCIAS = 'vanguard:updater-preferencias';

export const PADRAO = Object.freeze({
  verificarAoIniciar: true,
  baixarAutomaticamente: 'nunca',   // 'nunca' | 'wifi' | 'sempre'
  canal: CANAIS.STABLE,
});

const BAIXAR_VALIDOS = new Set(['nunca', 'wifi', 'sempre']);
const CANAIS_VALIDOS = new Set(Object.values(CANAIS));

/** Só aceita valores conhecidos; o resto volta ao padrão em vez de virar lixo. */
export function normalizar(bruto) {
  const entrada = bruto && typeof bruto === 'object' ? bruto : {};
  return {
    verificarAoIniciar: typeof entrada.verificarAoIniciar === 'boolean' ? entrada.verificarAoIniciar : PADRAO.verificarAoIniciar,
    baixarAutomaticamente: BAIXAR_VALIDOS.has(entrada.baixarAutomaticamente) ? entrada.baixarAutomaticamente : PADRAO.baixarAutomaticamente,
    canal: CANAIS_VALIDOS.has(entrada.canal) ? entrada.canal : PADRAO.canal,
  };
}

export function criarPreferencias({ armazenamento = null } = {}) {
  let atual = PADRAO;
  if (armazenamento) {
    try {
      const cru = armazenamento.getItem(CHAVE_PREFERENCIAS);
      if (cru) atual = normalizar(JSON.parse(cru));
    } catch {
      /* Preferência corrompida volta ao padrão; não pode impedir o app de abrir. */
    }
  }

  return {
    ler: () => ({ ...atual }),
    gravar(mudancas) {
      atual = normalizar({ ...atual, ...mudancas });
      if (armazenamento) {
        try { armazenamento.setItem(CHAVE_PREFERENCIAS, JSON.stringify(atual)); } catch { /* cota/bloqueio */ }
      }
      return { ...atual };
    },
  };
}

/**
 * Decide se pode baixar sozinho.
 *
 * `wifi` só libera quando a plataforma **afirma** que a conexão não é celular.
 * Sem essa informação a resposta é não: gastar dados de quem está em campo por
 * causa de um palpite é o erro caro aqui, e não baixar só adia um toque.
 */
export function podeBaixarAutomaticamente(preferencias, { tipoDeConexao = null } = {}) {
  if (preferencias.baixarAutomaticamente === 'nunca') return false;
  if (preferencias.baixarAutomaticamente === 'sempre') return true;
  return tipoDeConexao === 'wifi' || tipoDeConexao === 'ethernet';
}
