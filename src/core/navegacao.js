/**
 * Troca de telas do shell, com guarda contra corrida.
 *
 * Carregar uma tela é assíncrono (`import()` dinâmico do módulo da página).
 * Sem guarda, duas navegações disparadas em sequência rápida — tocar duas abas
 * seguidas, ou tocar uma aba enquanto o pedaço anterior ainda baixa — chegam ao
 * fim **as duas** e cada uma insere a sua tela no mesmo contêiner.
 *
 * O sintoma visível é a tela duplicada lado a lado, porque o contêiner é flex.
 * O sintoma invisível é pior: só a última navegação fica registrada para
 * desmontagem, então a primeira tela continua viva sem ninguém para desligá-la
 * — com o watcher de GPS, os intervalos e os listeners dela rodando até o app
 * fechar. Numa caminhada de dia inteiro isso é bateria indo embora sem motivo.
 *
 * A guarda é uma geração: cada navegação pega um número, e só monta se ainda
 * for a navegação mais recente quando o módulo termina de carregar. A que
 * perdeu desiste **antes** de criar a tela, para não haver nada para vazar.
 */

export const RESULTADOS_NAVEGACAO = Object.freeze({
  MONTADA: 'MONTADA',
  DESCARTADA: 'DESCARTADA',
  FALHOU: 'FALHOU',
});

export function criarNavegador({ container, esvaziar, aoErro = () => {} } = {}) {
  if (!container || typeof container.append !== 'function') {
    throw new TypeError('criarNavegador exige um container capaz de receber a tela.');
  }
  if (typeof esvaziar !== 'function') {
    throw new TypeError('criarNavegador exige a função que esvazia o container.');
  }

  let geracao = 0;
  let desmontarAtual = null;

  function desmontarTelaAtual() {
    if (!desmontarAtual) return;
    try {
      desmontarAtual();
    } catch {
      /* A tela anterior pode já ter sido removida; a troca não pode parar por isso. */
    }
    desmontarAtual = null;
  }

  return {
    async navegar({ carregar, props = {} } = {}) {
      const token = ++geracao;
      desmontarTelaAtual();
      esvaziar(container);

      let pagina;
      try {
        pagina = await carregar();
      } catch (erro) {
        if (token !== geracao) return { estado: RESULTADOS_NAVEGACAO.DESCARTADA };
        aoErro(erro);
        return { estado: RESULTADOS_NAVEGACAO.FALHOU, erro };
      }

      // Outra navegação assumiu enquanto o módulo carregava. Desistir aqui,
      // antes de criar a tela, é o que impede tanto a duplicata no DOM quanto
      // a tela órfã sem desmontagem.
      if (token !== geracao) return { estado: RESULTADOS_NAVEGACAO.DESCARTADA };

      let resultado;
      try {
        resultado = pagina(props);
      } catch (erro) {
        aoErro(erro);
        return { estado: RESULTADOS_NAVEGACAO.FALHOU, erro };
      }

      desmontarAtual = typeof resultado?.desmontar === 'function' ? resultado.desmontar : null;
      container.append(resultado.elemento);
      return { estado: RESULTADOS_NAVEGACAO.MONTADA };
    },

    desmontar: desmontarTelaAtual,
    geracaoAtual: () => geracao,
    temTelaMontada: () => desmontarAtual !== null,
  };
}
