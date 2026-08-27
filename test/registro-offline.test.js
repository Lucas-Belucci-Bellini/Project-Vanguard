import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportarRegistroLocal,
  exportarRegistroGpx,
  importarRegistroGpx,
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

test('exportarRegistroLocal aplica limites de trilha e waypoints', () => {
  assert.throws(() => exportarRegistroLocal({ trilha: Array.from({ length: LIMITE_TRILHA + 1 }, (_, i) => ponto(i)) }), /acima do limite/);
  assert.throws(() => exportarRegistroLocal({ waypoints: Array.from({ length: LIMITE_WAYPOINTS + 1 }, (_, i) => ponto(i)) }), /acima do limite/);
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

test('importarRegistroLocal exige arrays de dados', () => {
  assert.throws(() => importarRegistroLocal({ schema: REGISTRO_SCHEMA, version: REGISTRO_VERSION, trilha: null, waypoints: [], destino: null }), /inválida/);
  assert.throws(() => importarRegistroLocal('{ quebrado'), /JSON inválido/);
});
