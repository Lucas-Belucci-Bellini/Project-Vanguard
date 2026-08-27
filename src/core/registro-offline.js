/**
 * Contrato versionado para transportar dados de navegação entre aparelhos.
 *
 * O arquivo é deliberadamente JSON simples: não executa conteúdo externo, não
 * contém HTML e não tenta sincronizar dados com qualquer servidor.
 */

export const REGISTRO_SCHEMA = 'vanguard-registro-local';
export const REGISTRO_VERSION = 1;
export const LIMITE_TRILHA = 4000;
export const LIMITE_WAYPOINTS = 1000;

function numeroValido(valor, minimo, maximo) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo;
}

function clonarNumero(valor) {
  return Number.isFinite(Number(valor)) ? Number(valor) : undefined;
}

function normalizarPonto(ponto, indice, { nomePadrao = 'Ponto' } = {}) {
  if (!ponto || typeof ponto !== 'object') throw new Error('Ponto inválido.');
  if (!numeroValido(ponto.lat, -90, 90) || !numeroValido(ponto.lon, -180, 180)) {
    throw new Error('Ponto fora dos limites de latitude/longitude.');
  }
  const normalizado = {
    id: typeof ponto.id === 'string' && ponto.id.trim() ? ponto.id.trim().slice(0, 100) : `importado-${indice + 1}`,
    nome: typeof ponto.nome === 'string' && ponto.nome.trim() ? ponto.nome.trim().slice(0, 100) : `${nomePadrao} ${indice + 1}`,
    lat: Number(ponto.lat),
    lon: Number(ponto.lon),
  };
  const accuracy = clonarNumero(ponto.accuracy);
  const speed = clonarNumero(ponto.speed);
  const altitude = clonarNumero(ponto.altitude);
  const createdAt = clonarNumero(ponto.createdAt);
  if (accuracy !== undefined && accuracy >= 0) normalizado.accuracy = accuracy;
  if (speed !== undefined && speed >= 0) normalizado.speed = speed;
  if (altitude !== undefined && altitude >= -11000 && altitude <= 100000) normalizado.altitude = altitude;
  if (createdAt !== undefined && createdAt >= 0) normalizado.createdAt = createdAt;
  return normalizado;
}

function validarArray(valor, nome, limite, nomePadrao) {
  if (!Array.isArray(valor) || valor.length > limite) throw new Error(`${nome} inválida ou acima do limite local.`);
  return valor.map((ponto, indice) => normalizarPonto(ponto, indice, { nomePadrao }));
}

/**
 * Gera texto JSON seguro e determinístico o bastante para backup local.
 */
export function exportarRegistroLocal({ trilha = [], waypoints = [], destino = null, exportadoEm = new Date().toISOString() } = {}) {
  const dados = {
    schema: REGISTRO_SCHEMA,
    version: REGISTRO_VERSION,
    exportadoEm: typeof exportadoEm === 'string' ? exportadoEm : new Date().toISOString(),
    trilha: validarArray(trilha, 'Trilha', LIMITE_TRILHA, 'Ponto da trilha'),
    waypoints: validarArray(waypoints, 'Waypoints', LIMITE_WAYPOINTS, 'Waypoint'),
    destino: destino == null ? null : normalizarPonto(destino, 0, { nomePadrao: 'Destino' }),
  };
  return JSON.stringify(dados, null, 2);
}

/**
 * Valida e normaliza um arquivo importado. Nunca executa campos do JSON.
 */
function escaparXml(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Gera GPX 1.1 local para trilha e waypoints. O formato não inclui destino
 * como rota ativa: ele é exportado como waypoint para não sugerir navegação
 * automática ou comunicação externa.
 */
export function exportarRegistroGpx({ trilha = [], waypoints = [], destino = null, nome = 'Vanguard Field' } = {}) {
  const pontosTrilha = validarArray(trilha, 'Trilha', LIMITE_TRILHA, 'Ponto da trilha');
  const pontosWaypoint = validarArray(waypoints, 'Waypoints', LIMITE_WAYPOINTS, 'Waypoint');
  const todosWaypoints = destino == null
    ? pontosWaypoint
    : [...pontosWaypoint, normalizarPonto(destino, pontosWaypoint.length, { nomePadrao: 'Destino' })];
  const trkpts = pontosTrilha.map((ponto) => {
    const ele = Number.isFinite(Number(ponto.altitude)) ? `<ele>${Number(ponto.altitude)}</ele>` : '';
    const time = Number.isFinite(Number(ponto.createdAt)) ? `<time>${new Date(Number(ponto.createdAt)).toISOString()}</time>` : '';
    return `      <trkpt lat="${ponto.lat}" lon="${ponto.lon}">${ele}${time}</trkpt>`;
  }).join('\n');
  const wpts = todosWaypoints.map((ponto) => `  <wpt lat="${ponto.lat}" lon="${ponto.lon}"><name>${escaparXml(ponto.nome)}</name></wpt>`).join('\n');
  const track = pontosTrilha.length ? `  <trk><name>${escaparXml(nome)}</name><trkseg>\n${trkpts}\n  </trkseg></trk>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Vanguard Field" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
${wpts}${wpts && track ? '\n' : ''}${track}
</gpx>
`;
}

export function importarRegistroLocal(entrada) {
  let dados;
  try {
    dados = typeof entrada === 'string' ? JSON.parse(entrada) : entrada;
  } catch {
    throw new Error('JSON inválido.');
  }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Formato de registro inválido.');
  if (dados.schema !== REGISTRO_SCHEMA || dados.version !== REGISTRO_VERSION) {
    throw new Error(`Schema incompatível. Esperado ${REGISTRO_SCHEMA} v${REGISTRO_VERSION}.`);
  }
  if (dados.exportadoEm !== undefined && typeof dados.exportadoEm !== 'string') throw new Error('Data de exportação inválida.');
  return {
    schema: REGISTRO_SCHEMA,
    version: REGISTRO_VERSION,
    exportadoEm: dados.exportadoEm ?? null,
    trilha: validarArray(dados.trilha, 'Trilha', LIMITE_TRILHA, 'Ponto da trilha'),
    waypoints: validarArray(dados.waypoints, 'Waypoints', LIMITE_WAYPOINTS, 'Waypoint'),
    destino: dados.destino == null ? null : normalizarPonto(dados.destino, 0, { nomePadrao: 'Destino' }),
  };
}
