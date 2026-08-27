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
  const createdAt = clonarNumero(ponto.createdAt);
  if (accuracy !== undefined && accuracy >= 0) normalizado.accuracy = accuracy;
  if (speed !== undefined && speed >= 0) normalizado.speed = speed;
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
