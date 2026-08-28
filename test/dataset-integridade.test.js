import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularSha256, verificarIntegridadeDataset } from '../src/core/dataset-integridade.js';

const UTF8 = new TextEncoder();
const HASH_VANGUARD = 'ce1edfea6d6b8c2217b9ee006991bddb2e70e11bb4609c4e0970cff7013f9b72';

test('calcula SHA-256 real sobre bytes determinísticos', async () => {
  assert.equal(await calcularSha256(UTF8.encode('Vanguard')), HASH_VANGUARD);
});

test('aceita ArrayBuffer e DataView sem alterar os bytes de origem', async () => {
  const buffer = UTF8.encode('abc').buffer;
  assert.equal(await calcularSha256(buffer), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const view = new DataView(UTF8.encode('abc').buffer);
  assert.equal(await calcularSha256(view), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('confirma checksum esperado e informa tamanho dos bytes', async () => {
  const resultado = await verificarIntegridadeDataset(UTF8.encode('abc'), 'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD');
  assert.deepEqual(resultado, {
    ok: true,
    codigo: 'CHECKSUM_VALIDO',
    motivo: 'Os bytes recebidos correspondem ao SHA-256 declarado.',
    checksumCalculado: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    bytes: 3,
  });
});

test('reprova bytes diferentes do checksum declarado', async () => {
  const resultado = await verificarIntegridadeDataset(UTF8.encode('abd'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'CHECKSUM_INVALIDO');
  assert.notEqual(resultado.checksumCalculado, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('reprova checksum esperado malformado antes de calcular', async () => {
  const resultado = await verificarIntegridadeDataset(UTF8.encode('abc'), 'nao-e-sha256');
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'CHECKSUM_ESPERADO_INVALIDO');
});

test('expõe ambiente sem Web Crypto sem confundir com checksum inválido', async () => {
  const resultado = await verificarIntegridadeDataset(UTF8.encode('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', { cryptoImpl: {} });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'CRYPTO_UNAVAILABLE');
});
