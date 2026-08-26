/*
 * Contratos para integrações externas futuras.
 *
 * Nada neste módulo acessa rádio, satélite, Geiger ou sonar. Ele valida e
 * normaliza dados de um equipamento/provedor que venha a ser conectado.
 */

export const EQUIPAMENTOS_EXTERNOS = [
  {
    id: 'geiger',
    nome: 'Contador Geiger / dosímetro',
    unidade: 'µSv/h',
    uso: 'Leitura radiológica fornecida por sensor externo calibrado.',
    requer: 'bluetooth ou cabo compatível',
  },
  {
    id: 'satellite',
    nome: 'Mensageiro via satélite',
    unidade: 'mensagem',
    uso: 'Envio de SOS e coordenadas quando não há rede móvel.',
    requer: 'conta, céu aberto e dispositivo/provedor compatível',
  },
  {
    id: 'beacon',
    nome: 'Beacon de emergência',
    unidade: 'alerta',
    uso: 'Transmissão de alerta por equipamento dedicado.',
    requer: 'registro e equipamento habilitado',
  },
  {
    id: 'radio',
    nome: 'Rádio de dados',
    unidade: 'pacote',
    uso: 'Comunicação local com rede autorizada.',
    requer: 'rádio, frequência e autorização aplicáveis',
  },
  {
    id: 'sonar',
    nome: 'Sonar / ecossonda',
    unidade: 'profundidade',
    uso: 'Profundidade observada pela embarcação.',
    requer: 'sensor instalado e calibrado',
  },
];

function textoSeguro(valor, limite = 160) {
  return String(valor ?? '').trim().slice(0, limite);
}

export function validarLeituraRadiacao(leitura) {
  if (!leitura || !Number.isFinite(Number(leitura.valor)) || Number(leitura.valor) < 0) return null;
  if (!['µSv/h', 'mSv/h', 'cpm', 'cps'].includes(leitura.unidade)) return null;
  if (!leitura.timestamp || !leitura.dispositivo) return null;
  return {
    tipo: 'radiacao',
    valor: Number(leitura.valor),
    unidade: leitura.unidade,
    timestamp: new Date(leitura.timestamp).toISOString(),
    dispositivo: textoSeguro(leitura.dispositivo),
    calibracaoEm: leitura.calibracaoEm ? new Date(leitura.calibracaoEm).toISOString() : null,
    confianca: ['baixa', 'media', 'alta'].includes(leitura.confianca) ? leitura.confianca : 'media',
  };
}

export function prepararMensagemExterna({ posicao, tipo = 'sos', texto = '' } = {}) {
  if (!posicao || !Number.isFinite(Number(posicao.lat)) || !Number.isFinite(Number(posicao.lon))) return null;
  return {
    id: `out-${Date.now()}`,
    tipo: textoSeguro(tipo, 40),
    lat: Number(posicao.lat),
    lon: Number(posicao.lon),
    accuracy: Number.isFinite(Number(posicao.accuracy)) ? Number(posicao.accuracy) : null,
    timestamp: new Date(posicao.timestamp || Date.now()).toISOString(),
    texto: textoSeguro(texto, 500),
    estado: 'preparada',
    confirmadoPor: null,
  };
}

export function normalizarAlertaOficial(alerta) {
  if (!alerta || !alerta.fonte || !alerta.titulo || !alerta.publicadoEm) return null;
  const severidade = ['informativo', 'atenção', 'perigo', 'crítico'].includes(alerta.severidade) ? alerta.severidade : 'informativo';
  const retorno = {
    id: textoSeguro(alerta.id || `alerta-${Date.now()}`, 80),
    tipo: textoSeguro(alerta.tipo || 'geral', 40),
    titulo: textoSeguro(alerta.titulo, 120),
    fonte: textoSeguro(alerta.fonte, 180),
    severidade,
    publicadoEm: new Date(alerta.publicadoEm).toISOString(),
    expiraEm: alerta.expiraEm ? new Date(alerta.expiraEm).toISOString() : null,
    url: textoSeguro(alerta.url, 300),
    lat: Number.isFinite(Number(alerta.lat)) ? Number(alerta.lat) : null,
    lon: Number.isFinite(Number(alerta.lon)) ? Number(alerta.lon) : null,
  };
  return retorno.titulo && retorno.fonte ? retorno : null;
}
