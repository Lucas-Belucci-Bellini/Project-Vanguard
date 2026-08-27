import test from 'node:test';
import assert from 'node:assert/strict';

class MemStorage {
  #dados = new Map();
  getItem(chave) { return this.#dados.has(chave) ? this.#dados.get(chave) : null; }
  setItem(chave, valor) { this.#dados.set(chave, String(valor)); }
  removeItem(chave) { this.#dados.delete(chave); }
  key(indice) { return [...this.#dados.keys()][indice] ?? null; }
  get length() { return this.#dados.size; }
}

globalThis.localStorage = new MemStorage();
const { estado, CHAVES, ESQUEMA_ESTADO, VERSAO_ESTADO } = await import('../src/core/estado.js?estado-test=1');

test('estado migra valor legado ao ser lido', () => {
  const legado = { lat: -23.55, lon: -46.63, accuracy: 12 };
  localStorage.setItem(`vanguard:${CHAVES.LOCAL}`, JSON.stringify(legado));
  assert.deepEqual(estado.get(CHAVES.LOCAL, null), legado);
  const armazenado = JSON.parse(localStorage.getItem(`vanguard:${CHAVES.LOCAL}`));
  assert.equal(armazenado.schema, ESQUEMA_ESTADO);
  assert.equal(armazenado.version, VERSAO_ESTADO);
  assert.deepEqual(armazenado.value, legado);
});

test('estado grava e lê o envelope atual sem expor metadados ao consumidor', () => {
  const valor = ['a', 'b'];
  estado.set(CHAVES.WAYPOINTS, valor);
  assert.deepEqual(estado.get(CHAVES.WAYPOINTS, []), valor);
  assert.deepEqual(JSON.parse(localStorage.getItem(`vanguard:${CHAVES.WAYPOINTS}`)), {
    schema: ESQUEMA_ESTADO,
    version: VERSAO_ESTADO,
    value: valor,
  });
});

test('estado usa fallback para uma versão futura ou JSON corrompido', () => {
  localStorage.setItem(`vanguard:${CHAVES.TRILHA}`, JSON.stringify({ schema: ESQUEMA_ESTADO, version: VERSAO_ESTADO + 1, value: ['futuro'] }));
  assert.deepEqual(estado.get(CHAVES.TRILHA, ['seguro']), ['seguro']);
  localStorage.setItem(`vanguard:${CHAVES.DESTINO}`, '{quebrado');
  assert.equal(estado.get(CHAVES.DESTINO, null), null);
});

test('limparTudo remove somente o namespace do Vanguard', () => {
  localStorage.setItem('outro-app:preservar', 'sim');
  estado.set(CHAVES.CONTEXTO, 'cidade');
  assert.equal(estado.limparTudo(), true);
  assert.equal(localStorage.getItem('outro-app:preservar'), 'sim');
  assert.equal(localStorage.getItem(`vanguard:${CHAVES.CONTEXTO}`), null);
  assert.equal(localStorage.getItem('vanguard:__meta'), null);
});

test('diagnostico informa schema sem dados pessoais', () => {
  assert.deepEqual(estado.diagnostico(), {
    schema: ESQUEMA_ESTADO,
    version: VERSAO_ESTADO,
    prefixo: 'vanguard:',
  });
});
