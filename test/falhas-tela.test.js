import assert from 'node:assert/strict';
import test from 'node:test';

import { CHAVE_FALHAS, TIPOS_FALHA, classificarFalha, criarRegistroDeFalhas } from '../src/core/falhas-tela.js';

/** Armazenamento falso com a interface do localStorage. */
function armazenamentoFalso(inicial = null) {
  let dados = inicial;
  return {
    getItem: (k) => (k === CHAVE_FALHAS ? dados : null),
    setItem: (k, v) => { if (k === CHAVE_FALHAS) dados = v; },
    removeItem: () => { dados = null; },
    espiar: () => dados,
  };
}

test('falha de import dinâmico é classificada como módulo que não chegou, nos três motores', () => {
  // As mensagens são as reais de cada motor. Android roda Chromium e iOS roda
  // WebKit, então as duas primeiras cobrem o aplicativo nas duas plataformas.
  const mensagens = [
    'Failed to fetch dynamically imported module: http://localhost/assets/noturno-CiL3.js', // Chromium
    'error loading dynamically imported module',                                            // Firefox
    'Importing a module script failed.',                                                    // WebKit
  ];
  for (const mensagem of mensagens) {
    assert.equal(classificarFalha(new Error(mensagem)), TIPOS_FALHA.CHUNK_NAO_CARREGOU, mensagem);
  }
});

test('erro de dentro da tela NÃO é confundido com módulo faltando', () => {
  // A distinção é o motivo do módulo existir: um manda investigar o pacote, o
  // outro manda investigar a página. Trocá-los manda o diagnóstico para o lado
  // oposto do defeito.
  const erro = new TypeError("Cannot read properties of undefined (reading 'lat')");
  assert.equal(classificarFalha(erro), TIPOS_FALHA.TELA_FALHOU);
});

test('o que não dá para classificar vira DESCONHECIDO, nunca um palpite', () => {
  assert.equal(classificarFalha(null), TIPOS_FALHA.DESCONHECIDO);
  assert.equal(classificarFalha(''), TIPOS_FALHA.DESCONHECIDO);
  assert.equal(classificarFalha({ message: 'algo opaco' }), TIPOS_FALHA.DESCONHECIDO);
});

test('a mesma falha repetida vira contagem, não uma lista de duplicatas', () => {
  const registro = criarRegistroDeFalhas({ armazenamento: armazenamentoFalso(), agora: () => 1000 });
  const erro = new Error('Failed to fetch dynamically imported module: /assets/mapa.js');
  registro.registrar('#/mapa', erro);
  registro.registrar('#/mapa', erro);
  registro.registrar('#/mapa', erro);
  const lista = registro.listar();
  assert.equal(lista.length, 1, 'três falhas iguais deveriam ser uma entrada');
  assert.equal(lista[0].vezes, 3);
});

test('o registro sobrevive ao recarregamento do aplicativo', () => {
  const armazenamento = armazenamentoFalso();
  const primeira = criarRegistroDeFalhas({ armazenamento });
  primeira.registrar('#/noturno', new Error('Importing a module script failed.'));

  // Outra instância, como acontece quando o app reabre.
  const segunda = criarRegistroDeFalhas({ armazenamento });
  assert.deepEqual(segunda.rotasComChunkFaltando(), ['#/noturno']);
});

test('dado corrompido no armazenamento não derruba o registro', () => {
  // Um JSON quebrado aqui não pode impedir o app de abrir — o registro é
  // diagnóstico, não função vital.
  const registro = criarRegistroDeFalhas({ armazenamento: armazenamentoFalso('{isso não é JSON') });
  assert.deepEqual(registro.listar(), []);
  registro.registrar('#/mapa', new Error('x'));
  assert.equal(registro.listar().length, 1);
});

test('sem armazenamento o registro funciona em memória', () => {
  // Janela anônima com dados de site bloqueados: o acessador do localStorage
  // lança. O registro precisa continuar existindo.
  const registro = criarRegistroDeFalhas({ armazenamento: null });
  registro.registrar('#/bussola', new Error('Failed to fetch dynamically imported module: /x.js'));
  assert.deepEqual(registro.rotasComChunkFaltando(), ['#/bussola']);
});

test('a lista é limitada para não crescer sem fim no aparelho', () => {
  const registro = criarRegistroDeFalhas({ armazenamento: armazenamentoFalso(), limite: 3 });
  for (let i = 0; i < 10; i += 1) registro.registrar(`#/rota-${i}`, new Error(`erro ${i}`));
  assert.equal(registro.listar().length, 3);
  assert.equal(registro.listar()[0].rota, '#/rota-9', 'a mais recente fica no topo');
});
