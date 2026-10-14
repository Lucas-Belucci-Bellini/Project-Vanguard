import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ESTADOS_ESCUTA, RESTRICOES_AUDIO, criarEscutaAmbiente } from '../src/core/escuta-ambiente.js';
import { TIPOS_ALERTA, padraoDoAlerta, GRAVIDADES } from '../src/core/alertas-tateis.js';

/** Grafo de áudio de mentira, com registro do que foi ligado onde. */
function fabricarAmbiente({ falharEm = null, nomeDoErro = 'NotAllowedError', taxaAmostragem = 48000 } = {}) {
  const registro = { paradas: 0, conectados: [], fechado: false, restricoes: null };

  const trilha = { stop: () => { registro.paradas += 1; }, getSettings: () => ({ autoGainControl: false }) };
  const fluxo = { getTracks: () => [trilha], getAudioTracks: () => [trilha] };

  const analisador = {
    fftSize: 0,
    smoothingTimeConstant: 0,
    get frequencyBinCount() { return this.fftSize / 2; },
    proximoEspectro: null,
    getFloatFrequencyData(alvo) {
      const fonte = this.proximoEspectro;
      for (let i = 0; i < alvo.length; i += 1) alvo[i] = fonte ? fonte[i] : -100;
    },
    disconnect: () => {},
  };

  class ContextoFalso {
    constructor() { this.sampleRate = taxaAmostragem; this.state = 'running'; }
    createAnalyser() { return analisador; }
    createMediaStreamSource(entrada) {
      return { connect: (destino) => { registro.conectados.push({ entrada, destino }); } };
    }
    close() { registro.fechado = true; }
    get destination() { return { __destino: true }; }
  }

  const midia = {
    async getUserMedia(restricoes) {
      registro.restricoes = restricoes;
      if (falharEm === 'permissao') {
        const erro = new Error('negado');
        erro.name = nomeDoErro;
        throw erro;
      }
      return fluxo;
    },
  };

  const laco = { tarefa: null, cancelado: false };
  const agendar = (tarefa) => {
    laco.tarefa = tarefa;
    laco.cancelado = false;
    return () => { laco.cancelado = true; laco.tarefa = null; };
  };

  return { registro, midia, analisador, laco, agendar, janela: { AudioContext: ContextoFalso } };
}

/** Espectro plano, com a banda do motor levantada em `motorDb`. */
function espectroCom({ motorDb, vozDb, bins = 1024, taxaAmostragem = 48000 }) {
  const larguraBin = taxaAmostragem / (2 * bins);
  const dados = new Float32Array(bins).fill(-120);
  for (let hz = 30; hz <= 200; hz += larguraBin) dados[Math.round(hz / larguraBin)] = motorDb;
  for (let hz = 300; hz <= 3400; hz += larguraBin) dados[Math.round(hz / larguraBin)] = vozDb;
  return dados;
}

test('sem getUserMedia ou sem AudioContext o módulo diz INDISPONIVEL, não finge escutar', async () => {
  const semMidia = criarEscutaAmbiente({ midia: null, janela: { AudioContext: class {} } });
  assert.equal(await semMidia.iniciar(), ESTADOS_ESCUTA.INDISPONIVEL);

  const { midia } = fabricarAmbiente();
  const semContexto = criarEscutaAmbiente({ midia, janela: {} });
  assert.equal(await semContexto.iniciar(), ESTADOS_ESCUTA.INDISPONIVEL);
});

test('o microfone é pedido cru — ganho automático apagaria justamente a subida que interessa', async () => {
  const { midia, janela, registro } = fabricarAmbiente();
  const escuta = criarEscutaAmbiente({ midia, janela });
  await escuta.iniciar();
  assert.deepEqual(registro.restricoes, RESTRICOES_AUDIO);
  assert.equal(registro.restricoes.audio.autoGainControl, false);
  assert.equal(registro.restricoes.audio.noiseSuppression, false);
  assert.equal(registro.restricoes.video, false, 'vídeo nunca é pedido');
  escuta.parar();
});

test('permissão negada não vira falha genérica', async () => {
  const { midia, janela } = fabricarAmbiente({ falharEm: 'permissao' });
  const escuta = criarEscutaAmbiente({ midia, janela });
  assert.equal(await escuta.iniciar(), ESTADOS_ESCUTA.NEGADA);

  const semAparelho = fabricarAmbiente({ falharEm: 'permissao', nomeDoErro: 'NotFoundError' });
  const outra = criarEscutaAmbiente({ midia: semAparelho.midia, janela: semAparelho.janela });
  assert.equal(await outra.iniciar(), ESTADOS_ESCUTA.INDISPONIVEL);
});

test('o áudio nunca é ligado na saída — o grafo termina no analisador', async () => {
  const { midia, janela, registro, analisador } = fabricarAmbiente();
  const escuta = criarEscutaAmbiente({ midia, janela });
  await escuta.iniciar();
  assert.equal(registro.conectados.length, 1);
  assert.equal(registro.conectados[0].destino, analisador, 'a fonte só pode ir para o analisador');
  assert.ok(!registro.conectados.some(({ destino }) => destino?.__destino),
    'ligar em destination jogaria o microfone no alto-falante');
  escuta.parar();
});

test('parar solta as trilhas e fecha o contexto — o indicador de microfone tem de apagar', async () => {
  const { midia, janela, registro } = fabricarAmbiente();
  const escuta = criarEscutaAmbiente({ midia, janela });
  await escuta.iniciar();
  assert.equal(escuta.estado(), ESTADOS_ESCUTA.ESCUTANDO);
  escuta.parar();
  assert.equal(registro.paradas, 1, 'a trilha do microfone continuou aberta');
  assert.equal(registro.fechado, true, 'o AudioContext continuou aberto');
  assert.equal(escuta.estado(), ESTADOS_ESCUTA.PARADA);
});

test('um veículo se aproximando vira evento e vibra com o ritmo do próprio tipo', async () => {
  const { midia, janela, analisador, laco, agendar } = fabricarAmbiente();
  const eventos = [];
  const vibracoes = [];
  let relogio = 0;

  const escuta = criarEscutaAmbiente({
    midia,
    janela,
    agendar,
    intervaloMs: 100,
    agora: () => relogio,
    aoEvento: (e) => eventos.push(e),
    vibrarApi: (padrao) => vibracoes.push(padrao),
  });
  await escuta.iniciar();

  const passo = (espectro) => { analisador.proximoEspectro = espectro; relogio += 100; laco.tarefa(); };
  for (let i = 0; i < 200; i += 1) passo(espectroCom({ motorDb: -70, vozDb: -72 }));
  for (let i = 0; i < 80 && eventos.length === 0; i += 1) {
    passo(espectroCom({ motorDb: -70 + i * 0.25, vozDb: -72 }));
  }
  escuta.parar();
  assert.equal(laco.cancelado, true, 'parar tem de encerrar o laço de medição');

  assert.ok(eventos.length > 0, 'a aproximação não chegou à tela');
  assert.equal(eventos[0].evento, 'VEICULO_APROXIMANDO');
  assert.deepEqual(vibracoes[0], padraoDoAlerta(TIPOS_ALERTA.VEICULO_APROXIMANDO, GRAVIDADES.ALTO));
});

test('sem vibração o aviso continua chegando à tela', async () => {
  const { midia, janela, analisador, laco, agendar } = fabricarAmbiente();
  const eventos = [];
  let relogio = 0;
  const escuta = criarEscutaAmbiente({
    midia, janela, agendar, agora: () => relogio, vibrarApi: null, aoEvento: (e) => eventos.push(e),
  });
  await escuta.iniciar();
  const passo = (espectro) => { analisador.proximoEspectro = espectro; relogio += 100; laco.tarefa(); };
  for (let i = 0; i < 200; i += 1) passo(espectroCom({ motorDb: -70, vozDb: -72 }));
  for (let i = 0; i < 80 && eventos.length === 0; i += 1) passo(espectroCom({ motorDb: -70 + i * 0.25, vozDb: -72 }));
  escuta.parar();
  assert.ok(eventos.length > 0, 'o canal visual não pode depender do canal tátil');
  assert.equal(eventos[0].vibrou, false);
});

test('ESTRUTURAL: a escuta não tem como transmitir, gravar ou guardar o áudio', () => {
  // O operador pediu escuta e só escuta, para o app não virar brinquedo de
  // quem quer atrapalhar. Isto não é uma promessa no README: é o código sendo
  // lido. Se alguém acrescentar qualquer uma destas APIs, este teste quebra.
  const proibidas = [
    'MediaRecorder',
    'RTCPeerConnection',
    'webkitRTCPeerConnection',
    'createMediaStreamDestination',
    'destination',
    'WebSocket',
    'XMLHttpRequest',
    'sendBeacon',
    'fetch(',
    'localStorage',
    'indexedDB',
  ];
  for (const arquivo of ['../src/core/escuta-ambiente.js', '../src/engine/escuta.js']) {
    const fonte = fs.readFileSync(new URL(arquivo, import.meta.url), 'utf8');
    const codigo = fonte
      .replace(/\/\*\*[\s\S]*?\*\//g, '')   // blocos de documentação
      .replace(/^\s*\/\/.*$/gm, '')          // comentários de linha
      .replace(/\/\*[\s\S]*?\*\//g, '');
    for (const proibida of proibidas) {
      assert.ok(!codigo.includes(proibida), `${arquivo} passou a usar ${proibida}`);
    }
  }
});
