import assert from 'node:assert/strict';
import test from 'node:test';

import { RESULTADO_ROTA, resumirAutoteste, testarRotas } from '../src/core/autoteste-rotas.js';
import { montarRelatorio } from '../src/core/relatorio-diagnostico.js';

const rotaOk = (hash) => ({ hash, titulo: hash, carregar: async () => () => ({ elemento: {} }) });
const rotaQuebrada = (hash, erro) => ({ hash, titulo: hash, carregar: async () => { throw erro; } });

test('rota que carrega e exporta função é OK', async () => {
  const linhas = await testarRotas([rotaOk('#/mapa')]);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].resultado, RESULTADO_ROTA.OK);
});

test('módulo que chega mas não exporta função é FALHA, não OK', async () => {
  // Sem esta conferência o autoteste diria OK para a rota que monta em branco —
  // exatamente o defeito do `append` fora do try, mas visto do outro lado.
  const linhas = await testarRotas([{ hash: '#/x', titulo: 'x', carregar: async () => undefined }]);
  assert.equal(linhas[0].resultado, RESULTADO_ROTA.FALHOU);
  assert.match(linhas[0].mensagem, /não exporta uma função/);
});

test('falha de import dinâmico é classificada como módulo que não chegou', async () => {
  const erro = new Error('Failed to fetch dynamically imported module: /assets/noturno.js');
  const linhas = await testarRotas([rotaQuebrada('#/noturno', erro)]);
  assert.equal(linhas[0].tipo, 'CHUNK_NAO_CARREGOU');
});

test('uma rota quebrada não impede as seguintes de serem testadas', async () => {
  // Parar na primeira falha esconderia as demais, e o relatório diria menos do
  // que o aparelho sabe.
  const linhas = await testarRotas([
    rotaOk('#/a'),
    rotaQuebrada('#/b', new Error('Importing a module script failed.')),
    rotaOk('#/c'),
  ]);
  assert.deepEqual(linhas.map((l) => l.hash), ['#/a', '#/b', '#/c']);
  assert.equal(resumirAutoteste(linhas).falhas, 1);
  assert.deepEqual(resumirAutoteste(linhas).rotasComFalha, ['#/b']);
});

test('o progresso é informado a cada rota', async () => {
  const vistos = [];
  await testarRotas([rotaOk('#/a'), rotaOk('#/b')], { aoProgresso: (f, t) => vistos.push(`${f}/${t}`) });
  assert.deepEqual(vistos, ['1/2', '2/2']);
});

test('o relatório mostra campo ausente como INDISPONÍVEL, nunca inventado', () => {
  const texto = montarRelatorio({ identidade: {}, agora: () => new Date('2026-09-03T00:00:00Z') });
  assert.match(texto, /Versão do app\s+INDISPONÍVEL/);
  assert.match(texto, /Commit\s+INDISPONÍVEL/);
});

test('o relatório inclui as rotas que falharam, com a mensagem', () => {
  const linhas = [
    { hash: '#/mapa', resultado: 'OK', ms: 12 },
    { hash: '#/noturno', resultado: 'FALHOU', tipo: 'CHUNK_NAO_CARREGOU', mensagem: 'Failed to fetch', ms: 30 },
  ];
  const texto = montarRelatorio({ identidade: { versao: '1.4.4' }, autoteste: linhas });
  assert.match(texto, /1 com falha/);
  assert.match(texto, /#\/noturno/);
  assert.match(texto, /CHUNK_NAO_CARREGOU/);
  assert.match(texto, /Failed to fetch/);
});

test('ESTRUTURAL: o relatório não carrega dado pessoal', () => {
  // Ele existe para ser colado num chat. Coordenada, trilha, foto ou contato
  // ali dentro transformaria um pedido de ajuda num vazamento.
  const texto = montarRelatorio({
    identidade: { versao: '1.4.4', build: '1.4.4+abc.202609030000', origem: 'http://localhost' },
    falhas: [{ rota: '#/mapa', tipo: 'TELA_FALHOU', mensagem: 'x', vezes: 1 }],
    autoteste: [{ hash: '#/mapa', resultado: 'OK', ms: 5 }],
  });
  for (const proibido of ['latitude', 'longitude', 'coordenada', 'trilha', 'waypoint', 'contato']) {
    assert.ok(!texto.toLowerCase().includes(proibido) || /não contém/.test(texto),
      `o relatório não pode conter "${proibido}"`);
  }
  assert.match(texto, /não contém coordenada, trilha, foto nem contato/);
});
