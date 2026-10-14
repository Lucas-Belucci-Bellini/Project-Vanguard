import test from 'node:test';
import assert from 'node:assert/strict';
import { criarStorageFotos, DB_FOTOS_PARADA, STORE_IMAGENS, STORE_METADADOS } from '../src/core/foto-storage.js';

function criarIndexedDBFake() {
  const bancos = { [STORE_METADADOS]: new Map(), [STORE_IMAGENS]: new Map() };
  // Toda requisição precisa disparar `onsuccess`: o adapter resolve a promessa
  // dentro do callback, então uma requisição que nunca o chama deixa a promessa
  // pendente para sempre e o runner cancela o teste.
  function requisicao(result) {
    const req = { result, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess?.());
    return req;
  }
  function store(nome) {
    const registros = bancos[nome];
    return {
      put(valor) { registros.set(valor.id, structuredClone(valor)); return requisicao(valor); },
      get(id) { const v = registros.get(id); return requisicao(v ? structuredClone(v) : undefined); },
      getAll() { return requisicao([...registros.values()].map((v) => structuredClone(v))); },
      delete(id) { registros.delete(id); return requisicao(undefined); },
      clear() { registros.clear(); return requisicao(undefined); },
    };
  }
  return {
    bancos,
    open() {
      const req = {
        result: {
          objectStoreNames: { contains: () => true },
          transaction: () => ({ objectStore: (nome) => store(nome) }),
          close() {},
        },
        onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null,
      };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  };
}

const REGISTRO = {
  id: 'parada-001',
  lat: -22.9519,
  lon: -43.2105,
  mgrs: '23K PP 12345 67890',
  precisaoM: 8,
  dentroDoLimite: true,
  capturadaEm: '2026-09-10T13:00:00.000Z',
  imagem: { mime: 'image/jpeg', sizeBytes: 4 },
};

const BYTES = new Uint8Array([255, 216, 255, 224]);

test('sem IndexedDB o storage responde indisponível sem lançar exceção', async () => {
  const storage = criarStorageFotos({ indexedDBImpl: null });
  assert.equal(storage.disponivel, false);
  assert.equal((await storage.listar()).codigo, 'FOTO_STORAGE_UNAVAILABLE');
  assert.equal((await storage.lerImagem('parada-001')).codigo, 'FOTO_STORAGE_UNAVAILABLE');
});

test('argumento inválido é reportado como tal mesmo sem backend', async () => {
  const storage = criarStorageFotos({ indexedDBImpl: null });
  assert.equal((await storage.salvarFoto(null, BYTES)).codigo, 'FOTO_REGISTRO_INVALIDO');
  assert.equal((await storage.salvarFoto({ id: '' }, BYTES)).codigo, 'FOTO_ID_INVALIDO');
  assert.equal((await storage.salvarFoto(REGISTRO, 'foto')).codigo, 'FOTO_BYTES_INVALIDOS');
  assert.equal((await storage.salvarFoto(REGISTRO, new Uint8Array())).codigo, 'FOTO_BYTES_INVALIDOS');
  assert.equal((await storage.lerMetadados('')).codigo, 'FOTO_ID_INVALIDO');
});

test('grava metadado e imagem juntos e devolve os bytes originais', async () => {
  const storage = criarStorageFotos({ indexedDBImpl: criarIndexedDBFake() });
  const gravacao = await storage.salvarFoto(REGISTRO, BYTES);
  assert.equal(gravacao.ok, true);
  assert.equal(gravacao.sizeBytes, 4);

  const metadados = await storage.lerMetadados('parada-001');
  assert.equal(metadados.metadados.lat, -22.9519);
  assert.equal(metadados.metadados.precisaoM, 8);
  assert.equal(metadados.metadados.sizeBytes, 4);

  const imagem = await storage.lerImagem('parada-001');
  assert.deepEqual([...imagem.bytes], [255, 216, 255, 224]);
});

test('listar devolve só metadados, sem carregar bytes de imagem', async () => {
  const storage = criarStorageFotos({ indexedDBImpl: criarIndexedDBFake() });
  await storage.salvarFoto(REGISTRO, BYTES);
  const lista = await storage.listar();
  assert.equal(lista.fotos.length, 1);
  assert.equal(lista.fotos[0].id, 'parada-001');
  assert.equal(Object.hasOwn(lista.fotos[0], 'bytes'), false);
});

test('a lista sai em ordem de captura', async () => {
  const storage = criarStorageFotos({ indexedDBImpl: criarIndexedDBFake() });
  await storage.salvarFoto({ ...REGISTRO, id: 'b', capturadaEm: '2026-09-10T15:00:00.000Z' }, BYTES);
  await storage.salvarFoto({ ...REGISTRO, id: 'a', capturadaEm: '2026-09-10T09:00:00.000Z' }, BYTES);
  const lista = await storage.listar();
  assert.deepEqual(lista.fotos.map((foto) => foto.id), ['a', 'b']);
});

test('imagem ausente é dito com clareza em vez de devolver vazio', async () => {
  const storage = criarStorageFotos({ indexedDBImpl: criarIndexedDBFake() });
  const resultado = await storage.lerImagem('nao-existe');
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'FOTO_NAO_ENCONTRADA');
  assert.equal((await storage.lerMetadados('nao-existe')).metadados, null);
});

test('remover apaga metadado e imagem do mesmo id', async () => {
  const fake = criarIndexedDBFake();
  const storage = criarStorageFotos({ indexedDBImpl: fake });
  await storage.salvarFoto(REGISTRO, BYTES);
  await storage.salvarFoto({ ...REGISTRO, id: 'parada-002' }, BYTES);
  await storage.remover('parada-001');
  assert.equal(fake.bancos[STORE_METADADOS].has('parada-001'), false);
  assert.equal(fake.bancos[STORE_IMAGENS].has('parada-001'), false);
  assert.equal((await storage.listar()).fotos.length, 1);
});

test('limparTudo esvazia os dois stores', async () => {
  const fake = criarIndexedDBFake();
  const storage = criarStorageFotos({ indexedDBImpl: fake });
  await storage.salvarFoto(REGISTRO, BYTES);
  await storage.limparTudo();
  assert.equal(fake.bancos[STORE_METADADOS].size, 0);
  assert.equal(fake.bancos[STORE_IMAGENS].size, 0);
});

test('uso soma o que os metadados declaram', async () => {
  const storage = criarStorageFotos({ indexedDBImpl: criarIndexedDBFake() });
  await storage.salvarFoto(REGISTRO, BYTES);
  await storage.salvarFoto({ ...REGISTRO, id: 'parada-002' }, new Uint8Array(10));
  const uso = await storage.uso();
  assert.equal(uso.fotos, 2);
  assert.equal(uso.totalBytes, 14);
});

test('falha do backend vira código estruturado, não exceção solta', async () => {
  const quebrado = {
    open() {
      const req = { result: null, onsuccess: null, onerror: null, onblocked: null, error: Object.assign(new Error('sem espaço'), { name: 'QuotaExceededError' }) };
      queueMicrotask(() => req.onerror?.());
      return req;
    },
  };
  const storage = criarStorageFotos({ indexedDBImpl: quebrado });
  const resultado = await storage.salvarFoto(REGISTRO, BYTES);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.codigo, 'FOTO_STORAGE_QUOTA');
});

test('o diagnóstico nomeia o banco próprio das fotos', () => {
  const storage = criarStorageFotos({ indexedDBImpl: {} });
  const diagnostico = storage.diagnostico();
  assert.equal(diagnostico.database, DB_FOTOS_PARADA);
  assert.deepEqual(diagnostico.stores, [STORE_METADADOS, STORE_IMAGENS]);
});
