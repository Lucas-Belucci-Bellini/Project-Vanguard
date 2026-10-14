import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTADOS_AVISO, ID_NOTIFICACAO, criarAvisoDaJornada, textoDoAviso } from '../src/core/notificacao-jornada.js';

const G = 111195;

function trilhaDeHoje(agora, { metros = 1000, horas = 1, pontos = 11 } = {}) {
  const inicio = agora - horas * 3_600_000;
  return Array.from({ length: pontos }, (_, i) => ({
    lat: (i * (metros / (pontos - 1))) / G,
    lon: 0,
    accuracy: 5,
    timestamp: inicio + (i * horas * 3_600_000) / (pontos - 1),
  }));
}

function pluginFalso({ permissao = 'granted', falhar = false } = {}) {
  const publicadas = [];
  const canceladas = [];
  return {
    publicadas,
    canceladas,
    requestPermissions: async () => ({ display: permissao }),
    schedule: async (opcoes) => {
      if (falhar) throw new Error('sem espaço na bandeja');
      publicadas.push(opcoes.notifications[0]);
    },
    cancel: async (opcoes) => { canceladas.push(...opcoes.notifications.map((n) => n.id)); },
  };
}

const nativo = { isNativePlatform: () => true };

test('o texto do aviso traz distância, tempo e diz se a caminhada parou', () => {
  const andando = textoDoAviso({ distanciaM: 12345, duracaoLabel: '3h 20min', ganhoElevacaoM: 240, emMovimento: true });
  assert.match(andando.titulo, /em marcha/);
  assert.match(andando.corpo, /12\.35 km hoje/);
  assert.match(andando.corpo, /3h 20min/);
  assert.match(andando.corpo, /\+240 m de subida/);

  // Parado precisa dizer que parou: número subindo com a pessoa sentada há uma
  // hora induz a erro sobre o próprio esforço do dia.
  const parado = textoDoAviso({ distanciaM: 800, duracaoLabel: '25min', ganhoElevacaoM: 0, emMovimento: false });
  assert.match(parado.titulo, /parado/);
  assert.match(parado.corpo, /800 m hoje/);
  assert.doesNotMatch(parado.corpo, /subida/, 'ganho irrelevante não polui o texto');
});

test('passo sem calibração é declarado estimativa no próprio texto', () => {
  const estimado = textoDoAviso({ distanciaM: 100, duracaoLabel: '5min', emMovimento: true }, { passos: 900 });
  assert.match(estimado.corpo, /900 passos \(estimativa\)/);
  const medido = textoDoAviso({ distanciaM: 100, duracaoLabel: '5min', emMovimento: true }, { passos: 900, passosCalibrados: true });
  assert.match(medido.corpo, /900 passos/);
  assert.doesNotMatch(medido.corpo, /estimativa/);
});

test('fora de plataforma nativa o aviso se declara indisponível', async () => {
  const aviso = criarAvisoDaJornada({ plugin: pluginFalso(), capacitorApi: { isNativePlatform: () => false } });
  assert.equal(await aviso.iniciar(), ESTADOS_AVISO.INDISPONIVEL);
  assert.equal((await aviso.atualizar([])).publicado, false);
});

test('permissão de notificação negada não vira publicação no vazio', async () => {
  const aviso = criarAvisoDaJornada({ plugin: pluginFalso({ permissao: 'denied' }), capacitorApi: nativo });
  assert.equal(await aviso.iniciar(), ESTADOS_AVISO.NEGADO);
});

test('o aviso publica com id fixo, para o Android substituir em vez de empilhar', async () => {
  const plug = pluginFalso();
  const agora = new Date('2026-09-01T12:00:00').getTime();
  const aviso = criarAvisoDaJornada({ plugin: plug, capacitorApi: nativo, agora: () => agora });
  await aviso.iniciar();
  const r = await aviso.atualizar(trilhaDeHoje(agora));
  assert.equal(r.publicado, true);
  assert.equal(plug.publicadas[0].id, ID_NOTIFICACAO);
  assert.equal(plug.publicadas[0].ongoing, true, 'precisa ser persistente para ficar na tela bloqueada');
  assert.equal(plug.publicadas[0].silent, true, 'não pode tocar a cada atualização');
  assert.match(plug.publicadas[0].body, /1\.00 km hoje/);
});

test('texto igual dentro do intervalo não reescreve a notificação', async () => {
  const plug = pluginFalso();
  let relogio = new Date('2026-09-01T12:00:00').getTime();
  const aviso = criarAvisoDaJornada({ plugin: plug, capacitorApi: nativo, agora: () => relogio });
  await aviso.iniciar();
  const trilha = trilhaDeHoje(relogio);
  await aviso.atualizar(trilha);
  assert.equal(plug.publicadas.length, 1);

  relogio += 5_000;                       // 5 s depois, nada mudou
  const repetido = await aviso.atualizar(trilha);
  assert.equal(repetido.publicado, false);
  assert.equal(repetido.motivo, 'SEM_MUDANCA');
  assert.equal(plug.publicadas.length, 1, 'piscar a notificação a cada fixo gasta bateria à toa');
});

test('falha do plugin é reportada em vez de fingir que publicou', async () => {
  const agora = Date.now();
  const aviso = criarAvisoDaJornada({ plugin: pluginFalso({ falhar: true }), capacitorApi: nativo, agora: () => agora });
  await aviso.iniciar();
  const r = await aviso.atualizar(trilhaDeHoje(agora));
  assert.equal(r.publicado, false);
  assert.equal(r.motivo, 'FALHOU');
});

test('encerrar remove o aviso da bandeja', async () => {
  const plug = pluginFalso();
  const agora = Date.now();
  const aviso = criarAvisoDaJornada({ plugin: plug, capacitorApi: nativo, agora: () => agora });
  await aviso.iniciar();
  await aviso.atualizar(trilhaDeHoje(agora));
  await aviso.encerrar();
  assert.deepEqual(plug.canceladas, [ID_NOTIFICACAO]);
  assert.equal(aviso.estado(), ESTADOS_AVISO.PARADO);
});
