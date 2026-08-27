import test from 'node:test';
import assert from 'node:assert/strict';
import { lerPermissaoGps, normalizarPermissaoGps, ESTADOS_PERMISSAO } from '../src/platform/permissoes.js';

test('normalizarPermissaoGps traduz estados do plugin sem solicitar acesso', () => {
  assert.equal(normalizarPermissaoGps({ location: 'granted' }), ESTADOS_PERMISSAO.CONCEDIDA);
  assert.equal(normalizarPermissaoGps({ location: 'denied' }), ESTADOS_PERMISSAO.NEGADA);
  assert.equal(normalizarPermissaoGps({ location: 'prompt' }), ESTADOS_PERMISSAO.NAO_SOLICITADA);
  assert.equal(normalizarPermissaoGps({ location: 'prompt-with-rationale' }), ESTADOS_PERMISSAO.NAO_SOLICITADA);
  assert.equal(normalizarPermissaoGps({ location: 'unknown' }), ESTADOS_PERMISSAO.INDISPONIVEL);
});

test('lerPermissaoGps consulta o plugin Capacitor e não chama requestPermissions', async () => {
  let requests = 0;
  const resultado = await lerPermissaoGps({
    capacitorApi: { isNativePlatform: () => true },
    geolocationApi: {
      checkPermissions: async () => ({ location: 'granted' }),
      requestPermissions: async () => { requests += 1; },
    },
  });
  assert.equal(resultado, ESTADOS_PERMISSAO.CONCEDIDA);
  assert.equal(requests, 0);
});

test('lerPermissaoGps traduz a Permissions API Web', async () => {
  const estados = ['granted', 'denied', 'prompt'];
  const resultados = [];
  for (const state of estados) {
    resultados.push(await lerPermissaoGps({
      navigatorApi: { permissions: { query: async () => ({ state }) } },
      capacitorApi: { isNativePlatform: () => false },
    }));
  }
  assert.deepEqual(resultados, [
    ESTADOS_PERMISSAO.CONCEDIDA,
    ESTADOS_PERMISSAO.NEGADA,
    ESTADOS_PERMISSAO.NAO_SOLICITADA,
  ]);
});

test('lerPermissaoGps informa dependência do navegador quando a API Web não existe', async () => {
  assert.equal(await lerPermissaoGps({ navigatorApi: {}, capacitorApi: { isNativePlatform: () => false } }), ESTADOS_PERMISSAO.BROWSER_DEPENDENT);
  assert.equal(await lerPermissaoGps({ navigatorApi: { permissions: { query: async () => { throw new Error('bloqueado'); } } }, capacitorApi: { isNativePlatform: () => false } }), ESTADOS_PERMISSAO.BROWSER_DEPENDENT);
});

test('lerPermissaoGps não inventa uma permissão quando o bridge nativo falha', async () => {
  assert.equal(await lerPermissaoGps({
    capacitorApi: { isNativePlatform: () => true },
    geolocationApi: { checkPermissions: async () => { throw new Error('bridge indisponível'); } },
  }), ESTADOS_PERMISSAO.INDISPONIVEL);
  assert.equal(await lerPermissaoGps({
    capacitorApi: { isNativePlatform: () => true },
    geolocationApi: null,
  }), ESTADOS_PERMISSAO.INDISPONIVEL);
});
