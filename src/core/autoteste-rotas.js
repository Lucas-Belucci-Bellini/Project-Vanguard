/**
 * Autoteste de rotas — o aparelho respondendo por si.
 *
 * ## Por que isto existe
 *
 * Três rodadas de investigação mediram a mesma coisa por fora: o build web, os
 * bytes do APK, e os bytes do APK com o runtime nativo. Todas disseram que as
 * 13 rotas carregam. E ainda assim o relato de campo era "a página não abre no
 * aplicativo".
 *
 * O que faltava não era mais medição aqui — era medição **lá**. Nenhum teste
 * que roda nesta máquina alcança a WebView do sistema do operador, a versão do
 * Android dele, o que o launcher instalou, ou o que sobrou de uma instalação
 * anterior. Este módulo fecha essa distância: ele tenta carregar **cada rota**
 * no aparelho onde o app está, e devolve o resultado.
 *
 * ## Ele exercita o caminho real, não uma imitação
 *
 * Usa o mesmo `carregar` de `rotas.js` que a navegação usa — o mesmo `import()`
 * dinâmico, resolvido pelo mesmo bundler, servido pela mesma origem. Um
 * autoteste que reimplementasse o carregamento testaria a reimplementação.
 *
 * O que ele NÃO faz: montar a tela. Montar dispara câmera, GPS e microfone —
 * pedir cinco permissões porque alguém apertou "testar" seria hostil, e uma
 * permissão negada apareceria como falha do app. Ele responde a pergunta que
 * importa para paridade: **o módulo desta rota chega e é utilizável?**
 */

import { classificarFalha } from './falhas-tela.js';

export const RESULTADO_ROTA = Object.freeze({
  OK: 'OK',
  FALHOU: 'FALHOU',
});

/**
 * Tenta carregar cada rota. Devolve uma linha por rota, sempre na mesma ordem
 * da lista — inclusive as que falharam, porque uma rota ausente do relatório
 * seria lida como "não testada" e não como "quebrada".
 */
export async function testarRotas(rotas, { aoProgresso = () => {} } = {}) {
  const linhas = [];
  for (const rota of rotas) {
    const inicio = Date.now();
    try {
      const pagina = await rota.carregar();
      if (typeof pagina !== 'function') {
        // O módulo chegou mas o export não é o que a rota consome. Sem esta
        // conferência o autoteste diria OK para a rota que monta em branco.
        throw new TypeError('o módulo carregou mas não exporta uma função de página');
      }
      linhas.push({
        hash: rota.hash,
        titulo: rota.titulo,
        resultado: RESULTADO_ROTA.OK,
        ms: Date.now() - inicio,
      });
    } catch (erro) {
      linhas.push({
        hash: rota.hash,
        titulo: rota.titulo,
        resultado: RESULTADO_ROTA.FALHOU,
        tipo: classificarFalha(erro),
        mensagem: String(erro?.message ?? erro).slice(0, 200),
        ms: Date.now() - inicio,
      });
    }
    aoProgresso(linhas.length, rotas.length);
  }
  return linhas;
}

/** Resumo curto para o cabeçalho da tela. */
export function resumirAutoteste(linhas) {
  const falhas = linhas.filter((l) => l.resultado === RESULTADO_ROTA.FALHOU);
  return {
    total: linhas.length,
    falhas: falhas.length,
    rotasComFalha: falhas.map((l) => l.hash),
    tudoOk: falhas.length === 0,
  };
}
