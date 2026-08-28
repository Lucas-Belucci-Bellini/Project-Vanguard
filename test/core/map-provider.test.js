import test from 'node:test';
import assert from 'node:assert/strict';
import { criarMapProvider, providerDeCamada, providerSuportaZoom, validarMapProvider } from '../../src/core/map-provider.js';

test('MapProvider aceita definição mínima válida', () => {
  const provider = criarMapProvider({ id: 'demo', nome: 'Demo', tiles: ['https://example.test/{z}/{x}/{y}.png'] });
  assert.equal(provider.id, 'demo');
  assert.equal(provider.tileSize, 256);
  assert.equal(provider.maxzoom, 16);
});

test('MapProvider rejeita definição sem tiles', () => {
  const resultado = validarMapProvider({ id: 'demo', nome: 'Demo' });
  assert.equal(resultado.valido, false);
  assert.match(resultado.erros.join(' '), /tiles/);
  assert.throws(() => criarMapProvider({ id: 'demo', nome: 'Demo' }), /MapProvider inválido/);
});

test('providerDeCamada preserva créditos e permite adaptador de renderização', () => {
  const renderizar = () => 'ok';
  const provider = providerDeCamada({ id: 'base', nome: 'Base', tiles: ['https://example.test/{z}/{x}/{y}.png'], creditos: 'Fonte' }, { renderizar });
  assert.equal(provider.creditos, 'Fonte');
  assert.equal(provider.renderizar(), 'ok');
});

test('providerSuportaZoom respeita maxzoom', () => {
  const provider = criarMapProvider({ id: 'base', nome: 'Base', tiles: ['https://example.test/{z}/{x}/{y}.png'], maxzoom: 12 });
  assert.equal(providerSuportaZoom(provider, 12), true);
  assert.equal(providerSuportaZoom(provider, 12.5), false);
  assert.equal(providerSuportaZoom(provider, 13), false);
});
