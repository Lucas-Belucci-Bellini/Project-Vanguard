import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RESULTADO_CLIMA, IDADE_LEITURA_VELHA_MS,
  urlDoClima, normalizarResposta, trovoadaPrevista, lerClima, atualizarClima,
} from '../src/core/clima.js';

const T = 1_700_000_000_000;
const SP = { lat: -23.55, lon: -46.63 };

function estadoFalso(inicial = {}) {
  const dados = { ...inicial };
  return { get: (k, p = null) => (k in dados ? dados[k] : p), set: (k, v) => { dados[k] = v; }, dados };
}

/** Resposta no formato real do Open-Meteo, reduzida ao essencial. */
const respostaBoa = (extras = {}) => ({
  latitude: -23.51, longitude: -46.61, elevation: 737, timezone: 'America/Sao_Paulo',
  current: {
    time: '2026-09-05T19:45', temperature_2m: 17.9, relative_humidity_2m: 90,
    apparent_temperature: 19.2, precipitation: 0, weather_code: 3,
    wind_speed_10m: 6.2, wind_gusts_10m: 18.4, pressure_msl: 1013.6,
  },
  hourly: {
    time: ['2026-09-05T20:00', '2026-09-05T21:00', '2026-09-05T22:00'],
    precipitation_probability: [30, 80, 95],
    precipitation: [0, 2.4, 11.8],
    weather_code: [3, 80, 95],
    wind_gusts_10m: [20, 45, 70],
  },
  ...extras,
});

const resposta = (corpo, ok = true, status = 200) => async () => ({
  ok, status, json: async () => corpo,
});

test('a URL não carrega chave de API — não há segredo para vazar de dentro do APK', () => {
  const url = urlDoClima({ lat: -23.55, lon: -46.63 });
  assert.ok(url.startsWith('https://api.open-meteo.com/'));
  assert.ok(!/key|token|apikey|secret/i.test(url), url);
  assert.ok(url.includes('latitude=-23.55') && url.includes('longitude=-46.63'));
});

test('a resposta vira o formato desta casa, com trovoada reconhecida', () => {
  const leitura = normalizarResposta(respostaBoa(), { agoraMs: T });
  assert.equal(leitura.atual.temperaturaC, 17.9);
  assert.equal(leitura.atual.rajadaKmh, 18.4);
  assert.equal(leitura.lidoEm, T);
  assert.equal(leitura.horas.length, 3);
  assert.equal(leitura.horas[2].trovoada, true);
  assert.equal(leitura.horas[2].chuvaProbabilidade, 95);
});

test('resposta sem o essencial vira null — nunca um objeto com campos vazios', () => {
  // Um objeto meio preenchido chegaria à tela como se fosse medida.
  assert.equal(normalizarResposta(null), null);
  assert.equal(normalizarResposta({}), null);
  assert.equal(normalizarResposta({ current: {} }), null);
  assert.equal(normalizarResposta({ current: { temperature_2m: 'quente' } }), null);
});

test('trovoada prevista diz QUANDO, e separa "agora" de "mais tarde"', () => {
  const leitura = normalizarResposta(respostaBoa(), { agoraMs: T });
  const t = trovoadaPrevista(leitura);
  assert.equal(t.prevista, true);
  assert.equal(t.agora, false, 'agora está encoberto, não trovejando');
  assert.equal(t.proximaHora, '2026-09-05T22:00');
  assert.equal(t.horasComTrovoada, 1);
});

test('a leitura vem SEMPRE com a idade — número velho não se passa por agora', () => {
  const estado = estadoFalso();
  assert.deepEqual(lerClima({ estado, agoraMs: T }), { leitura: null, idadeMs: null, velha: true });

  estado.set('clima', normalizarResposta(respostaBoa(), { agoraMs: T }));
  const nova = lerClima({ estado, agoraMs: T + 60_000 });
  assert.equal(nova.idadeMs, 60_000);
  assert.equal(nova.velha, false);

  const velha = lerClima({ estado, agoraMs: T + IDADE_LEITURA_VELHA_MS + 1 });
  assert.equal(velha.velha, true, 'passada a hora, a leitura é histórico, não "agora"');
});

test('busca boa atualiza e guarda', async () => {
  const estado = estadoFalso();
  const r = await atualizarClima({ posicao: SP, estado, buscar: resposta(respostaBoa()), agoraMs: T });
  assert.equal(r.resultado, RESULTADO_CLIMA.ATUALIZADO);
  assert.equal(r.idadeMs, 0);
  assert.equal(estado.dados.clima.atual.temperaturaC, 17.9);
});

test('FALHA DE REDE PRESERVA a leitura guardada — não apaga o que já se sabia', async () => {
  // O caminho errado seria gravar null por cima: a pessoa perderia a última
  // informação boa exatamente quando o sinal caiu, que é quando ela precisa.
  const estado = estadoFalso();
  await atualizarClima({ posicao: SP, estado, buscar: resposta(respostaBoa()), agoraMs: T });

  const caiu = await atualizarClima({
    posicao: SP, estado, agoraMs: T + 120_000,
    buscar: async () => { throw new Error('rede indisponível'); },
  });
  assert.equal(caiu.resultado, RESULTADO_CLIMA.SEM_REDE);
  assert.ok(caiu.leitura, 'a leitura guardada continua vindo');
  assert.equal(caiu.leitura.atual.temperaturaC, 17.9);
  assert.equal(caiu.idadeMs, 120_000, 'e a idade dela é dita');
  assert.equal(estado.dados.clima.atual.temperaturaC, 17.9, 'o armazenamento não foi tocado');
});

test('HTTP de erro também preserva, e diz o status', async () => {
  const estado = estadoFalso();
  await atualizarClima({ posicao: SP, estado, buscar: resposta(respostaBoa()), agoraMs: T });
  const r = await atualizarClima({ posicao: SP, estado, buscar: resposta(null, false, 503), agoraMs: T + 1000 });
  assert.equal(r.resultado, RESULTADO_CLIMA.SEM_REDE);
  assert.match(r.erro, /503/);
  assert.ok(r.leitura);
});

test('resposta inválida NÃO sobrescreve a leitura boa que estava guardada', async () => {
  const estado = estadoFalso();
  await atualizarClima({ posicao: SP, estado, buscar: resposta(respostaBoa()), agoraMs: T });
  const r = await atualizarClima({ posicao: SP, estado, buscar: resposta({ lixo: true }), agoraMs: T + 1000 });
  assert.equal(r.resultado, RESULTADO_CLIMA.RESPOSTA_INVALIDA);
  assert.equal(estado.dados.clima.atual.temperaturaC, 17.9);
});

test('sem posição não se inventa uma coordenada para consultar', async () => {
  // `Number('')` é 0, e (0, 0) é o golfo da Guiné. Já mordeu quatro vezes.
  for (const p of [null, undefined, { lat: '', lon: '' }, { lat: 'x', lon: 1 }]) {
    const r = await atualizarClima({ posicao: p, estado: estadoFalso(), buscar: resposta(respostaBoa()) });
    assert.equal(r.resultado, RESULTADO_CLIMA.SEM_POSICAO, `entrada: ${JSON.stringify(p)}`);
  }
});

test('sem fetch no ambiente, responde SEM_REDE em vez de explodir', async () => {
  const r = await atualizarClima({ posicao: SP, estado: estadoFalso(), buscar: null });
  assert.equal(r.resultado, RESULTADO_CLIMA.SEM_REDE);
});
