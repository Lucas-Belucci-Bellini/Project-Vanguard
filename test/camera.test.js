import test from 'node:test';
import assert from 'node:assert/strict';
import { RESULTADOS_CAPTURA, cameraNativaDisponivel, capturarFotoDaParada } from '../src/platform/camera.js';

const NATIVO = { isNativePlatform: () => true, convertFileSrc: (uri) => `http://localhost/_capacitor_file_${uri}` };
const WEB = { isNativePlatform: () => false };
const BYTES = new Uint8Array([255, 216, 255, 224, 1, 2]);

function respostaOk(bytes = BYTES, tipo = 'image/jpeg') {
  return {
    ok: true,
    headers: { get: (nome) => (nome.toLowerCase() === 'content-type' ? tipo : null) },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

test('fora do aplicativo instalado a câmera nativa não é usada', async () => {
  assert.equal(cameraNativaDisponivel(WEB), false);
  const resultado = await capturarFotoDaParada({ capacitorApi: WEB });
  assert.equal(resultado.estado, RESULTADOS_CAPTURA.INDISPONIVEL);
  assert.match(resultado.motivo, /aplicativo instalado/);
});

test('captura nativa devolve bytes e o que o sistema disse sobre a galeria', async () => {
  let opcoes;
  const cameraApi = { takePhoto: async (recebidas) => { opcoes = recebidas; return { uri: 'file:///foto.jpg', saved: true }; } };
  const resultado = await capturarFotoDaParada({ capacitorApi: NATIVO, cameraApi, buscar: async () => respostaOk() });

  assert.equal(resultado.estado, RESULTADOS_CAPTURA.CAPTURADA);
  assert.deepEqual([...resultado.bytes], [...BYTES]);
  assert.equal(resultado.mime, 'image/jpeg');
  assert.equal(resultado.salvouNaGaleria, true);
  assert.equal(opcoes.saveToGallery, true);
  assert.equal(opcoes.correctOrientation, true);
});

test('sem confirmação do sistema o app não afirma que salvou na galeria', async () => {
  // `saved: false` acontece de verdade quando a permissão de mídia é negada.
  const cameraApi = { takePhoto: async () => ({ uri: 'file:///foto.jpg', saved: false }) };
  const resultado = await capturarFotoDaParada({ capacitorApi: NATIVO, cameraApi, buscar: async () => respostaOk() });
  assert.equal(resultado.estado, RESULTADOS_CAPTURA.CAPTURADA);
  assert.equal(resultado.salvouNaGaleria, false);
});

test('cancelar a câmera é distinto de falhar', async () => {
  const cameraApi = { takePhoto: async () => { throw new Error('User cancelled photos app'); } };
  const resultado = await capturarFotoDaParada({ capacitorApi: NATIVO, cameraApi });
  assert.equal(resultado.estado, RESULTADOS_CAPTURA.CANCELADA);
});

test('falha da câmera é reportada como falha, para o chamador cair no input', async () => {
  const cameraApi = { takePhoto: async () => { throw new Error('camera indisponível'); } };
  const resultado = await capturarFotoDaParada({ capacitorApi: NATIVO, cameraApi });
  assert.equal(resultado.estado, RESULTADOS_CAPTURA.FALHOU);
  assert.equal(resultado.bytes, null);
});

test('plugin ausente ou sem a API vira indisponível, nunca exceção', async () => {
  const semApi = await capturarFotoDaParada({ capacitorApi: NATIVO, cameraApi: {} });
  assert.equal(semApi.estado, RESULTADOS_CAPTURA.INDISPONIVEL);
});

test('arquivo ilegível ou vazio não vira foto sem bytes', async () => {
  const cameraApi = { takePhoto: async () => ({ uri: 'file:///foto.jpg', saved: true }) };

  const semUri = await capturarFotoDaParada({ capacitorApi: NATIVO, cameraApi: { takePhoto: async () => ({ saved: true }) } });
  assert.equal(semUri.estado, RESULTADOS_CAPTURA.FALHOU);

  const respostaRuim = await capturarFotoDaParada({ capacitorApi: NATIVO, cameraApi, buscar: async () => ({ ok: false, status: 404 }) });
  assert.equal(respostaRuim.estado, RESULTADOS_CAPTURA.FALHOU);
  assert.match(respostaRuim.motivo, /404/);

  const vazio = await capturarFotoDaParada({ capacitorApi: NATIVO, cameraApi, buscar: async () => respostaOk(new Uint8Array()) });
  assert.equal(vazio.estado, RESULTADOS_CAPTURA.FALHOU);
  assert.match(vazio.motivo, /vazio/);
});

test('o caminho nativo passa pela tradução de URI da WebView', async () => {
  let pedido;
  const cameraApi = { takePhoto: async () => ({ uri: 'file:///data/foto.jpg', saved: true }) };
  await capturarFotoDaParada({
    capacitorApi: NATIVO,
    cameraApi,
    buscar: async (endereco) => { pedido = endereco; return respostaOk(); },
  });
  assert.match(pedido, /_capacitor_file_file:\/\/\/data\/foto\.jpg/);
});
