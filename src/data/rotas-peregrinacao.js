const congelarRota = (rota) => Object.freeze({
  ...rota,
  cidades: Object.freeze([...(rota.cidades ?? [])]),
  fontes: Object.freeze([...(rota.fontes ?? [])]),
});

export const ESTADOS_ROTA = Object.freeze({
  REFERENCIA: 'REFERENCIA',
  NAO_CONFIRMADA: 'NAO_CONFIRMADA',
});

export const TIPOS_ROTA = Object.freeze({
  PEREGRINACAO: 'PEREGRINAÇÃO',
  RELIGIOSA: 'RELIGIOSA / TURISMO',
  NAO_CLASSIFICADA: 'NÃO CLASSIFICADA',
});

/**
 * Catálogo informativo, não um catálogo de geometrias.
 * Uma rota só pode entrar na navegação quando receber um GPX/KML oficial ou
 * explicitamente autorizado. Cidades e fontes não são conectadas aqui.
 */
export const ROTAS_PEREGRINACAO = Object.freeze([
  congelarRota({
    id: 'caminhos-dos-anjos',
    nome: 'Caminhos dos Anjos',
    tipo: TIPOS_ROTA.RELIGIOSA,
    regiao: 'Norte do Paraná',
    estado: ESTADOS_ROTA.REFERENCIA,
    navegacaoDisponivel: false,
    resumo: 'Rota religiosa entre Londrina e o Santuário São Miguel Arcanjo, em Bandeirantes.',
    cidades: ['Londrina', 'Ibiporã', 'Jataizinho', 'Uraí', 'Cruzeiro do Norte', 'Congonhas', 'Cornélio Procópio', 'Bandeirantes'],
    fontes: [
      'https://caminhosdosanjos.com.br/cidades/',
      'https://caminhosdosanjos.com.br/wp-content/uploads/2025/09/01.-Lei-Caminhos-dos-Anjos-Estadual.pdf',
    ],
  }),
  congelarRota({
    id: 'caminho-da-fe',
    nome: 'Caminho da Fé',
    tipo: TIPOS_ROTA.PEREGRINACAO,
    regiao: 'São Paulo e Minas Gerais',
    estado: ESTADOS_ROTA.REFERENCIA,
    navegacaoDisponivel: false,
    resumo: 'Rota de peregrinação com ramais, cidades, planejamento e mapa publicados pela associação.',
    fontes: ['https://caminhodafe.com.br/ptbr/'],
  }),
  congelarRota({
    id: 'rota-do-rosario',
    nome: 'Rota do Rosário',
    tipo: TIPOS_ROTA.RELIGIOSA,
    regiao: 'Norte Pioneiro do Paraná',
    estado: ESTADOS_ROTA.REFERENCIA,
    navegacaoDisponivel: false,
    resumo: 'Roteiro religioso e turístico com santuários, eventos, peregrinações e trajetos rurais.',
    fontes: ['https://rotadorosario.org/'],
  }),
  congelarRota({
    id: 'caminho-sagrado',
    nome: 'Caminho Sagrado',
    tipo: TIPOS_ROTA.PEREGRINACAO,
    regiao: 'Sul de Santa Catarina',
    estado: ESTADOS_ROTA.REFERENCIA,
    navegacaoDisponivel: false,
    resumo: 'Circuito de peregrinação descrito pelo organizador como percurso para trekking ou bicicleta.',
    cidades: ['Nova Veneza', 'Siderópolis', 'Treviso', 'Urussanga', 'Pedras Grandes', 'Morro da Fumaça', 'Içara', 'Forquilhinha', 'Treze de Maio', 'Criciúma'],
    fontes: ['https://caminhosagrado.org/'],
  }),
  congelarRota({
    id: 'rota-do-carvalho',
    nome: 'Rota do Carvalho',
    tipo: TIPOS_ROTA.NAO_CLASSIFICADA,
    regiao: 'Não confirmada',
    estado: ESTADOS_ROTA.NAO_CONFIRMADA,
    navegacaoDisponivel: false,
    resumo: 'Nome mencionado em referências de trilha, mas ainda sem fonte oficial suficiente para classificá-lo como peregrinação.',
    fontes: [],
  }),
]);

export function rotaPorId(id) {
  return ROTAS_PEREGRINACAO.find((rota) => rota.id === id) ?? ROTAS_PEREGRINACAO[0];
}

export function statusRotaLabel(rota) {
  if (!rota) return 'ROTA NÃO ENCONTRADA';
  if (rota.estado === ESTADOS_ROTA.NAO_CONFIRMADA) return 'NÃO CONFIRMADA · FORA DA NAVEGAÇÃO';
  return rota.navegacaoDisponivel ? 'TRAÇADO AUTORIZADO' : 'REFERÊNCIA · TRAÇADO LOCAL NECESSÁRIO';
}
