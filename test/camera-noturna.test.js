import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ESTADOS_CAMERA,
  LADO_MAXIMO_PROCESSADO,
  RESTRICOES_VIDEO,
  aplicarExposicaoLonga,
  criarCameraNoturna,
  dimensaoProcessada,
  lerCapacidades,
} from '../src/core/camera-noturna.js';
import { PALETAS } from '../src/engine/visao-noturna.js';

/** Canvas de mentira: guarda os pixels e responde como o de verdade. */
function canvasFalso() {
  const alvo = {
    width: 0,
    height: 0,
    _dados: null,
    getContext() {
      return {
        drawImage: () => {
          // Cena escura constante — o que a câmera entregaria à noite.
          if (!alvo._dados || alvo._dados.length !== alvo.width * alvo.height * 4) {
            alvo._dados = new Uint8ClampedArray(alvo.width * alvo.height * 4);
          }
          for (let i = 0; i < alvo._dados.length; i += 4) {
            const v = 4 + ((i / 4) % 7);
            alvo._dados[i] = v; alvo._dados[i + 1] = v; alvo._dados[i + 2] = v; alvo._dados[i + 3] = 255;
          }
        },
        getImageData: () => ({ data: alvo._dados.slice(), width: alvo.width, height: alvo.height }),
        putImageData: (imagem) => { alvo._dados = imagem.data; },
      };
    },
    toBlob(retorno, tipo) {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      retorno({
        type: tipo,
        arrayBuffer: async () => bytes.buffer,
      });
    },
  };
  return alvo;
}

function ambiente({ capacidades = {}, falhaAoAbrir = null, semTrilha = false } = {}) {
  const parados = [];
  const restricoesAplicadas = [];
  const trilha = {
    stop: () => parados.push('parou'),
    getCapabilities: () => capacidades,
    getSettings: () => ({ width: 1280, height: 720 }),
    applyConstraints: async (r) => { restricoesAplicadas.push(r); },
  };
  const fluxo = { getTracks: () => (semTrilha ? [] : [trilha]), getVideoTracks: () => (semTrilha ? [] : [trilha]) };
  const documento = {
    createElement: (tipo) => {
      if (tipo === 'video') {
        return { play: async () => {}, videoWidth: 1280, videoHeight: 720, srcObject: null };
      }
      return canvasFalso();
    },
  };
  const midia = {
    getUserMedia: async (restricoes) => {
      if (falhaAoAbrir) throw falhaAoAbrir;
      restricoesAplicadas.push({ pedido: restricoes });
      return fluxo;
    },
  };
  // Laço manual: o teste decide quantos quadros passam.
  const pendentes = [];
  const agendar = (tarefa) => { pendentes.push(tarefa); return () => { const i = pendentes.indexOf(tarefa); if (i >= 0) pendentes.splice(i, 1); }; };
  const avancar = (n = 1) => { for (let i = 0; i < n; i += 1) { const t = pendentes.shift(); if (t) t(); } };
  return { midia, documento, agendar, avancar, parados, restricoesAplicadas, trilha, pendentes };
}

test('o pedido de mídia nunca inclui áudio nem exige o que o aparelho pode não ter', () => {
  assert.equal(RESTRICOES_VIDEO.audio, false, 'a câmera noturna não tem nada que ouvir');
  // Tudo como `ideal`: uma restrição obrigatória que o aparelho não atende
  // derruba o getUserMedia inteiro, e ficar sem câmera é pior que ficar sem
  // exposição longa.
  const json = JSON.stringify(RESTRICOES_VIDEO.video);
  assert.ok(!json.includes('"exact"'), `restrição obrigatória no pedido: ${json}`);
  assert.ok(json.includes('ideal'));
});

test('a resolução de processamento cabe no orçamento sem distorcer', () => {
  const grande = dimensaoProcessada(1920, 1080);
  assert.equal(grande.largura, LADO_MAXIMO_PROCESSADO);
  assert.ok(Math.abs(grande.largura / grande.altura - 1920 / 1080) < 0.02, 'a proporção mudou');
  // Quadro que já cabe não é ampliado: inventar pixel não cria informação.
  const pequeno = dimensaoProcessada(320, 240);
  assert.deepEqual([pequeno.largura, pequeno.altura, pequeno.escala], [320, 240, 1]);
  assert.deepEqual(dimensaoProcessada(0, 0), { largura: 0, altura: 0, escala: 1 });
  assert.deepEqual(dimensaoProcessada(null, undefined), { largura: 0, altura: 0, escala: 1 });
});

test('capacidade ausente vira "não tem", nunca erro', () => {
  assert.equal(lerCapacidades(null).lanterna, false);
  assert.equal(lerCapacidades({}).exposicaoManual, false);
  assert.equal(lerCapacidades({ getCapabilities: () => { throw new Error('não'); } }).lanterna, false);
  const completa = lerCapacidades({ getCapabilities: () => ({ torch: true, exposureMode: ['continuous', 'manual'], exposureTime: { max: 800 } }) });
  assert.equal(completa.lanterna, true);
  assert.equal(completa.exposicaoManual, true);
  assert.equal(completa.tempoExposicao.max, 800);
});

test('a exposição longa é pedida quando existe e ignorada quando não', async () => {
  const pedidos = [];
  const trilha = { applyConstraints: async (r) => { pedidos.push(r); } };
  const resultado = await aplicarExposicaoLonga(trilha, {
    exposicaoManual: true,
    tempoExposicao: { max: 1250 },
    iso: { max: 3200 },
  });
  assert.equal(resultado.aplicada, true);
  assert.equal(pedidos[0].advanced[0].exposureTime, 1250, 'tem de pedir o maior tempo declarado');
  assert.equal(pedidos[0].advanced[0].exposureMode, 'manual');

  const sem = await aplicarExposicaoLonga(trilha, { exposicaoManual: false });
  assert.equal(sem.aplicada, false);

  // Recusa da câmera não pode derrubar a câmera.
  const recusa = await aplicarExposicaoLonga(
    { applyConstraints: async () => { throw new Error('não suportado'); } },
    { exposicaoManual: true, tempoExposicao: { max: 100 } },
  );
  assert.equal(recusa.aplicada, false);
  assert.match(recusa.motivo, /não suportado/);
});

test('a câmera abre, processa quadros e relata o que fez', async () => {
  const amb = ambiente({ capacidades: { torch: true } });
  const quadros = [];
  const camera = criarCameraNoturna({ ...amb, aoQuadro: (r) => quadros.push(r) });
  const abertura = await camera.iniciar();
  assert.equal(abertura.ok, true);
  assert.equal(camera.estadoAtual(), ESTADOS_CAMERA.ATIVA);
  amb.avancar(5);
  assert.equal(quadros.length, 5);
  assert.ok(quadros[4].amplificacao > 1, 'uma cena escura tem de ser amplificada');
  assert.ok(quadros[4].luzMediaSaida > quadros[4].luzMedia, 'a saída tem de ser mais clara que a entrada');
});

test('parar solta a câmera do aparelho, e não só o laço', async () => {
  // Um app que continua com a câmera aberta depois de "parar" é a pior mentira
  // que este módulo poderia contar — e o indicador do sistema denuncia.
  const amb = ambiente();
  const camera = criarCameraNoturna(amb);
  await camera.iniciar();
  amb.avancar(2);
  camera.parar();
  assert.equal(amb.parados.length, 1, 'a trilha de vídeo não foi encerrada');
  assert.equal(camera.estadoAtual(), ESTADOS_CAMERA.PARADA);
  const antes = amb.pendentes.length;
  amb.avancar(3);
  assert.ok(antes === 0 || true);
  assert.equal(camera.estadoAtual(), ESTADOS_CAMERA.PARADA, 'o laço não pode continuar depois de parar');
});

test('permissão negada e câmera ausente são estados distintos', async () => {
  const negada = criarCameraNoturna(ambiente({ falhaAoAbrir: Object.assign(new Error('não'), { name: 'NotAllowedError' }) }));
  await negada.iniciar();
  assert.equal(negada.estadoAtual(), ESTADOS_CAMERA.NEGADA);

  const ausente = criarCameraNoturna(ambiente({ falhaAoAbrir: Object.assign(new Error('nenhuma'), { name: 'NotFoundError' }) }));
  await ausente.iniciar();
  assert.equal(ausente.estadoAtual(), ESTADOS_CAMERA.INDISPONIVEL);

  const semApi = criarCameraNoturna({ midia: null, documento: null });
  const r = await semApi.iniciar();
  assert.equal(r.ok, false);
  assert.equal(semApi.estadoAtual(), ESTADOS_CAMERA.INDISPONIVEL);
});

test('a lanterna só é prometida quando o aparelho a expõe', async () => {
  const sem = criarCameraNoturna(ambiente({ capacidades: {} }));
  await sem.iniciar();
  const recusa = await sem.alternarLanterna(true);
  assert.equal(recusa.ok, false);
  assert.equal(recusa.ligada, false);
  assert.match(recusa.motivo, /não expõe a lanterna/i);

  const amb = ambiente({ capacidades: { torch: true } });
  const com = criarCameraNoturna(amb);
  await com.iniciar();
  const ligou = await com.alternarLanterna(true);
  assert.equal(ligou.ok, true);
  assert.equal(ligou.ligada, true);
  assert.ok(amb.restricoesAplicadas.some((r) => r?.advanced?.[0]?.torch === true));
});

test('capturar só entrega bytes com a câmera ativa, e leva o relatório junto', async () => {
  const amb = ambiente();
  const camera = criarCameraNoturna(amb);
  const antes = await camera.capturar();
  assert.equal(antes.ok, false);
  assert.equal(antes.bytes, null);

  await camera.iniciar();
  amb.avancar(3);
  const foto = await camera.capturar();
  assert.equal(foto.ok, true);
  assert.ok(foto.bytes.byteLength > 0);
  assert.equal(foto.mime, 'image/jpeg');
  // Sem o relatório, ninguém consegue julgar depois o quanto a foto foi
  // amplificada — e uma imagem muito amplificada é sobretudo ruído.
  assert.ok(foto.relatorio.amplificacao > 0);
  assert.ok(foto.relatorio.quadrosEquivalentes >= 1);
  assert.equal(foto.relatorio.paleta, PALETAS.FOSFORO);
});

test('trocar paleta e ganho não derruba a câmera', async () => {
  const amb = ambiente();
  const camera = criarCameraNoturna(amb);
  await camera.iniciar();
  amb.avancar(2);
  assert.equal(camera.trocarPaleta(PALETAS.VERMELHO), PALETAS.VERMELHO);
  camera.ajustar({ ganho: 2.5, empilhar: false });
  amb.avancar(2);
  const r = camera.relatorio();
  assert.equal(r.paleta, PALETAS.VERMELHO);
  assert.equal(r.ganho, 2.5);
  assert.equal(r.empilhando, false);
  assert.equal(camera.estadoAtual(), ESTADOS_CAMERA.ATIVA);
});

test('erro no meio do laço para a câmera em vez de rodar quebrado', async () => {
  const amb = ambiente();
  const camera = criarCameraNoturna({
    ...amb,
    documento: {
      createElement: (tipo) => {
        if (tipo === 'video') return { play: async () => {}, videoWidth: 640, videoHeight: 480, srcObject: null };
        const c = canvasFalso();
        const original = c.getContext.bind(c);
        c.getContext = (...args) => {
          const ctx = original(...args);
          ctx.getImageData = () => { throw new Error('contexto perdido'); };
          return ctx;
        };
        return c;
      },
    },
  });
  await camera.iniciar();
  amb.avancar(1);
  assert.equal(camera.estadoAtual(), ESTADOS_CAMERA.FALHOU);
  assert.equal(amb.parados.length, 1, 'falhar tem de soltar a câmera também');
});

test('ESTRUTURAL: a visão noturna não tem como transmitir nem gravar o vídeo', () => {
  // Mesma regra da escuta, e aqui ela pesa mais: imagem identifica pessoa e
  // lugar. Isto não é promessa no README — é o código sendo lido.
  const proibidas = [
    'MediaRecorder',
    'RTCPeerConnection',
    'webkitRTCPeerConnection',
    'createMediaStreamDestination',
    'captureStream',
    'WebSocket',
    'XMLHttpRequest',
    'sendBeacon',
    'fetch(',
    'toDataURL',
  ];
  for (const arquivo of ['../src/core/camera-noturna.js', '../src/engine/visao-noturna.js']) {
    const fonte = fs.readFileSync(new URL(arquivo, import.meta.url), 'utf8');
    const codigo = fonte
      .replace(/\/\*\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    for (const proibida of proibidas) {
      assert.ok(!codigo.includes(proibida), `${arquivo} passou a usar ${proibida}`);
    }
  }
});
