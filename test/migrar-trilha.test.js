import test from 'node:test';
import assert from 'node:assert/strict';

import { criarTrackStore, persistenciaEmMemoria, ESTADO_SESSAO } from '../src/core/dados/track-store.js';
import { RESULTADO_MIGRACAO, migrarTrilhaV1 } from '../src/core/dados/migrar-trilha.js';

const T0 = 1_700_000_000_000;
const cryptoImpl = globalThis.crypto;

/** localStorage falso que conta escritas — a migração não pode fazer nenhuma. */
function storageFalso(dados = {}) {
  const mapa = new Map(Object.entries(dados));
  let escritas = 0;
  let remocoes = 0;
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => { escritas += 1; mapa.set(k, v); },
    removeItem: (k) => { remocoes += 1; mapa.delete(k); },
    __escritas: () => escritas,
    __remocoes: () => remocoes,
    __conteudo: (k) => (mapa.has(k) ? mapa.get(k) : null),
  };
}

const pontoV1 = (i, extra = {}) => ({
  lat: -23.3103 + (i * 14) / 111_320,
  lon: -51.1628,
  timestamp: T0 + i * 10_000,
  accuracy: 6,
  altitude: 550 + i * 0.1,
  speed: 1.4,
  ...extra,
});

const comTrilha = (pontos) => storageFalso({ 'vanguard:trilha': JSON.stringify(pontos) });
const novoStore = () => criarTrackStore({ persistencia: persistenciaEmMemoria(), relogio: () => T0 });

test('migrar COPIA: o array v1 continua byte a byte onde estava', async () => {
  // A regra da V3 em forma de teste. Enquanto a nova trilha não estiver provada
  // em campo, o array antigo é a única cópia daquele caminho.
  const original = Array.from({ length: 500 }, (_, i) => pontoV1(i));
  const storage = comTrilha(original);
  const antes = storage.__conteudo('vanguard:trilha');

  const r = await migrarTrilhaV1({ store: novoStore(), localStorageImpl: storage, cryptoImpl });

  assert.equal(r.resultado, RESULTADO_MIGRACAO.MIGRADA);
  assert.equal(storage.__conteudo('vanguard:trilha'), antes, 'o conteúdo v1 não pode mudar');
  assert.equal(storage.__escritas(), 0, 'a migração não escreve no localStorage');
  assert.equal(storage.__remocoes(), 0, 'e nunca remove a chave de origem');
  assert.equal(r.conferencia.originalIntacto, true);
  assert.equal(r.conferencia.checksumOrigemAntes, r.conferencia.checksumOrigemDepois);
});

test('a contagem é conferida dos dois lados, e o dado atravessa inteiro', async () => {
  const original = Array.from({ length: 1200 }, (_, i) => pontoV1(i));
  const store = novoStore();
  const r = await migrarTrilhaV1({ store, localStorageImpl: comTrilha(original), cryptoImpl });

  assert.equal(r.conferencia.origem, 1200);
  assert.equal(r.conferencia.copiados, 1200);
  assert.equal(r.conferencia.noDestino, 1200);
  assert.equal(r.conferencia.pendentes, 0);

  const migrados = await store.pontos(r.sessaoId);
  assert.equal(migrados.length, 1200);
  // Precisão e altitude atravessam: perder isso na migração seria perder para
  // sempre o que permite medir o trecho depois.
  assert.equal(migrados[0].accuracy, 6);
  assert.equal(migrados[0].altitude, 550);
  assert.equal(migrados[0].timestamp, T0);
  assert.equal(migrados.at(-1).lat, original.at(-1).lat);
});

test('acima de 12 000 pontos — justamente o que a v1 descartava — migra tudo', async () => {
  // O `.slice(-12000)` cortava aqui. Se alguém tiver um array maior (importado,
  // ou de outro aparelho), a migração não pode repetir o corte.
  const original = Array.from({ length: 15_000 }, (_, i) => pontoV1(i));
  const store = novoStore();
  const r = await migrarTrilhaV1({ store, localStorageImpl: comTrilha(original), cryptoImpl });

  assert.equal(r.resultado, RESULTADO_MIGRACAO.MIGRADA);
  assert.equal(r.conferencia.noDestino, 15_000);
  assert.equal((await store.pontos(r.sessaoId))[0].seq, 0);
});

test('ponto que não migra vira PENDENTE — nunca some', async () => {
  const original = [pontoV1(0), { lat: null, lon: null, timestamp: T0 + 1 }, pontoV1(2)];
  const storage = comTrilha(original);
  const store = novoStore();

  const r = await migrarTrilhaV1({ store, localStorageImpl: storage, cryptoImpl });

  assert.equal(r.resultado, RESULTADO_MIGRACAO.MIGRADA, 'um ponto ruim não derruba a migração inteira');
  assert.equal(r.conferencia.copiados, 2);
  assert.equal(r.pendentes.length, 1);
  assert.equal(r.pendentes[0].indice, 1, 'o índice original fica registrado');
  assert.ok(r.pendentes[0].original, 'e o registro cru vai junto');
  // E o array v1 continua com os três, inclusive o que não migrou.
  assert.equal(JSON.parse(storage.__conteudo('vanguard:trilha')).length, 3);
});

test('rodar duas vezes não cria uma segunda cópia do mesmo caminho', async () => {
  const storage = comTrilha(Array.from({ length: 50 }, (_, i) => pontoV1(i)));
  const store = novoStore();

  const primeira = await migrarTrilhaV1({ store, localStorageImpl: storage, cryptoImpl });
  const segunda = await migrarTrilhaV1({ store, localStorageImpl: storage, cryptoImpl });

  assert.equal(primeira.resultado, RESULTADO_MIGRACAO.MIGRADA);
  assert.equal(segunda.resultado, RESULTADO_MIGRACAO.JA_MIGRADA);
  assert.equal(segunda.sessaoId, primeira.sessaoId);
  assert.equal((await store.sessoes()).length, 1, 'uma sessão, não duas');
});

test('trilha ilegível PARA a migração em vez de converter por cima', async () => {
  const storage = storageFalso({ 'vanguard:trilha': '{isto não é JSON' });
  const r = await migrarTrilhaV1({ store: novoStore(), localStorageImpl: storage, cryptoImpl });

  assert.equal(r.resultado, RESULTADO_MIGRACAO.FALHOU);
  assert.match(r.motivo, /preservado/);
  assert.equal(storage.__conteudo('vanguard:trilha'), '{isto não é JSON', 'intacto');
  assert.equal(storage.__remocoes(), 0);
});

test('falha de LEITURA não conclui e não altera nada', async () => {
  const storage = storageFalso({ 'vanguard:trilha': '[]' });
  storage.getItem = () => { throw new Error('SecurityError'); };
  const r = await migrarTrilhaV1({ store: novoStore(), localStorageImpl: storage, cryptoImpl });
  assert.equal(r.resultado, RESULTADO_MIGRACAO.FALHOU);
  assert.match(r.motivo, /Nada foi alterado/);
});

test('contagem que não bate FALHA em vez de "resolver" a diferença', async () => {
  // Store que engole um ponto no meio: é o modo de falha que uma migração
  // descuidada esconderia. Aqui ela tem de parar e dizer os dois números.
  const store = novoStore();
  const original = criarTrackStore({ persistencia: persistenciaEmMemoria(), relogio: () => T0 });
  let n = 0;
  const sabotado = {
    ...original,
    iniciar: (...a) => original.iniciar(...a),
    registrar: async (...a) => {
      n += 1;
      if (n === 3) return { resultado: 'GRAVADO', qualidade: 'VALIDO', seq: -1 }; // diz que gravou e não grava
      return original.registrar(...a);
    },
    contar: (...a) => original.contar(...a),
    sessao: (...a) => original.sessao(...a),
    sessoes: (...a) => original.sessoes(...a),
    pontos: (...a) => original.pontos(...a),
    anotarSessao: (...a) => original.anotarSessao(...a),
  };
  void store;

  const r = await migrarTrilhaV1({
    store: sabotado,
    localStorageImpl: comTrilha(Array.from({ length: 10 }, (_, i) => pontoV1(i))),
    cryptoImpl,
  });

  assert.equal(r.resultado, RESULTADO_MIGRACAO.FALHOU);
  assert.match(r.motivo, /Contagem não bate/);
  assert.match(r.motivo, /original continua intacto/);
  assert.equal(r.conferencia.esperado, 10);
  assert.equal(r.conferencia.noDestino, 9);
});

test('aparelho sem trilha v1 não é erro', async () => {
  const r = await migrarTrilhaV1({ store: novoStore(), localStorageImpl: storageFalso({}), cryptoImpl });
  assert.equal(r.resultado, RESULTADO_MIGRACAO.NADA_A_MIGRAR);
  assert.equal(r.origem.registros, 0);
});

test('a sessão migrada fica encerrada e carimbada com a procedência', async () => {
  const store = novoStore();
  const r = await migrarTrilhaV1({ store, localStorageImpl: comTrilha([pontoV1(0), pontoV1(1)]), cryptoImpl });
  const sessao = (await store.sessoes()).find((s) => s.id === r.sessaoId);

  assert.equal(sessao.origem, 'MIGRACAO_V1');
  assert.equal(sessao.estado, ESTADO_SESSAO.ENCERRADA, 'trilha migrada não fica "gravando"');
  assert.match(sessao.checksumOrigem, /^[0-9a-f]{64}$/);
  assert.equal(sessao.pendentes, 0);
});
