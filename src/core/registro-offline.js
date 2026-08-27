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

/**
 * Gera KML 2.2 local. Trilhas viram LineString e waypoints/destino viram
 * Placemark de ponto; nenhum dado é enviado para fora do aparelho.
 */
export function exportarRegistroKml({ trilha = [], waypoints = [], destino = null, nome = 'Vanguard Field' } = {}) {
  const pontosTrilha = validarArray(trilha, 'Trilha', LIMITE_TRILHA, 'Ponto da trilha');
  const pontosWaypoint = validarArray(waypoints, 'Waypoints', LIMITE_WAYPOINTS, 'Waypoint');
  const todosWaypoints = destino == null
    ? pontosWaypoint
    : [...pontosWaypoint, normalizarPonto(destino, pontosWaypoint.length, { nomePadrao: 'Destino' })];
  const coordenada = (ponto) => `${ponto.lon},${ponto.lat}${Number.isFinite(ponto.altitude) ? `,${ponto.altitude}` : ''}`;
  const placemarks = todosWaypoints.map((ponto) => `    <Placemark><name>${escaparXml(ponto.nome)}</name><Point><coordinates>${coordenada(ponto)}</coordinates></Point></Placemark>`).join('\n');
  const track = pontosTrilha.length
    ? `    <Placemark><name>${escaparXml(nome)}</name><LineString><tessellate>1</tessellate><coordinates>${pontosTrilha.map(coordenada).join(' ')}</coordinates></LineString></Placemark>`
    : '';
  const conteudo = [placemarks, track].filter(Boolean).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
${conteudo}
</Document></kml>
`;
}

function coordenadasKml(valor) {
  const tokens = String(valor ?? '').trim().split(/\s+/).filter(Boolean);
  return tokens.map((token, indice) => {
    const partes = token.split(',').map((parte) => parte.trim());
    const [lon, lat, altitude] = partes;
    if (!numeroValido(lon, -180, 180) || !numeroValido(lat, -90, 90)) throw new Error(`Coordenada KML inválida no ponto ${indice + 1}.`);
    const ponto = { lon: Number(lon), lat: Number(lat) };
    if (altitude !== undefined && altitude !== '' && Number.isFinite(Number(altitude))) ponto.altitude = Number(altitude);
    return ponto;
  });
}

/**
 * Importa um subconjunto seguro de KML 2.2: Point para waypoints e LineString
 * para trilhas. O texto é tratado como dados e nunca como markup executável.
 */
export function importarRegistroKml(entrada) {
  if (typeof entrada !== 'string' || entrada.length > 2_000_000) throw new Error('Arquivo KML inválido ou acima do limite local.');
  if (!/<kml\b/i.test(entrada)) throw new Error('Arquivo KML sem uma raiz válida.');
  const trilha = [];
  const waypoints = [];
  const placemarks = [...entrada.matchAll(/<Placemark\b[^>]*>[\s\S]*?<\/Placemark>/gi)];
  for (const [indice, encontrado] of placemarks.entries()) {
    const tag = encontrado[0];
    const nome = conteudoXml(tag, 'name');
    const coordenadas = tag.match(/<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/i)?.[1];
    if (coordenadas == null) continue;
    const pontos = coordenadasKml(decodificarXml(coordenadas));
    if (!pontos.length) continue;
    if (/<LineString\b/i.test(tag)) {
      trilha.push(...pontos.map((ponto, pontoIndice) => normalizarPonto({ ...ponto, nome: nome || `Ponto da trilha ${pontoIndice + 1}` }, trilha.length + pontoIndice, { nomePadrao: 'Ponto da trilha' })));
    } else {
      const ponto = pontos[0];
      waypoints.push(normalizarPonto({ ...ponto, nome: nome || `Waypoint ${indice + 1}` }, waypoints.length, { nomePadrao: 'Waypoint' }));
    }
  }
  if (!trilha.length && !waypoints.length) throw new Error('KML sem pontos de trilha ou waypoints válidos.');
  return {
    schema: REGISTRO_SCHEMA,
    version: REGISTRO_VERSION,
    exportadoEm: null,
    trilha: validarArray(trilha, 'Trilha', LIMITE_TRILHA, 'Ponto da trilha'),
    waypoints: validarArray(waypoints, 'Waypoints', LIMITE_WAYPOINTS, 'Waypoint'),
    destino: null,
  };
}

function decodificarXml(valor) {
  return String(valor ?? '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function atributoXml(tag, nome) {
  const encontrado = tag.match(new RegExp(`${nome}=["']([^"']+)["']`, 'i'));
  return encontrado?.[1] ?? null;
}

const PADROES_CONTEUDO_GPX = {
  ele: /<ele[^>]*>([\s\S]*?)<\/ele>/i,
  time: /<time[^>]*>([\s\S]*?)<\/time>/i,
  name: /<name[^>]*>([\s\S]*?)<\/name>/i,
};

function conteudoXml(tag, nome) {
  const encontrado = PADROES_CONTEUDO_GPX[nome]?.exec(tag);
  return encontrado ? decodificarXml(encontrado[1].trim()) : null;
}

/**
 * Importa GPX 1.1 de forma conservadora. Waypoints e pontos de track são
 * tratados como dados locais; nenhum campo do XML é executado.
 */
export function importarRegistroGpx(entrada) {
  if (typeof entrada !== 'string' || entrada.length > 2_000_000) throw new Error('Arquivo GPX inválido ou acima do limite local.');
  if (!/<gpx\b/i.test(entrada)) throw new Error('Arquivo GPX sem uma raiz válida.');
  const trilha = [...entrada.matchAll(/<trkpt\b[^>]*(?:\/>|>[\s\S]*?<\/trkpt>)/gi)].map((encontrado, indice) => {
    const tag = encontrado[0];
    const lat = atributoXml(tag, 'lat');
    const lon = atributoXml(tag, 'lon');
    const altitude = conteudoXml(tag, 'ele');
    const time = conteudoXml(tag, 'time');
    const createdAt = time && Number.isFinite(Date.parse(time)) ? Date.parse(time) : undefined;
    return normalizarPonto({ lat, lon, altitude: altitude == null ? undefined : Number(altitude), createdAt }, indice, { nomePadrao: 'Ponto da trilha' });
  });
  const waypoints = [...entrada.matchAll(/<wpt\b[^>]*(?:\/>|>[\s\S]*?<\/wpt>)/gi)].map((encontrado, indice) => {
    const tag = encontrado[0];
    const lat = atributoXml(tag, 'lat');
    const lon = atributoXml(tag, 'lon');
    const altitude = conteudoXml(tag, 'ele');
    const nome = conteudoXml(tag, 'name');
    return normalizarPonto({ lat, lon, altitude: altitude == null ? undefined : Number(altitude), nome }, indice, { nomePadrao: 'Waypoint' });
  });
  if (!trilha.length && !waypoints.length) throw new Error('GPX sem pontos de trilha ou waypoints válidos.');
  return {
    schema: REGISTRO_SCHEMA,
    version: REGISTRO_VERSION,
    exportadoEm: null,
    trilha: validarArray(trilha, 'Trilha', LIMITE_TRILHA, 'Ponto da trilha'),
    waypoints: validarArray(waypoints, 'Waypoints', LIMITE_WAYPOINTS, 'Waypoint'),
    destino: null,
  };
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
