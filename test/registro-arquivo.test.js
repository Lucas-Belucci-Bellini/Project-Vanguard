import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectarFormatoRegistro,
  extensaoRegistro,
  mimeRegistro,
  FORMATOS_REGISTRO,
} from '../src/core/registro-arquivo.js';

test('extensaoRegistro ignora caminho e normaliza maiúsculas', () => {
  assert.equal(extensaoRegistro('/tmp/Backup/ROTA.GPX'), 'gpx');
  assert.equal(extensaoRegistro('rota.backup.json'), 'json');
  assert.equal(extensaoRegistro('rota.sem-extensao'), null);
  assert.equal(extensaoRegistro('rota'), null);
});

test('mimeRegistro remove parâmetros e normaliza o MIME', () => {
  assert.equal(mimeRegistro(' Application/JSON; charset=utf-8 '), 'application/json');
  assert.equal(mimeRegistro(''), null);
  assert.equal(mimeRegistro(null), null);
});

test('detectarFormatoRegistro aceita extensão e MIME compatíveis', () => {
  assert.equal(detectarFormatoRegistro({ name: 'backup.JSON', type: 'application/json; charset=utf-8' }).formato, FORMATOS_REGISTRO.JSON);
  assert.equal(detectarFormatoRegistro({ name: 'rota.gpx', type: 'application/gpx+xml' }).formato, FORMATOS_REGISTRO.GPX);
  assert.equal(detectarFormatoRegistro({ name: 'rota.kml', type: 'application/vnd.google-earth.kml+xml' }).formato, FORMATOS_REGISTRO.KML);
});

test('detectarFormatoRegistro usa extensão quando o aparelho omite MIME', () => {
  assert.equal(detectarFormatoRegistro({ name: 'rota.gpx', type: '' }).formato, FORMATOS_REGISTRO.GPX);
  assert.equal(detectarFormatoRegistro({ name: 'rota.kml' }).formato, FORMATOS_REGISTRO.KML);
});

test('detectarFormatoRegistro usa MIME conhecido quando não há extensão', () => {
  assert.equal(detectarFormatoRegistro({ name: 'backup', type: 'text/json' }).formato, FORMATOS_REGISTRO.JSON);
  assert.equal(detectarFormatoRegistro({ type: 'application/kml+xml; charset=utf-8' }).formato, FORMATOS_REGISTRO.KML);
});

test('detectarFormatoRegistro rejeita extensão e MIME conflitantes', () => {
  assert.throws(
    () => detectarFormatoRegistro({ name: 'rota.gpx', type: 'application/json' }),
    /não correspondem/,
  );
  assert.throws(
    () => detectarFormatoRegistro({ name: 'rota.kml', type: 'application/gpx\+xml' }),
    /não correspondem/,
  );
});

test('detectarFormatoRegistro rejeita arquivo sem formato reconhecível', () => {
  assert.throws(
    () => detectarFormatoRegistro({ name: 'rota.txt', type: 'text/plain' }),
    /não reconhecido/,
  );
  assert.throws(() => detectarFormatoRegistro(), /não reconhecido/);
});
