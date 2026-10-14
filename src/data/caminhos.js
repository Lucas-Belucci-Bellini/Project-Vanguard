/**
 * Caminhos de peregrinação — sequências de pontos com PROCEDÊNCIA.
 *
 * ## O que este arquivo é, e o que ele NÃO é
 *
 * Ele guarda a **sequência de municípios** de um caminho, geocodificada de uma
 * fonte verificável, com o identificador OSM de cada ponto ao lado. É o
 * suficiente para planejar um corredor de mapa offline que **contenha** o
 * caminho.
 *
 * Ele **não é o traçado**. A linha entre dois municípios aqui é uma **reta**,
 * e nenhuma peregrinação anda em reta: no Caminho dos Anjos a diferença é de
 * 22 km — a reta pelos municípios mede 84,2 km e a trilha real tem 106 km.
 *
 * Essa distinção não é preciosismo. Um aplicativo de navegação que desenhasse
 * a reta como se fosse o caminho mandaria alguém atravessar o que houver no
 * meio. Por isso:
 *
 * - `tipo: 'SEQUENCIA_DE_MUNICIPIOS'` viaja com o dado, e a interface mostra;
 * - o corredor recomendado é **largo** (10 km de cada lado), para conter a
 *   sinuosidade real sem precisar conhecê-la;
 * - quem tem o GPX oficial importa, e aí o corredor segue o traçado de verdade
 *   em vez desta aproximação.
 *
 * ## Como acrescentar um caminho aqui
 *
 * Geocodifique cada ponto num serviço que devolva identificador estável (o
 * Nominatim do OSM devolve `osm_type/osm_id`), guarde o identificador, a data
 * e a fonte da SEQUÊNCIA. Coordenada sem procedência é chute com aparência de
 * dado — a mesma regra dos coeficientes do WMM e do tamanho de tile.
 */

export const TIPOS_CAMINHO = Object.freeze({
  /** Sequência de cidades por onde o caminho passa. A reta entre elas não é a trilha. */
  SEQUENCIA_DE_MUNICIPIOS: 'SEQUENCIA_DE_MUNICIPIOS',
  /** Traçado real, ponto a ponto, importado de GPX/KML. */
  TRACADO: 'TRACADO',
});

export const CAMINHOS = Object.freeze([
  Object.freeze({
    id: 'caminhos-dos-anjos',
    nome: 'Caminhos dos Anjos',
    trecho: 'Catedral de Londrina → Bandeirantes',
    tipo: TIPOS_CAMINHO.SEQUENCIA_DE_MUNICIPIOS,

    /** Comprimento da TRILHA, segundo a fonte — não o da reta deste arquivo. */
    comprimentoDivulgadoKm: 106,
    /** Largura sugerida de cada lado, para o corredor conter a sinuosidade. */
    raioSugeridoKm: 10,

    procedencia: Object.freeze({
      sequencia: 'Associação de Peregrinos e Amigos dos Caminhos de São Miguel Arcanjo (APACSMA) — caminhosdosanjos.com.br; sequência de municípios também noticiada pelo Portal Bonde (jun/2025).',
      coordenadas: 'Nominatim / OpenStreetMap',
      geocodificadoEm: '2026-09-06',
      observacao: 'O Santuário de São Miguel Arcanjo NÃO está indexado no Nominatim; o último ponto é a sede do município de Bandeirantes. Com 10 km de cada lado, o corredor cobre o entorno dele.',
    }),

    pontos: Object.freeze([
      Object.freeze({ nome: 'Catedral Metropolitana de Londrina', lat: -23.31206, lon: -51.15955, osm: 'way/380625996' }),
      Object.freeze({ nome: 'Ibiporã', lat: -23.26841, lon: -51.04759, osm: 'relation/297680' }),
      Object.freeze({ nome: 'Jataizinho', lat: -23.25782, lon: -50.97775, osm: 'relation/297744' }),
      Object.freeze({ nome: 'Uraí', lat: -23.20000, lon: -50.79387, osm: 'relation/297592' }),
      Object.freeze({ nome: 'Cornélio Procópio', lat: -23.18252, lon: -50.64993, osm: 'relation/297661' }),
      Object.freeze({ nome: 'Santa Mariana', lat: -23.14994, lon: -50.51996, osm: 'relation/297527' }),
      Object.freeze({ nome: 'Bandeirantes', lat: -23.10779, lon: -50.37041, osm: 'relation/297472' }),
    ]),
  }),
]);

export function caminhoPorId(id) {
  return CAMINHOS.find((caminho) => caminho.id === id) ?? null;
}

/**
 * O aviso que precisa acompanhar um caminho na tela.
 *
 * Fica aqui, junto do dado, e não espalhado pela interface: se um dia entrar
 * um caminho com traçado real, o aviso muda com ele em vez de continuar
 * dizendo a coisa errada em algum canto esquecido.
 */
export function avisoDoCaminho(caminho) {
  if (!caminho) return '';
  if (caminho.tipo === TIPOS_CAMINHO.TRACADO) {
    return `Traçado importado, ponto a ponto (${caminho.procedencia?.sequencia ?? 'origem não declarada'}).`;
  }
  return `Sequência de ${caminho.pontos.length} municípios, não o traçado: a linha entre eles é RETA. A trilha real tem ${caminho.comprimentoDivulgadoKm} km contra os ~84 km da reta — por isso o corredor sugerido é largo (${caminho.raioSugeridoKm} km de cada lado). Tendo o GPX oficial, importe: aí o corredor segue o caminho de verdade.`;
}
