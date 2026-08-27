/**
 * Identifica o formato de um arquivo de registro sem abrir ou interpretar seu
 * conteúdo. A extensão e o MIME são apenas sinais; quando ambos são
 * específicos e discordam, a seleção é rejeitada para evitar importar um
 * formato com o parser errado.
 */

export const FORMATOS_REGISTRO = Object.freeze({
  JSON: 'json',
  GPX: 'gpx',
  KML: 'kml',
});

const FORMATOS_POR_EXTENSAO = Object.freeze({
  json: FORMATOS_REGISTRO.JSON,
  gpx: FORMATOS_REGISTRO.GPX,
  kml: FORMATOS_REGISTRO.KML,
});

const FORMATOS_POR_MIME = Object.freeze({
  'application/json': FORMATOS_REGISTRO.JSON,
  'text/json': FORMATOS_REGISTRO.JSON,
  'application/gpx+xml': FORMATOS_REGISTRO.GPX,
  'application/vnd.google-earth.kml+xml': FORMATOS_REGISTRO.KML,
  'application/kml+xml': FORMATOS_REGISTRO.KML,
});

function textoNormalizado(valor) {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
}

export function extensaoRegistro(nome) {
  const base = textoNormalizado(nome).split(/[\\/]/).pop() ?? '';
  const encontrado = base.match(/\.([a-z0-9]+)$/i);
  return encontrado?.[1]?.toLowerCase() ?? null;
}

export function mimeRegistro(tipo) {
  const mime = textoNormalizado(tipo).split(';', 1)[0].trim();
  return mime || null;
}

/**
 * Retorna o formato a ser usado pelo parser. O objeto aceita somente metadados
 * compatíveis com File ({ name, type }); não depende de DOM, FileReader ou
 * rede, portanto pode ser testado no Node e usado em Capacitor.
 */
export function detectarFormatoRegistro({ name = '', type = '' } = {}) {
  const extensao = extensaoRegistro(name);
  const mime = mimeRegistro(type);
  const formatoExtensao = extensao ? FORMATOS_POR_EXTENSAO[extensao] : undefined;
  const formatoMime = mime ? FORMATOS_POR_MIME[mime] : undefined;

  if (formatoExtensao && formatoMime && formatoExtensao !== formatoMime) {
    throw new Error('Extensão e MIME do registro não correspondem. Selecione o arquivo correto.');
  }

  const formato = formatoExtensao ?? formatoMime;
  if (!formato) {
    throw new Error('Formato de registro não reconhecido. Use um arquivo JSON, GPX ou KML.');
  }

  return Object.freeze({ formato, extensao, mime });
}
