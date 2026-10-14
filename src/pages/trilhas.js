/**
 * Trilhas — o que cada um andou de verdade.
 *
 * ## A pergunta que esta tela responde
 *
 * Dez pessoas saem do mesmo lugar e chegam no mesmo lugar, e **nenhuma anda a
 * mesma coisa**. Uma corta por dentro, outra erra a saída e volta, outra pega
 * a variante por outra cidade. No fim, "andei o Caminho" quer dizer coisas
 * diferentes para cada uma — e é isso que a tabela mostra.
 *
 * ## A referência é um guia, não a verdade
 *
 * O traçado de referência pode ser antigo. Quando quatro pessoas passam por
 * fora dele no mesmo lugar, o provável é que **o caminho mudou**, não que
 * quatro pessoas erraram. Por isso a tela nunca escreve "errou": ela mostra
 * onde as trilhas divergem, quanto, e **quantas pessoas** sustentam cada
 * divergência.
 *
 * O aplicativo não gera traçado novo. Ele conta quem passou por onde; a
 * decisão de atualizar o guia é de quem organiza a caminhada.
 */
import '../styles/trilhas.css';
import { h } from '../ui/helpers.js';
import { rastreamentoDoAplicativo } from '../core/rastreamento-app.js';
import { criarAcervo, acervoIndexedDB, acervoEmMemoria, ORIGEM_TRILHA } from '../core/dados/acervo-trilhas.js';
import { compararComReferencia, consensoDeTrilhas, FAIXA_PADRAO_M, MINIMO_DE_TRILHAS_PADRAO } from '../engine/comparar-trilhas.js';
import { medirDistancia } from '../engine/distancia.js';
import { importarRegistroGpx, importarRegistroKml, importarRegistroLocal } from '../core/registro-offline.js';
import { detectarFormatoRegistro, FORMATOS_REGISTRO } from '../core/registro-arquivo.js';
import { formatarDistancia } from '../ui/formato-trajeto.js';

const ROTULO_ORIGEM = {
  [ORIGEM_TRILHA.GRAVADA]: 'gravada aqui',
  [ORIGEM_TRILHA.IMPORTADA]: 'importada',
  [ORIGEM_TRILHA.REFERENCIA]: 'referência',
};

export function trilhasPage() {
  const rastreio = rastreamentoDoAplicativo();
  const gravador = rastreio.gravador;

  let guarda;
  try { guarda = globalThis.indexedDB ? acervoIndexedDB() : acervoEmMemoria(); }
  catch { guarda = acervoEmMemoria(); }
  const acervo = criarAcervo({ guarda });

  const raiz = h('div', { className: 'vg-pagina trilhas' });
  const rolagem = h('div', { className: 'trilhas__scroll' });

  let guardadas = [];
  let referenciaId = null;
  let desmontado = false;

  const status = h('p', { className: 'trilhas__status', role: 'status', ariaLive: 'polite' }, 'Carregando o acervo…');
  const lista = h('div', { className: 'trilhas__lista' });
  const tabela = h('div', { className: 'trilhas__tabela' });
  const consenso = h('div', { className: 'trilhas__consenso' });

  const seletorReferencia = h('select', { className: 'trilhas__select', ariaLabel: 'Trilha de referência' });
  const arquivo = h('input', { type: 'file', accept: '.json,.gpx,.kml,application/json,application/gpx+xml', style: 'display:none' });
  const botaoImportar = h('button', { className: 'trilhas__botao', type: 'button' }, 'IMPORTAR GPX / KML / JSON');
  const botaoGuardarAtual = h('button', { className: 'trilhas__botao', type: 'button' }, 'GUARDAR A TRILHA DESTE APARELHO');

  /** Distância pelo mesmo odômetro do resto do app — vão de sinal declarado. */
  function distanciaDe(pontos) {
    const m = medirDistancia(pontos);
    return { metros: m.observadaM, vaos: m.vaos.quantidade, naoObservadaM: m.vaos.naoObservadaM };
  }

  function pintarLista() {
    if (!guardadas.length) {
      lista.replaceChildren(h('p', { className: 'trilhas__vazio' },
        'Nenhuma trilha guardada. Importe o GPX de cada pessoa, ou guarde a trilha que este aparelho gravou — comparar exige pelo menos duas.'));
      return;
    }
    lista.replaceChildren(...guardadas.map((t) => {
      const d = distanciaDe(t.pontos);
      const f = formatarDistancia(d.metros);
      const apagar = h('button', { className: 'trilhas__apagar', type: 'button' }, 'APAGAR');
      apagar.onclick = async () => {
        // Apagar exige o nome exato: lista é fácil de tocar por engano, e a
        // caminhada de alguém não volta.
        const digitado = window.prompt(`Para apagar, digite o nome exato da trilha:\n\n${t.nome}`);
        if (digitado === null) return;
        const r = await acervo.remover(t.id, digitado);
        if (!r.removida) { status.textContent = `Nada foi apagado: o nome não confere com "${t.nome}".`; return; }
        status.textContent = `"${t.nome}" apagada do acervo.`;
        await recarregar();
      };
      return h('div', { className: 'trilhas__item' },
        h('div', { className: 'trilhas__item-topo' },
          h('strong', null, t.nome),
          h('span', { className: 'trilhas__etiqueta' }, ROTULO_ORIGEM[t.origem] ?? t.origem)),
        h('p', { className: 'trilhas__item-meta' },
          `${f.valor} ${f.unidade} · ${t.totalPontos} pontos`
          + (d.vaos ? ` · ${Math.round(d.naoObservadaM)} m sem registro em ${d.vaos} trecho${d.vaos > 1 ? 's' : ''}` : '')
          + (t.arquivo ? ` · ${t.arquivo}` : '')),
        apagar);
    }));
  }

  function pintarSeletor() {
    seletorReferencia.replaceChildren(
      h('option', { value: '' }, guardadas.length ? 'Escolha a referência' : 'Nenhuma trilha guardada'),
      ...guardadas.map((t) => h('option', { value: t.id }, `${t.nome} (${ROTULO_ORIGEM[t.origem] ?? t.origem})`)));
    if (referenciaId) seletorReferencia.value = referenciaId;
  }

  function pintarComparacao() {
    const ref = guardadas.find((t) => t.id === referenciaId);
    if (!ref) {
      tabela.replaceChildren(h('p', { className: 'trilhas__vazio' }, 'Escolha uma trilha como referência para comparar as outras com ela.'));
      consenso.replaceChildren();
      return;
    }
    const outras = guardadas.filter((t) => t.id !== ref.id);
    if (!outras.length) {
      tabela.replaceChildren(h('p', { className: 'trilhas__vazio' }, 'Só há a referência guardada. Importe ao menos mais uma trilha para comparar.'));
      consenso.replaceChildren();
      return;
    }

    tabela.replaceChildren(
      h('div', { className: 'trilhas__linha trilhas__linha--cabecalho' },
        h('span', null, 'QUEM'), h('span', null, 'ANDOU'), h('span', null, 'NO CAMINHO'), h('span', null, 'MAIOR DESVIO')),
      ...outras.map((t) => {
        const c = compararComReferencia(t.pontos, ref.pontos);
        const d = distanciaDe(t.pontos);
        const f = formatarDistancia(d.metros);
        if (!c.comparavel) {
          return h('div', { className: 'trilhas__linha' },
            h('span', null, t.nome), h('span', null, `${f.valor} ${f.unidade}`), h('span', null, '—'), h('span', null, 'referência curta'));
        }
        const maior = c.desvios[0];
        return h('div', { className: `trilhas__linha${c.fracaoNoCaminho < 0.8 ? ' is-divergente' : ''}` },
          h('span', null, t.nome),
          h('span', null, `${f.valor} ${f.unidade}`),
          h('span', null, `${Math.round(c.fracaoNoCaminho * 100)} %`),
          h('span', null, maior ? `${Math.round(maior.maiorAfastamentoM)} m` : '—'));
      }));

    const co = consensoDeTrilhas(outras, ref.pontos);
    if (!co.comparavel) { consenso.replaceChildren(); return; }
    consenso.replaceChildren(
      h('h2', null, 'O QUE AS TRILHAS DIZEM SOBRE O GUIA'),
      h('p', { className: 'trilhas__consenso-linha' },
        `CONFIRMADO — ${Math.round(co.confirmado.fracao * 100)} % da referência teve ${co.minimoDeTrilhas} ou mais pessoas passando.`),
      h('p', { className: 'trilhas__consenso-linha' },
        `SEM MOVIMENTO — ${Math.round(co.abandonado.fracao * 100)} % da referência teve menos que isso. Pode ter mudado, pode ter fechado, pode ser que ninguém tenha ido lá ainda.`),
      h('p', { className: 'trilhas__consenso-linha' },
        co.novo.length
          ? `CAMINHO NOVO — ${co.novo.length} lugares fora da referência com ${co.minimoDeTrilhas}+ pessoas passando. O maior tem ${co.novo[0].trilhas}, em ${co.novo[0].lat.toFixed(5)}, ${co.novo[0].lon.toFixed(5)}.`
          : 'CAMINHO NOVO — nenhum lugar fora da referência com gente suficiente para sugerir mudança.'),
      h('p', { className: 'trilhas__nota' },
        `Faixa de ${FAIXA_PADRAO_M} m em torno da referência; mínimo de ${MINIMO_DE_TRILHAS_PADRAO} pessoas para contar como padrão, não como alguém que se perdeu. `
        + 'O aplicativo NÃO desenha traçado novo: a média entre duas variantes legítimas passa pelo meio do mato. Ele conta quem passou por onde — a decisão de mudar o guia é de quem organiza a caminhada.'));
  }

  async function recarregar() {
    guardadas = await acervo.listar().catch(() => []);
    if (referenciaId && !guardadas.some((t) => t.id === referenciaId)) referenciaId = null;
    if (desmontado) return;
    pintarLista();
    pintarSeletor();
    pintarComparacao();
  }

  seletorReferencia.onchange = () => { referenciaId = seletorReferencia.value || null; pintarComparacao(); };

  botaoImportar.onclick = () => arquivo.click();
  arquivo.onchange = async () => {
    const f = arquivo.files?.[0];
    if (!f) return;
    try {
      const formato = detectarFormatoRegistro(f).formato;
      const texto = await f.text();
      const registro = formato === FORMATOS_REGISTRO.GPX ? importarRegistroGpx(texto)
        : formato === FORMATOS_REGISTRO.KML ? importarRegistroKml(texto)
          : importarRegistroLocal(texto);
      const sugerido = f.name.replace(/\.(gpx|kml|json)$/i, '');
      const nome = window.prompt('De quem é esta trilha? (o nome aparece na comparação)', sugerido);
      if (nome === null) return;
      const r = await acervo.guardar({ nome, pontos: registro.trilha, origem: ORIGEM_TRILHA.IMPORTADA, arquivo: f.name });
      status.textContent = r.guardada
        ? `"${r.trilha.nome}" guardada: ${r.trilha.totalPontos} pontos. A trilha em gravação neste aparelho não foi tocada.`
        : r.motivo === 'TRILHA_VAZIA' ? 'O arquivo não trouxe nenhum ponto de trilha.' : 'Informe um nome para guardar.';
      await recarregar();
    } catch (erro) {
      status.textContent = erro?.message ?? 'Não foi possível ler este arquivo.';
    } finally {
      arquivo.value = '';
    }
  };

  botaoGuardarAtual.onclick = async () => {
    const pontos = gravador.trilha();
    if (!pontos.length) { status.textContent = 'Este aparelho ainda não tem trilha gravada.'; return; }
    const nome = window.prompt('Nome para esta cópia (a trilha em gravação continua intacta):', `Este aparelho — ${new Date().toLocaleDateString('pt-BR')}`);
    if (nome === null) return;
    // COPIA. A trilha em gravação continua exatamente onde estava.
    const r = await acervo.guardar({ nome, pontos: [...pontos], origem: ORIGEM_TRILHA.GRAVADA });
    status.textContent = r.guardada
      ? `Cópia guardada com ${r.trilha.totalPontos} pontos. A gravação em andamento não foi interrompida nem alterada.`
      : 'Informe um nome para guardar.';
    await recarregar();
  };

  rolagem.append(
    h('header', { className: 'trilhas__topo' },
      h('h1', null, 'Trilhas'),
      h('p', { className: 'trilhas__subtitulo' }, 'O que cada pessoa andou de verdade — e o que isso diz sobre o guia.')),
    h('section', { className: 'trilhas__cartao' },
      h('h2', null, 'ACERVO'), lista, status,
      h('div', { className: 'trilhas__acoes' }, botaoImportar, botaoGuardarAtual), arquivo),
    h('section', { className: 'trilhas__cartao' },
      h('h2', null, 'COMPARAR COM UMA REFERÊNCIA'), seletorReferencia, tabela),
    h('section', { className: 'trilhas__cartao trilhas__cartao--consenso' }, consenso),
    h('section', { className: 'trilhas__cartao trilhas__cartao--nota' },
      h('h2', null, 'Como ler estes números'),
      h('p', null, '“Andou” é a distância medida pelo mesmo odômetro do resto do app: soma o desnível, peneira o tremor do GPS e não conta trecho sem sinal como caminhada.'),
      h('p', null, '“No caminho” é a fração dos fixos da pessoa que caiu dentro de 60 m da referência. Sessenta metros porque o erro do GNSS nas duas trilhas soma quase 30 m — abaixo disso a medida vira contagem de erro de GPS, não de caminho.'),
      h('p', null, 'Divergência não é erro. Se a referência é antiga e quatro pessoas passaram pelo mesmo lugar fora dela, o provável é que o caminho mudou — e é isso que o quadro acima aponta, para você ir conferir.')),
  );

  raiz.append(rolagem);
  void recarregar();

  return { elemento: raiz, desmontar: () => { desmontado = true; } };
}
