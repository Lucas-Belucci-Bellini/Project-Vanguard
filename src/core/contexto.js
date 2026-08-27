/*
 * Contexto local e offline-first.
 *
 * O motor só pode elevar um alerta quando existe uma zona conhecida, salva no
 * aparelho e com fonte/data registradas. Ele não faz detecção militar, não
 * inventa risco e não trata coordenada como prova de ameaça.
 */

export const CONTEXTOS = [
  {
    id: 'cidade',
    nome: 'Cidade',
    rotulo: 'CIDADE / DIA A DIA',
    descricao: 'Deslocamento cotidiano, caminhada urbana e pontos de encontro.',
    tom: 'normal',
    prioridade: 1,
    recursos: ['Mapa urbano', 'Destino', 'Pontos salvos', 'Rota local'],
    aviso: 'Confira alertas municipais quando houver conexão.',
  },
  {
    id: 'expedicao',
    nome: 'Expedição',
    rotulo: 'TRILHA / EXPEDIÇÃO',
    descricao: 'Orientação offline, retorno pelo caminho e pontos de referência.',
    tom: 'expedicao',
    prioridade: 1,
    recursos: ['Trilha offline', 'Bússola', 'MGRS', 'Modo Socorro'],
    aviso: 'GPS não transmite SOS sem um canal externo.',
  },
  {
    id: 'mar',
    nome: 'Mar',
    rotulo: 'MAR / NAVEGAÇÃO',
    descricao: 'Carta, profundidade publicada, maré e perigos conhecidos.',
    tom: 'mar',
    prioridade: 2,
    recursos: ['Carta náutica', 'Profundidade publicada', 'Marés', 'Avisos'],
    aviso: 'Imagem de satélite não substitui carta náutica atualizada.',
  },
  {
    id: 'desastre',
    nome: 'Zona de desastre',
    rotulo: 'ZONA DE DESASTRE',
    descricao: 'Afastamento, abrigo e informações de defesa civil.',
    tom: 'perigo',
    prioridade: 4,
    recursos: ['Aviso oficial', 'Abrigo', 'Rota de afastamento', 'SOS'],
    aviso: 'Siga a Defesa Civil, bombeiros e autoridades locais.',
  },
  {
    id: 'contaminada',
    nome: 'Área contaminada',
    rotulo: 'ÁREA CONTAMINADA',
    descricao: 'Área com risco publicado de contaminação química ou radiológica.',
    tom: 'critico',
    prioridade: 5,
    recursos: ['Zona de exclusão', 'Abrigo', 'Saída segura', 'Sensor externo'],
    aviso: 'O celular não mede radiação sozinho; não entre para investigar.',
  },
  {
    id: 'conflito',
    nome: 'Área de conflito',
    rotulo: 'ÁREA DE CONFLITO',
    descricao: 'Risco civil, restos explosivos e rotas humanitárias conhecidas.',
    tom: 'critico',
    prioridade: 5,
    recursos: ['Zona interditada', 'Risco de explosivos', 'Rota humanitária', 'Contato local'],
    aviso: 'Pare, não toque, afaste-se se for seguro e acione autoridades.',
  },
];

const POR_ID = new Map(CONTEXTOS.map((contexto) => [contexto.id, contexto]));
export const SCHEMA_ZONAS = 'vanguard-zonas';
export const VERSAO_ZONAS = 1;

export function contextoPorId(id) {
  return POR_ID.get(id) ?? POR_ID.get('cidade');
}

export function normalizarZona(zona) {
  const lat = Number(zona?.lat);
  const lon = Number(zona?.lon);
  if (!zona || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  const contexto = POR_ID.has(zona.contexto) ? zona.contexto : 'cidade';
  const raioBruto = Number(zona.raioM);
  if (!Number.isFinite(raioBruto) || raioBruto <= 0) return null;
  const raioM = Math.min(Math.max(raioBruto, 50), 100000);
  return {
    id: String(zona.id || `zona-${Date.now()}`),
    nome: String(zona.nome || contextoPorId(contexto).nome).slice(0, 120),
    contexto,
    lat,
    lon,
    raioM,
    fonte: String(zona.fonte || 'não informado').slice(0, 160),
    atualizadoEm: zona.atualizadoEm || new Date().toISOString(),
    validadeEm: zona.validadeEm || null,
    ativo: zona.ativo !== false,
  };
}

function distanciaM(a, b) {
  const raioTerra = 6371008.8;
  const lat1 = Number(a.lat) * Math.PI / 180;
  const lat2 = Number(b.lat) * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (Number(b.lon) - Number(a.lon)) * Math.PI / 180;
  const seno = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * raioTerra * Math.atan2(Math.sqrt(seno), Math.sqrt(1 - seno));
}

export function exportarZonas(zonas = []) {
  const normalizadas = zonas.map(normalizarZona).filter(Boolean);
  return JSON.stringify({
    schema: SCHEMA_ZONAS,
    version: VERSAO_ZONAS,
    exportadoEm: new Date().toISOString(),
    zonas: normalizadas,
  }, null, 2);
}

export function importarZonas(texto) {
  let pacote;
  try {
    pacote = JSON.parse(texto);
  } catch {
    throw new Error('JSON inválido');
  }
  if (!pacote || pacote.schema !== SCHEMA_ZONAS || pacote.version !== VERSAO_ZONAS || !Array.isArray(pacote.zonas)) {
    throw new Error('arquivo incompatível com o Vanguard Field');
  }
  const unicas = new Map();
  for (const item of pacote.zonas) {
    const zona = normalizarZona(item);
    if (zona) unicas.set(zona.id, zona);
  }
  return [...unicas.values()];
}

export function zonasAtivas(zonas = []) {
  const agora = Date.now();
  return zonas.map(normalizarZona).filter(Boolean).filter((zona) => {
    if (!zona.ativo || zona.raioM <= 0) return false;
    if (!zona.validadeEm) return true;
    const validade = Date.parse(zona.validadeEm);
    return Number.isFinite(validade) && validade >= agora;
  });
}

function posicaoValida(posicao) {
  const lat = Number(posicao?.lat);
  const lon = Number(posicao?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function detectarContexto(posicao, zonas = [], padrao = 'cidade') {
  const base = contextoPorId(padrao);
  if (!posicaoValida(posicao)) return { contexto: base, zona: null, distanciaM: null, confianca: 'sem posição válida' };
  const candidatas = zonasAtivas(zonas)
    .map((zona) => ({ zona, distanciaM: distanciaM(posicao, zona) }))
    .filter(({ zona, distanciaM: distancia }) => distancia <= zona.raioM)
    .sort((a, b) => contextoPorId(b.zona.contexto).prioridade - contextoPorId(a.zona.contexto).prioridade || a.distanciaM - b.distanciaM);
  const primeira = candidatas[0];
  if (!primeira) return { contexto: base, zona: null, distanciaM: null, confianca: 'padrão local' };
  return {
    contexto: contextoPorId(primeira.zona.contexto),
    zona: primeira.zona,
    distanciaM: primeira.distanciaM,
    confianca: primeira.zona.fonte === 'não informado' ? 'zona sem fonte' : 'zona publicada/local',
  };
}
