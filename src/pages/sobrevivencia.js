/*
 * #/sobrevivencia — manual local de preparação e primeiros passos.
 *
 * O conteúdo é educacional, fica disponível sem rede depois do carregamento e
 * sempre aponta para emergência local, treinamento e autoridades competentes.
 */

import { h } from '../ui/helpers.js';
import '../styles/sobrevivencia.css';

const GUIAS = [
  {
    id: 'agora',
    titulo: 'Estou em perigo agora',
    etiqueta: 'PRIMEIRO MINUTO',
    tom: 'critico',
    resumo: 'Pare, respire, observe riscos imediatos e preserve sua posição.',
    passos: [
      'Afaste-se de fogo, água em movimento, desabamento, fumaça, veículos e qualquer objeto suspeito somente se houver uma rota claramente segura.',
      'Acione o serviço local de emergência pelo canal disponível. Se não houver rede, prepare a mensagem com a última posição e tente um comunicador ou beacon compatível.',
      'Compartilhe sua posição apenas com um contato ou serviço confiável e economize bateria, mantendo o aparelho protegido.',
    ],
  },
  {
    id: 'primeiros-socorros',
    titulo: 'Primeiros socorros básicos',
    etiqueta: 'ATENDIMENTO INICIAL',
    tom: 'perigo',
    resumo: 'Controle riscos, peça ajuda e faça apenas o que você sabe executar.',
    passos: [
      'Verifique se o local é seguro antes de se aproximar. Não crie uma segunda vítima.',
      'Em sangramento importante, aplique pressão direta contínua com material limpo e acione emergência. Não remova objetos cravados.',
      'Em queimadura, interrompa a fonte de calor e procure orientação de emergência. Não aplique substâncias caseiras nem estoure bolhas.',
      'Em possível lesão de coluna, não mova a pessoa salvo perigo imediato. Mantenha comunicação e aguarde profissionais quando isso for possível.',
      'O aplicativo não diagnostica nem substitui curso de primeiros socorros, equipe médica ou serviço de emergência.',
    ],
  },
  {
    id: 'abrigo',
    titulo: 'Abrigo e temperatura',
    etiqueta: 'EXPOSIÇÃO',
    tom: 'normal',
    resumo: 'Reduza vento, chuva, frio ou calor antes de procurar comida.',
    passos: [
      'Escolha um local fora de encostas instáveis, leitos de rio, árvores comprometidas, áreas de avalanche e zonas interditadas.',
      'Isole o corpo do chão e mantenha roupa seca. A exposição prolongada pode causar hipotermia ou exaustão pelo calor.',
      'Não acenda fogo dentro de barraca ou espaço fechado. Respeite regras locais e riscos de incêndio.',
    ],
  },
  {
    id: 'agua',
    titulo: 'Água',
    etiqueta: 'RECURSO PRIORITÁRIO',
    tom: 'mar',
    resumo: 'Água transparente não é necessariamente água segura.',
    passos: [
      'Priorize a água que você levou e racionamento responsável. Evite água próxima de esgoto, animais mortos, combustível, produtos químicos ou áreas contaminadas.',
      'Use filtro, fervura ou tratamento comercial apenas conforme o equipamento e a instrução oficial do produto. Não improvise concentrações químicas.',
      'Em área contaminada ou após desastre, siga a autoridade local e não trate uma fonte suspeita como potável apenas porque parece limpa.',
    ],
  },
  {
    id: 'alimentacao',
    titulo: 'Alimentação e plantas',
    etiqueta: 'NÃO ARRISQUE',
    tom: 'perigo',
    resumo: 'O app não confirma que uma planta, fruta, cogumelo ou animal é comestível.',
    passos: [
      'Não experimente espécies desconhecidas, plantas parecidas, cogumelos ou alimentos encontrados em áreas contaminadas.',
      'Não use uma foto ou identificação automática como autorização para comer. Confie em conhecimento local especializado e fonte botânica confiável.',
      'Mantenha alimento levado de casa separado de água e solo possivelmente contaminados.',
    ],
  },
  {
    id: 'sinal',
    titulo: 'Sinalização e retorno',
    etiqueta: 'LOCALIZAÇÃO',
    tom: 'expedicao',
    resumo: 'Deixe um plano simples e preserve a última posição conhecida.',
    passos: [
      'Registre a posição, horário, direção de deslocamento e estado da bateria. O GPS pode continuar calculando posição sem internet, mas isso não envia a informação.',
      'Use lanterna, apito, roupa visível ou sinal combinado apenas quando isso for seguro e legal no local.',
      'Não abandone uma rota segura para buscar sinal. Tente pontos conhecidos, mantenha o mapa local e informe o plano a uma pessoa antes da saída.',
    ],
  },
  {
    id: 'explosivos',
    titulo: 'Minas e restos explosivos',
    etiqueta: 'PARE AGORA',
    tom: 'critico',
    resumo: 'Um alerta visual, objeto ou área suspeita deve ser tratado como risco real.',
    passos: [
      'Pare e não toque, não chute, não mova e não tente fotografar de perto.',
      'Se for possível sem atravessar outra área suspeita, afaste-se pelo caminho de chegada e mantenha outras pessoas afastadas.',
      'Marque a posição somente de uma distância segura, se isso não exigir aproximação, e informe as autoridades ou equipes especializadas.',
    ],
  },
];

function guiaCard(guia) {
  const detalhes = h('details', { className: `sobrevivencia__guia sobrevivencia__guia--${guia.tom}` },
    h('summary', null,
      h('span', { className: 'sobrevivencia__guia-tag' }, guia.etiqueta),
      h('strong', null, guia.titulo),
      h('span', { className: 'sobrevivencia__guia-arrow' }, '+')),
    h('p', { className: 'sobrevivencia__guia-resumo' }, guia.resumo),
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

  wrap.append(
    h('header', { className: 'sobrevivencia__header' },
      h('div', null,
        h('div', { className: 'sobrevivencia__eyebrow' }, 'VANGUARD FIELD / SOBREVIVÊNCIA'),
        h('h1', null, 'Conhecimento quando a rede some'),
        h('p', null, 'Um manual local de preparação e primeiros passos para cidade, caminhada, expedição, mar e emergências. Abra os cartões antes de sair e mantenha uma cópia física para situações críticas.')),
      h('button', { className: 'sobrevivencia__back', type: 'button', onclick: () => { location.hash = '#/inicio'; } }, '← INÍCIO')),
    checklist,
    h('div', { className: 'sobrevivencia__notice' },
      h('strong', null, 'CONTEÚDO DE APOIO'),
      h('p', null, 'Este material não substitui treinamento, atendimento médico, defesa civil, autoridade marítima ou equipe especializada. Em risco imediato, priorize sair do perigo e acionar ajuda.')),
    h('section', { className: 'sobrevivencia__grid', 'aria-label': 'Guias offline de sobrevivência' }, ...GUIAS.map(guiaCard)),
    h('footer', { className: 'sobrevivencia__footer' },
      h('strong', null, 'Fontes de revisão'),
      h('p', null, 'Conteúdo inicial baseado em orientações da American Red Cross, do UNMAS e do Centro de Hidrografia da Marinha. Consulte a documentação do repositório para links, data de revisão e limites de cada fonte.'),
      h('button', { className: 'sobrevivencia__text-button', type: 'button', onclick: () => { location.hash = '#/contexto'; } }, 'ABRIR MODOS DE CONTEXTO →')));
  raiz.append(wrap);

  return { elemento: raiz, desmontar: null };
}
