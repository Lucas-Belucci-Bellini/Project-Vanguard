import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLASSES_DADO,
  BACKENDS,
  CHAVES_LOCAIS,
  chavesCriticas,
  descartavel,
  descreverChaveLocal,
} from '../src/core/dados/catalogo.js';
import {
  RESULTADO_INVENTARIO,
  inventariarLocalStorage,
  inventariarTudo,
  chavesDeclaradasAusentes,
} from '../src/core/dados/inventario.js';
import { CHAVES } from '../src/core/estado.js';

/**
 * localStorage falso que **explode se alguém tentar escrever**.
 *
 * Não é paranoia: o inventário roda antes e depois de uma migração, e é a
 * única prova de que nada se perdeu. Se ele puder alterar o que mede, ele
 * deixa de ser prova — então a proibição de escrita é testada, não confiada.
 */
function storageFalso(dados = {}) {
  const mapa = new Map(Object.entries(dados));
  const alvo = {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: () => { throw new Error('o inventário escreveu no armazenamento'); },
    removeItem: () => { throw new Error('o inventário apagou do armazenamento'); },
    clear: () => { throw new Error('o inventário limpou o armazenamento'); },
  };
  // `Object.keys` do inventário precisa enxergar as chaves como o localStorage
  // real expõe: como propriedades próprias.
  for (const [k, v] of mapa) Object.defineProperty(alvo, k, { value: v, enumerable: true });
  return alvo;
}

const cryptoImpl = globalThis.crypto;

test('o catálogo e o CHAVES do estado descrevem exatamente o mesmo conjunto', () => {
  // Uma lista copiada para outro arquivo envelhece em silêncio — já aconteceu
  // neste repositório com a lista de rotas. Aqui o teste compara as duas
  // fontes, então declarar uma chave nova sem catalogá-la falha na hora.
  const noEstado = new Set(Object.values(CHAVES));
  const noCatalogo = new Set(CHAVES_LOCAIS.map((e) => e.chave));

  const naoCatalogadas = [...noEstado].filter((c) => !noCatalogo.has(c));
  const catalogadasAMais = [...noCatalogo].filter((c) => !noEstado.has(c));

  assert.deepEqual(naoCatalogadas, [], `chaves em estado.js sem entrada no catálogo: ${naoCatalogadas.join(', ')}`);
  assert.deepEqual(catalogadasAMais, [], `chaves no catálogo que não existem em estado.js: ${catalogadasAMais.join(', ')}`);
});

test('toda entrada do catálogo declara o que a perda dela custa', () => {
  for (const entrada of CHAVES_LOCAIS) {
    assert.ok(Object.values(CLASSES_DADO).includes(entrada.classe), `${entrada.chave}: classe inválida`);
    assert.notEqual(entrada.classe, CLASSES_DADO.DESCONHECIDO,
      `${entrada.chave}: DESCONHECIDO é atribuído em execução, nunca declarado`);
    assert.ok(entrada.titulo && entrada.escritoPor, `${entrada.chave}: falta título ou dono`);
  }
  // A trilha é o dado mais caro do aplicativo; se ela deixar de ser crítica,
  // alguma "limpeza" vai poder levá-la junto.
  assert.equal(descreverChaveLocal('trilha').classe, CLASSES_DADO.CRITICO);
  assert.equal(descreverChaveLocal('contatos').classe, CLASSES_DADO.CRITICO);
  assert.ok(chavesCriticas().length >= 4);
  assert.equal(descartavel(CLASSES_DADO.CRITICO), false);
  assert.equal(descartavel(CLASSES_DADO.CACHE), true);
});

test('o inventário lê sem escrever, e conta coleção sem confundir com objeto', async () => {
  const storage = storageFalso({
    'vanguard:trilha': JSON.stringify([{ lat: -23.3, lon: -51.1 }, { lat: -23.4, lon: -51.2 }]),
    'vanguard:bussola': JSON.stringify({ correcaoSensorDeg: -20.1 }),
    'vanguard:waypoints': JSON.stringify([]),
    'outra-app:coisa': 'ignorada',
  });

  const { resultado, itens } = await inventariarLocalStorage({ localStorageImpl: storage, cryptoImpl });
  assert.equal(resultado, RESULTADO_INVENTARIO.COMPLETO);
  // A chave de outro aplicativo não entra: o prefixo é a fronteira.
  assert.equal(itens.length, 3);

  const trilha = itens.find((i) => i.chave === 'trilha');
  assert.equal(trilha.registros, 2);
  assert.equal(trilha.classe, CLASSES_DADO.CRITICO);
  assert.equal(trilha.backend, BACKENDS.LOCAL_STORAGE);
  assert.equal(trilha.caminho, 'vanguard:trilha');
  assert.ok(trilha.bytes > 0);
  assert.match(trilha.checksum, /^[0-9a-f]{64}$/);

  // Trilha vazia conta 0; preferência não é coleção e conta `null`. A diferença
  // é o que permite comparar contagens antes e depois sem falso alarme.
  assert.equal(itens.find((i) => i.chave === 'waypoints').registros, 0);
  assert.equal(itens.find((i) => i.chave === 'bussola').registros, null);
});

test('chave fora do catálogo vira DESCONHECIDA, aparece no relatório e trava a migração', async () => {
  const storage = storageFalso({
    'vanguard:trilha': JSON.stringify([{ lat: 1, lon: 2 }]),
    'vanguard:experimento-antigo': JSON.stringify([1, 2, 3]),
  });

  const inventario = await inventariarTudo({ localStorageImpl: storage, cryptoImpl, indexedDBImpl: null, cachesImpl: null });
  const orfa = inventario.itens.find((i) => i.chave === 'experimento-antigo');

  assert.equal(orfa.classe, CLASSES_DADO.DESCONHECIDO);
  assert.equal(orfa.catalogada, false);
  assert.equal(orfa.registros, 3, 'o conteúdo continua sendo lido e contado');
  assert.match(orfa.observacao, /[Nn]unca apagar/);
  assert.equal(inventario.desconhecidas.length, 1);
  assert.ok(inventario.motivosDeBloqueio.some((m) => /fora do catálogo/.test(m)));
});

test('conteúdo ilegível é preservado, marcado, e impede migrar', async () => {
  const storage = storageFalso({
    'vanguard:trilha': '{isto não é JSON',
    'vanguard:destino': JSON.stringify({ lat: 1, lon: 2 }),
  });

  const inventario = await inventariarTudo({ localStorageImpl: storage, cryptoImpl, indexedDBImpl: null, cachesImpl: null });
  const trilha = inventario.itens.find((i) => i.chave === 'trilha');

  assert.equal(trilha.ilegivel, true);
  assert.equal(trilha.lido, true, 'ilegível não é ausente: o valor continua lá');
  assert.ok(trilha.bytes > 0);
  assert.match(trilha.checksum, /^[0-9a-f]{64}$/, 'o resumo é do byte cru, então funciona mesmo sem JSON');
  assert.equal(inventario.seguroParaMigrar, false);
  assert.ok(inventario.motivosDeBloqueio.some((m) => /ileg[íi]vel/i.test(m)));
});

test('aparelho novo, sem nada guardado, é seguro para migrar', async () => {
  const inventario = await inventariarTudo({ localStorageImpl: storageFalso({}), cryptoImpl, indexedDBImpl: null, cachesImpl: null });
  assert.equal(inventario.resultado, RESULTADO_INVENTARIO.COMPLETO);
  assert.equal(inventario.totais.itens, 0);
  assert.equal(inventario.seguroParaMigrar, true);
  assert.deepEqual(inventario.motivosDeBloqueio, []);
  // Ausência não é perda: as declaradas que não existem são listadas à parte.
  assert.equal(chavesDeclaradasAusentes(inventario).length, CHAVES_LOCAIS.length);
});

test('backend indisponível não é o mesmo que leitura incompleta', async () => {
  // Rodar no Node sem IndexedDB não pode bloquear uma migração — isso é
  // ambiente diferente, não dado perdido. PARCIAL fica para o caso perigoso.
  const inventario = await inventariarTudo({
    localStorageImpl: storageFalso({ 'vanguard:destino': JSON.stringify({ lat: 1, lon: 2 }) }),
    cryptoImpl, indexedDBImpl: null, cachesImpl: null,
  });
  assert.equal(inventario.backends[BACKENDS.INDEXED_DB], RESULTADO_INVENTARIO.INDISPONIVEL);
  assert.equal(inventario.resultado, RESULTADO_INVENTARIO.COMPLETO);
  assert.equal(inventario.seguroParaMigrar, true);
});

test('falha ao LER algo que existe vira PARCIAL e bloqueia', async () => {
  const storage = storageFalso({ 'vanguard:trilha': '[]' });
  storage.getItem = () => { throw new Error('SecurityError'); };

  const inventario = await inventariarTudo({ localStorageImpl: storage, cryptoImpl, indexedDBImpl: null, cachesImpl: null });
  assert.equal(inventario.resultado, RESULTADO_INVENTARIO.PARCIAL);
  assert.equal(inventario.seguroParaMigrar, false);
  const item = inventario.itens.find((i) => i.chave === 'trilha');
  assert.equal(item.lido, false);
  assert.match(item.observacao, /não pode ser considerado ausente/);
});

test('o checksum muda quando o conteúdo muda, e repete quando não muda', async () => {
  const ler = async (valor) => {
    const { itens } = await inventariarLocalStorage({ localStorageImpl: storageFalso({ 'vanguard:trilha': valor }), cryptoImpl });
    return itens[0].checksum;
  };
  const a = await ler(JSON.stringify([{ lat: 1, lon: 2 }]));
  const igual = await ler(JSON.stringify([{ lat: 1, lon: 2 }]));
  const b = await ler(JSON.stringify([{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }]));
  assert.equal(a, igual, 'mesmo conteúdo, mesmo resumo — é o que permite comparar antes e depois');
  assert.notEqual(a, b);
});
