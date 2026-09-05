/**
 * Contrato versionado para transportar dados de navegação entre aparelhos.
 *
 * O arquivo é deliberadamente JSON simples: não executa conteúdo externo, não
 * contém HTML e não tenta sincronizar dados com qualquer servidor.
 */

import { numeroFinito, numeroNoIntervalo } from '../engine/numero-seguro.js';

export const REGISTRO_SCHEMA = 'vanguard-registro-local';
export const REGISTRO_VERSION = 1;

/**
 * Limites de **IMPORTAÇÃO**, não de exportação.
 *
 * Eles existem para conter arquivo de fora: um JSON hostil de milhões de
 * pontos travaria o aparelho antes de qualquer validação adiantar. Isso é
 * legítimo — a entrada não é confiável.
 *
 * O que não era legítimo: aplicar o mesmo limite na **saída**. Medido na
 * 1.6.0: uma trilha de 4 001 pontos era gravada normalmente (o armazenamento
 * corta em 12 000) e a exportação **recusava inteira**, com "acima do limite
 * local". Ou seja, entre 4 001 e 12 000 pontos o registro existia no aparelho
 * e não tinha como sair dele — nem por JSON, nem por GPX, nem por KML.
 *
 * A trilha é do operador. A exportação dela não tem teto: ver
 * `validarParaExportacao` abaixo.
 *
 * O teto de importação subiu de 4 000 para 100 000 porque backup que não volta
 * não é backup: com a exportação liberada, 4 000 na entrada deixaria o operador
 * exportar um arquivo que o próprio aplicativo recusaria a restaurar.
 *
 * 100 000 é medido, não escolhido por gosto. Custo da validação ponto a ponto,
 * neste runner:
 *
 * |  pontos | tempo   | arquivo |
 * |--------:|--------:|--------:|
 * |   4 000 |   13 ms |  0,4 MB |
 * |  12 000 |   34 ms |  1,2 MB |
 * | 100 000 |  325 ms | 10,3 MB |
 * | 250 000 | 1 514 ms| 25,9 MB |
 *
 * 100 000 pontos são mais de 8 dias de gravação contínua na regra de ≥2 m entre
 * pontos — acima de qualquer trilha real, e ainda abaixo do ponto em que a
 * validação trava a interface. 250 000 já passa de um segundo e meio aqui, o
 * que num celular vira vários.
 */
export const LIMITE_TRILHA = 100_000;
export const LIMITE_WAYPOINTS = 10_000;

function numeroValido(valor, minimo, maximo) {
  return numeroNoIntervalo(valor, minimo, maximo) !== null;
}

function clonarNumero(valor) {
  return numeroFinito(valor) ?? undefined;
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

/** Entrada de fora: bounded, porque não é confiável. */
function validarArray(valor, nome, limite, nomePadrao) {
  if (!Array.isArray(valor)) throw new Error(`${nome} inválida ou acima do limite local.`);
  if (valor.length > limite) {
    throw new Error(`${nome} inválida ou acima do limite local (${valor.length} de no máximo ${limite} na importação).`);
  }
  return valor.map((ponto, indice) => normalizarPonto(ponto, indice, { nomePadrao }));
}

/**
 * Saída do dado do próprio operador: **sem teto**.
 *
 * Cada ponto continua sendo validado um a um — coordenada fora de faixa
 * segue recusada, e nada é inventado. O que não acontece mais é a recusa por
 * quantidade: negar a saída de um registro que já está no aparelho não protege
 * ninguém, só prende o dado. Um arquivo grande é problema de disco; um dado
 * que não sai é perda.
 */
function validarParaExportacao(valor, nome, nomePadrao) {
  if (!Array.isArray(valor)) throw new Error(`${nome} inválida.`);
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
    trilha: validarParaExportacao(trilha, 'Trilha', 'Ponto da trilha'),
    waypoints: validarParaExportacao(waypoints, 'Waypoints', 'Waypoint'),
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
  const pontosTrilha = validarParaExportacao(trilha, 'Trilha', 'Ponto da trilha');
  const pontosWaypoint = validarParaExportacao(waypoints, 'Waypoints', 'Waypoint');
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
  const pontosTrilha = validarParaExportacao(trilha, 'Trilha', 'Ponto da trilha');
  const pontosWaypoint = validarParaExportacao(waypoints, 'Waypoints', 'Waypoint');
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
