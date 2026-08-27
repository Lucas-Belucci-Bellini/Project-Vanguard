import test from 'node:test';
import assert from 'node:assert/strict';
import { compartilharArquivo, compartilharTexto, ESTADOS_COMPARTILHAMENTO } from '../src/platform/compartilhamento.js';

const blob = { type: 'application/json' };

function fakeFileCtor() {
  return class FakeFile {
    constructor(partes, nome, opcoes) {
      this.partes = partes;
      this.name = nome;
      this.type = opcoes.type;
    }
  };
}

test('compartilharTexto usa Web Share e não confunde aceitação com entrega', async () => {
  const chamadas = [];
  const resultado = await compartilharTexto({
    texto: 'VANGUARD FIELD\nMGRS: 22K',
    navigatorApi: { share: async (dados) => chamadas.push(dados) },
  });
  assert.equal(resultado.estado, ESTADOS_COMPARTILHAMENTO.COMPARTILHADO);
  assert.equal(resultado.canal, 'WEB_SHARE');
  assert.deepEqual(chamadas, [{ title: 'Vanguard Field', text: 'VANGUARD FIELD\nMGRS: 22K' }]);
});

test('compartilharTexto preserva cancelamento explícito sem usar clipboard escondido', async () => {
  let copiado = false;
  const resultado = await compartilharTexto({
    texto: 'coordenadas',
    navigatorApi: {
      share: async () => { const erro = new Error('cancelado'); erro.name = 'AbortError'; throw erro; },
      clipboard: { writeText: async () => { copiado = true; } },
    },
  });
  assert.equal(resultado.estado, ESTADOS_COMPARTILHAMENTO.CANCELADO);
  assert.equal(copiado, false);
});

test('compartilharTexto usa clipboard somente quando Web Share não existe', async () => {
  let valor = null;
  const resultado = await compartilharTexto({
    texto: 'posição local',
    navigatorApi: { clipboard: { writeText: async (texto) => { valor = texto; } } },
  });
  assert.equal(resultado.estado, ESTADOS_COMPARTILHAMENTO.COPIADO);
  assert.equal(valor, 'posição local');
});

test('compartilharTexto explicita ausência de canal e rejeita texto vazio', async () => {
  assert.equal((await compartilharTexto({ texto: '   ', navigatorApi: {} })).estado, ESTADOS_COMPARTILHAMENTO.FALHA);
  assert.equal((await compartilharTexto({ texto: 'posição', navigatorApi: {} })).estado, ESTADOS_COMPARTILHAMENTO.INDISPONIVEL);
});

test('compartilharArquivo usa Web Share para arquivos quando o ambiente aceita a operação', async () => {
  const chamadas = [];
  const resultado = await compartilharArquivo({
    blob,
    fileName: 'registro.json',
    navigatorApi: {
      canShare: ({ files }) => files.length === 1,
      share: async (dados) => chamadas.push(dados),
    },
    FileCtor: fakeFileCtor(),
  });
  assert.equal(resultado.estado, ESTADOS_COMPARTILHAMENTO.COMPARTILHADO);
  assert.equal(resultado.canal, 'WEB_SHARE_FILE');
  assert.equal(chamadas[0].files[0].name, 'registro.json');
});

test('compartilharArquivo faz download local quando compartilhamento de arquivos não é suportado', async () => {
  const eventos = [];
  const resultado = await compartilharArquivo({
    blob,
    fileName: 'trilha.gpx',
    navigatorApi: { share: async () => { throw new Error('não suportado'); }, canShare: () => false },
    documentApi: { createElement: (nome) => ({ nome, click: () => eventos.push('click'), set href(valor) { eventos.push(`href:${valor}`); }, set download(valor) { eventos.push(`download:${valor}`); }, set rel(_) {} }) },
    urlApi: { createObjectURL: () => 'blob:teste', revokeObjectURL: (url) => eventos.push(`revogado:${url}`) },
    FileCtor: fakeFileCtor(),
  });
  assert.equal(resultado.estado, ESTADOS_COMPARTILHAMENTO.BAIXADO);
  assert.deepEqual(eventos, ['href:blob:teste', 'download:trilha.gpx', 'click', 'revogado:blob:teste']);
});

test('compartilharArquivo não promete armazenamento quando o ambiente não tem fallback', async () => {
  const resultado = await compartilharArquivo({ blob, fileName: 'registro.json', navigatorApi: {}, documentApi: {}, urlApi: {}, FileCtor: null });
  assert.equal(resultado.estado, ESTADOS_COMPARTILHAMENTO.INDISPONIVEL);
});
