/*
 * #/sobrevivencia — manual local de preparação e primeiros passos.
 *
 * O conteúdo é educacional, fica disponível sem rede depois do carregamento e
 * sempre aponta para emergência local, treinamento e autoridades competentes.
 */

import { h } from '../ui/helpers.js';
import { FONTES, GUIAS, REVISADO_EM, VERSAO_SOBREVIVENCIA } from '../data/sobrevivencia.js';
import '../styles/sobrevivencia.css';

const TAGS = ['todos', ...new Set(GUIAS.flatMap((guia) => guia.tags))];
const FONTES_POR_ID = new Map(FONTES.map((fonte) => [fonte.id, fonte]));

function guiaCard(guia) {
  const detalhes = h('details', { className: `sobrevivencia__guia sobrevivencia__guia--${guia.tom}` },
    h('summary', null,
      h('span', { className: 'sobrevivencia__guia-tag' }, guia.etiqueta),
      h('strong', null, guia.titulo),
      h('span', { className: 'sobrevivencia__guia-arrow' }, '+')),
    h('p', { className: 'sobrevivencia__guia-resumo' }, guia.resumo),
    h('div', { className: 'sobrevivencia__guia-meta' },
      h('span', null, `REVISADO EM ${guia.revisadoEm}`),
      h('span', null, guia.tags.join(' · '))),
    h('ol', null, ...guia.passos.map((passo) => h('li', null, passo))));
  detalhes.dataset.guia = guia.id;
  return detalhes;
}

export function sobrevivenciaPage() {
  const raiz = h('div', { className: 'vg-pagina sobrevivencia' });
  const wrap = h('div', { className: 'sobrevivencia__wrap' });
  const checklist = h('div', { className: 'sobrevivencia__checklist' },
    h('span', null, 'ANTES DE SAIR'),
    h('strong', null, 'GPS + mapa offline + água + luz + bateria + contato + plano de retorno'));
  const busca = h('input', { className: 'sobrevivencia__search', type: 'search', placeholder: 'Buscar no manual offline', 'aria-label': 'Buscar no manual offline' });
  const filtro = h('select', { className: 'sobrevivencia__filter', 'aria-label': 'Filtrar guias do manual' },
    ...TAGS.map((tag) => h('option', { value: tag }, tag === 'todos' ? 'TODOS OS TEMAS' : tag.toUpperCase())));
  const contador = h('p', { className: 'sobrevivencia__count', role: 'status' });
  const grade = h('section', { className: 'sobrevivencia__grid', 'aria-label': 'Guias offline de sobrevivência' });

  function renderGuias() {
    const termo = busca.value.trim().toLocaleLowerCase();
    const tag = filtro.value;
    const filtradas = GUIAS.filter((guia) => {
      const texto = [guia.titulo, guia.etiqueta, guia.resumo, ...guia.tags, ...guia.passos].join(' ').toLocaleLowerCase();
      return (tag === 'todos' || guia.tags.includes(tag)) && (!termo || texto.includes(termo));
    });
    for (const child of grade.children) child.remove();
    grade.append(...filtradas.map(guiaCard));
    contador.textContent = `${filtradas.length} de ${GUIAS.length} guias disponíveis sem internet · catálogo v${VERSAO_SOBREVIVENCIA}`;
  }

  busca.oninput = renderGuias;
  filtro.onchange = renderGuias;

  wrap.append(
    h('header', { className: 'sobrevivencia__header' },
      h('div', null,
        h('div', { className: 'sobrevivencia__eyebrow' }, 'SOBREVIVÊNCIA'),
        h('h1', null, 'Conhecimento quando a rede some'),
        h('p', null, 'Um manual local de preparação e primeiros passos para cidade, caminhada, expedição, mar e emergências. Abra os cartões antes de sair e mantenha uma cópia física para situações críticas.')),
      h('button', { className: 'sobrevivencia__back', type: 'button', onclick: () => { location.hash = '#/inicio'; } }, '← INÍCIO')),
    checklist,
    h('div', { className: 'sobrevivencia__notice' },
      h('strong', null, 'CONTEÚDO DE APOIO'),
      h('p', null, 'Este material não substitui treinamento, atendimento médico, defesa civil, autoridade marítima ou equipe especializada. Em risco imediato, priorize sair do perigo e acionar ajuda.')),
    h('div', { className: 'sobrevivencia__tools' }, busca, filtro),
    contador,
    grade,
    h('footer', { className: 'sobrevivencia__footer' },
      h('strong', null, `Fontes de revisão · catálogo ${REVISADO_EM}`),
      h('p', null, 'As fontes são referências de revisão, não conexão em tempo real. O conteúdo permanece local e deve ser confrontado com autoridades e instruções do cenário.'),
      h('ul', null, ...FONTES.map((fonte) => h('li', null, h('a', { href: fonte.url, target: '_blank', rel: 'noreferrer' }, fonte.nome), ` — ${fonte.escopo}.`))),
      h('p', null, `Guias com fonte: ${GUIAS.map((guia) => guia.fonteIds.map((id) => FONTES_POR_ID.get(id)?.nome ?? id).join(', ')).join(' · ')}.`),
      h('button', { className: 'sobrevivencia__text-button', type: 'button', onclick: () => { location.hash = '#/contexto'; } }, 'ABRIR MODOS DE CONTEXTO →')));
  raiz.append(wrap);
  renderGuias();

  return { elemento: raiz, desmontar: null };
}
