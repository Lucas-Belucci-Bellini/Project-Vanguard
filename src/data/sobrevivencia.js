/*
 * Conteúdo offline versionado do manual de sobrevivência.
 *
 * O catálogo é deliberadamente conservador: não diagnostica, não garante
 * comestibilidade e não ensina investigação, remoção ou manuseio de explosivos.
 */

export const FONTES = [
  {
    id: 'red-cross',
    nome: 'American Red Cross — Survival Skills',
    url: 'https://www.redcross.org/take-a-class/resources/articles/11-survival-skills-to-know',
    escopo: 'preparação, abrigo, água, sinalização e princípios iniciais de emergência',
  },
  {
    id: 'unmas',
    nome: 'UNMAS — What We Do',
    url: 'https://unmas.org/en/what-we-do',
    escopo: 'risco de minas e restos explosivos; afastamento e encaminhamento especializado',
  },
  {
    id: 'chm',
    nome: 'Centro de Hidrografia da Marinha — Cartas Náuticas',
    url: 'https://www.marinha.mil.br/chm/dados-do-segnav-cartas-nauticas',
    escopo: 'limites do uso de imagem de satélite e necessidade de cartas náuticas oficiais',
  },
];

export const GUIAS = [
  {
    id: 'agora',
    titulo: 'Estou em perigo agora',
    etiqueta: 'PRIMEIRO MINUTO',
    tom: 'critico',
    resumo: 'Pare, respire, observe riscos imediatos e preserve sua posição.',
    tags: ['emergência', 'prioridade', 'bateria'],
    fonteIds: ['red-cross'],
    revisadoEm: '2026-08-26',
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
    tags: ['atendimento', 'sangramento', 'queimadura'],
    fonteIds: ['red-cross'],
    revisadoEm: '2026-08-26',
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
    tags: ['abrigo', 'frio', 'calor'],
    fonteIds: ['red-cross'],
    revisadoEm: '2026-08-26',
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
    tags: ['água', 'contaminação', 'tratamento'],
    fonteIds: ['red-cross'],
    revisadoEm: '2026-08-26',
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
    tags: ['alimento', 'plantas', 'contaminação'],
    fonteIds: ['red-cross'],
    revisadoEm: '2026-08-26',
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
    tags: ['GPS', 'retorno', 'sinalização'],
    fonteIds: ['red-cross'],
    revisadoEm: '2026-08-26',
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
    tags: ['minas', 'explosivos', 'autoridade'],
    fonteIds: ['unmas'],
    revisadoEm: '2026-08-26',
    passos: [
      'Pare e não toque, não chute, não mova e não tente fotografar de perto.',
      'Se for possível sem atravessar outra área suspeita, afaste-se pelo caminho de chegada e mantenha outras pessoas afastadas.',
      'Marque a posição somente de uma distância segura, se isso não exigir aproximação, e informe as autoridades ou equipes especializadas.',
    ],
  },
];

export const VERSAO_SOBREVIVENCIA = 1;
export const REVISADO_EM = '2026-08-26';
