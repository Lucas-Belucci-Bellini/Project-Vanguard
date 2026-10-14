import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportarRegistroLocal,
  exportarRegistroGpx,
  exportarRegistroKml,
  importarRegistroGpx,
  importarRegistroKml,
  importarRegistroLocal,
  REGISTRO_SCHEMA,
  REGISTRO_VERSION,
  LIMITE_TRILHA,
  LIMITE_WAYPOINTS,
} from '../src/core/registro-offline.js';

const ponto = (i = 0) => ({
  id: `p-${i}`,
  nome: `Ponto ${i}`,
  lat: -23.55 + i / 1000,
  lon: -46.63 - i / 1000,
  accuracy: 8,
  createdAt: 1700000000000 + i,
});

test('exportarRegistroLocal cria schema versionado com rota, pontos e destino', () => {
  const texto = exportarRegistroLocal({ trilha: [ponto(1)], waypoints: [ponto(2)], destino: { ...ponto(3), nome: 'Destino' } });
  const registro = JSON.parse(texto);
  assert.equal(registro.schema, REGISTRO_SCHEMA);
  assert.equal(registro.version, REGISTRO_VERSION);
  assert.equal(registro.trilha.length, 1);
  assert.equal(registro.waypoints.length, 1);
  assert.equal(registro.destino.nome, 'Destino');
});

test('importarRegistroLocal normaliza pontos sem executar campos externos', () => {
  const registro = importarRegistroLocal(JSON.stringify({
    schema: REGISTRO_SCHEMA,
    version: REGISTRO_VERSION,
    trilha: [{ lat: '-23.55', lon: '-46.63', nome: '<script>alert(1)</script>' }],
    waypoints: [],
    destino: null,
  }));
  assert.equal(registro.trilha[0].lat, -23.55);
  assert.equal(registro.trilha[0].nome, '<script>alert(1)</script>');
});

test('importarRegistroLocal rejeita schema incompatível e geometria inválida', () => {
  assert.throws(() => importarRegistroLocal({ schema: 'outro', version: 1, trilha: [], waypoints: [], destino: null }), /Schema incompatível/);
  assert.throws(() => importarRegistroLocal({ schema: REGISTRO_SCHEMA, version: REGISTRO_VERSION, trilha: [{ lat: 91, lon: 0 }], waypoints: [], destino: null }), /fora dos limites/);
});

test('o limite vale para IMPORTAÇÃO — entrada de fora não é confiável', () => {
  // Este teste antes cobrava o mesmo limite na exportação. Cobrava um defeito:
  // medido na 1.6.0, uma trilha de 4 001 pontos era gravada normalmente (o
  // armazenamento só corta em 12 000) e NÃO CONSEGUIA SAIR do aparelho — nem
  // JSON, nem GPX, nem KML. Negar a saída de um dado que já está no aparelho
  // não protege ninguém. O limite continua onde ele faz sentido: na entrada.
  const acima = Array.from({ length: LIMITE_TRILHA + 1 }, (_, i) => ponto(i));
  assert.throws(
    () => importarRegistroLocal({ schema: REGISTRO_SCHEMA, version: REGISTRO_VERSION, trilha: acima, waypoints: [], destino: null }),
    /acima do limite local/
  );
  assert.throws(
    () => importarRegistroLocal({ schema: REGISTRO_SCHEMA, version: REGISTRO_VERSION, trilha: [], waypoints: Array.from({ length: LIMITE_WAYPOINTS + 1 }, (_, i) => ponto(i)), destino: null }),
    /acima do limite local/
  );
});

test('a trilha do operador SAI do aparelho, em qualquer tamanho, nos três formatos', () => {
  // 12 000 é o teto do armazenamento hoje: se cabe na memória, tem de caber na
  // exportação. O número aparece aqui de propósito — ele é o tamanho real que
  // a 1.6.0 recusava.
  const grande = Array.from({ length: 12_000 }, (_, i) => ponto(i));

  const json = exportarRegistroLocal({ trilha: grande, waypoints: [] });
  assert.equal(JSON.parse(json).trilha.length, 12_000, 'nenhum ponto some, e nenhum é truncado');

  const gpx = exportarRegistroGpx({ trilha: grande, waypoints: [] });
  assert.equal((gpx.match(/<trkpt /g) ?? []).length, 12_000);

  const kml = exportarRegistroKml({ trilha: grande, waypoints: [] });
  const coordenadas = kml.match(/<coordinates>([^<]*)<\/coordinates>/)?.[1] ?? '';
  assert.equal(coordenadas.trim().split(/\s+/).length, 12_000);
});

test('exportar sem teto não significa exportar lixo: cada ponto continua validado', () => {
  // Tirar o limite de quantidade não pode virar porta para coordenada inválida.
  assert.throws(() => exportarRegistroLocal({ trilha: [{ lat: 91, lon: 0 }] }), /fora dos limites/);
  assert.throws(() => exportarRegistroLocal({ trilha: [{ lat: 0, lon: 181 }] }), /fora dos limites/);
  assert.throws(() => exportarRegistroLocal({ trilha: 'não é array' }), /inválida/);
});

test('exportarRegistroGpx cria trilha e waypoints com XML escapado', () => {
  const gpx = exportarRegistroGpx({
    trilha: [{ ...ponto(1), altitude: 742 }],
    waypoints: [{ ...ponto(2), nome: 'Abrigo & retorno <A>' }],
    destino: { ...ponto(3), nome: 'Destino' },
    nome: 'Rota de teste',
  });
  assert.match(gpx, /<gpx version="1\.1"/);
  assert.match(gpx, /<trkpt lat="-23\.549" lon="-46\.631"><ele>742<\/ele>/);
  assert.match(gpx, /Abrigo &amp; retorno &lt;A&gt;/);
  assert.match(gpx, /<wpt lat="-23\.547" lon="-46\.633"><name>Destino<\/name>/);
  assert.doesNotMatch(gpx, /\\\\n/);
});

test('importarRegistroGpx normaliza trilha e waypoints sem executar XML', () => {
  const gpx = `<?xml version="1.0"?><gpx version="1.1">
    <wpt lat="-23.548" lon="-46.632"><name>Abrigo &amp; retorno</name><ele>740</ele></wpt>
    <trk><trkseg>
      <trkpt lat="-23.549" lon="-46.631"><ele>742</ele><time>2023-11-14T22:13:20.001Z</time></trkpt>
      <trkpt lat="-23.550" lon="-46.630" />
    </trkseg></trk>
  </gpx>`;
  const registro = importarRegistroGpx(gpx);
  assert.equal(registro.trilha.length, 2);
  assert.equal(registro.trilha[0].altitude, 742);
  assert.equal(registro.trilha[0].createdAt, Date.parse('2023-11-14T22:13:20.001Z'));
  assert.equal(registro.waypoints[0].nome, 'Abrigo & retorno');
  assert.equal(registro.waypoints[0].altitude, 740);
  assert.equal(registro.destino, null);
});

test('importarRegistroGpx rejeita raiz ausente, ausência de pontos e coordenada inválida', () => {
  assert.throws(() => importarRegistroGpx('<xml />'), /raiz válida/);
  assert.throws(() => importarRegistroGpx('<gpx version="1.1"><trk /></gpx>'), /sem pontos/);
  assert.throws(() => importarRegistroGpx('<gpx><wpt lat="-91" lon="0"><name>inválido</name></wpt></gpx>'), /fora dos limites/);
});

test('exportarRegistroGpx aceita dados vazios sem inventar uma trilha', () => {
  const gpx = exportarRegistroGpx();
  assert.match(gpx, /<gpx version="1\.1"/);
  assert.doesNotMatch(gpx, /<trk>/);
  assert.doesNotMatch(gpx, /<wpt>/);
});

test('exportarRegistroKml cria Point e LineString com XML escapado', () => {
  const kml = exportarRegistroKml({
    trilha: [{ ...ponto(1), altitude: 742 }],
    waypoints: [{ ...ponto(2), nome: 'Abrigo & retorno <A>' }],
    destino: { ...ponto(3), nome: 'Destino' },
    nome: 'Rota de teste',
  });
  assert.match(kml, /<kml xmlns="http:\/\/www\.opengis\.net\/kml\/2\.2">/);
  assert.match(kml, /<LineString><tessellate>1<\/tessellate><coordinates>-46\.631,-23\.549,742<\/coordinates>/);
  assert.match(kml, /Abrigo &amp; retorno &lt;A&gt;/);
  assert.match(kml, /<name>Destino<\/name><Point><coordinates>-46\.633,-23\.547<\/coordinates>/);
});

test('importarRegistroKml normaliza Point e LineString sem executar XML', () => {
  const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>
    <Placemark><name>Abrigo &amp; retorno</name><Point><coordinates>-46.632,-23.548,740</coordinates></Point></Placemark>
    <Placemark><name>Rota &lt;local&gt;</name><LineString><coordinates>-46.631,-23.549,742 -46.630,-23.550</coordinates></LineString></Placemark>
  </Document></kml>`;
  const registro = importarRegistroKml(kml);
  assert.equal(registro.waypoints[0].nome, 'Abrigo & retorno');
  assert.equal(registro.waypoints[0].altitude, 740);
  assert.equal(registro.trilha.length, 2);
  assert.equal(registro.trilha[0].lat, -23.549);
  assert.equal(registro.trilha[0].lon, -46.631);
  assert.equal(registro.trilha[0].nome, 'Rota <local>');
  assert.equal(registro.trilha[1].altitude, undefined);
});

test('importarRegistroKml rejeita raiz, pontos ausentes e coordenadas inválidas', () => {
  assert.throws(() => importarRegistroKml('<xml />'), /raiz válida/);
  assert.throws(() => importarRegistroKml('<kml><Document><Placemark><name>vazio</name></Placemark></Document></kml>'), /sem pontos/);
  assert.throws(() => importarRegistroKml('<kml><Placemark><Point><coordinates>-181,0</coordinates></Point></Placemark></kml>'), /Coordenada KML inválida/);
});

test('importarRegistroLocal exige arrays de dados', () => {
  assert.throws(() => importarRegistroLocal({ schema: REGISTRO_SCHEMA, version: REGISTRO_VERSION, trilha: null, waypoints: [], destino: null }), /inválida/);
  assert.throws(() => importarRegistroLocal('{ quebrado'), /JSON inválido/);
});

test('importarRegistroLocal recusa coordenada nula em vez de virar 0', () => {
  // `Number(null)` é 0: sem guarda, este waypoint entraria no golfo da Guiné.
  const registro = JSON.stringify({
    schema: 'vanguard-registro-local',
    version: 1,
    trilha: [],
    waypoints: [{ nome: 'x', lat: -23.31, lon: null }],
    destino: null,
  });
  assert.throws(() => importarRegistroLocal(registro), /fora dos limites/);
});

test('backup que não volta não é backup: ida e volta completa em 12 000 pontos', () => {
  // A exportação foi liberada; se a importação continuasse em 4 000, o operador
  // exportaria um arquivo que o próprio aplicativo recusaria a restaurar. Este
  // teste é o que impede as duas pontas de divergirem de novo.
  const original = Array.from({ length: 12_000 }, (_, i) => ({
    lat: -23.31 + i * 1e-5, lon: -51.16 + i * 1e-5, accuracy: 8, altitude: 550, createdAt: 1e12 + i * 1000,
  }));

  const volta = importarRegistroLocal(exportarRegistroLocal({ trilha: original, waypoints: [] }));

  assert.equal(volta.trilha.length, original.length, 'nenhum ponto se perde na ida e volta');
  assert.equal(volta.trilha[0].lat, original[0].lat);
  assert.equal(volta.trilha[0].lon, original[0].lon);
  assert.equal(volta.trilha.at(-1).lat, original.at(-1).lat);
  assert.equal(volta.trilha.at(-1).lon, original.at(-1).lon);
  assert.equal(volta.trilha[0].altitude, 550, 'a altitude atravessa o formato');
  assert.equal(volta.trilha[0].accuracy, 8, 'a precisão do fixo atravessa o formato');
});

test('o teto de importação cobre com folga o que a exportação pode produzir', () => {
  // A regra é uma só: tudo que sai tem de poder voltar.
  assert.ok(LIMITE_TRILHA >= 12_000, `teto de importação (${LIMITE_TRILHA}) abaixo do que o aparelho grava`);
  assert.ok(LIMITE_WAYPOINTS >= 1_000);
});
