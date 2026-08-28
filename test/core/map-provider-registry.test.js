import test from 'node:test';
import assert from 'node:assert/strict';
import { criarMapProviderRegistry } from '../../src/core/map-provider-registry.js';

test('registra e recupera providers por id', () => {
  const registry = criarMapProviderRegistry();
  const provider = registry.registrar({
    id: 'offline',
    nome: 'Offline',
    tiles: ['offline://tiles/{z}/{x}/{y}.pbf'],
  });

  assert.equal(provider.id, 'offline');
  assert.equal(registry.obter('offline'), provider);
  assert.equal(registry.listar().length, 1);
});

test('impede ids duplicados', () => {
  const registry = criarMapProviderRegistry();
  const definition = { id: 'online', nome: 'Online', tiles: ['https://example.invalid/{z}/{x}/{y}.png'] };

  registry.registrar(definition);
  assert.throws(() => registry.registrar(definition), /já registrado/);
});

test('exigir falha para provider ausente', () => {
  const registry = criarMapProviderRegistry();
  assert.throws(() => registry.exigir('missing'), /não encontrado/);
});

test('remover retorna o estado da operação', () => {
  const registry = criarMapProviderRegistry([
    { id: 'a', nome: 'A', tiles: ['a://tiles'] },
    { id: 'b', nome: 'B', tiles: ['b://tiles'] },
  ]);

  assert.equal(registry.remover('a'), true);
  assert.equal(registry.remover('a'), false);
  assert.equal(registry.listar().map((item) => item.id).join(','), 'b');
});
