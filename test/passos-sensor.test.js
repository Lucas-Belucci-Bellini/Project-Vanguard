import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTADOS_PASSOS, criarSensorDePassos } from '../src/core/passos-sensor.js';

const G = 9.81;

/** Janela falsa com `devicemotion` — sem DOM de verdade, como o resto da suíte. */
function fabricarJanela({ comPermissao = null } = {}) {
  const ouvintes = new Map();
  const janela = {
    DeviceMotionEvent: comPermissao === null ? function () {} : Object.assign(function () {}, {
      requestPermission: async () => comPermissao,
    }),
    addEventListener: (nome, fn) => { ouvintes.set(nome, fn); },
    removeEventListener: (nome) => { ouvintes.delete(nome); },
  };
  const emitir = (evento) => ouvintes.get('devicemotion')?.(evento);
  return { janela, emitir, ouvintes };
}

function armazenamentoFalso(inicial = null) {
  let guardado = inicial;
  return { get: () => guardado, set: (_chave, valor) => { guardado = valor; }, lido: () => guardado };
}

/** Emite uma caminhada periódica na janela falsa. */
function andar(emitir, { passos, cadenciaPpm = 110, amplitude = 2.2, hz = 50, inicio = 0 }) {
  const periodoMs = 60_000 / cadenciaPpm;
  for (let t = inicio; t <= inicio + passos * periodoMs; t += 1000 / hz) {
    emitir({
      timeStamp: t,
      accelerationIncludingGravity: { x: 0, y: 0, z: G + amplitude * Math.sin((2 * Math.PI * t) / periodoMs) },
    });
  }
}

test('sem DeviceMotionEvent o sensor diz INDISPONIVEL em vez de fingir contar', async () => {
  const sensor = criarSensorDePassos({ janela: { addEventListener() {} }, armazenamento: armazenamentoFalso() });
  assert.equal(await sensor.iniciar(), ESTADOS_PASSOS.INDISPONIVEL);
});

test('permissão negada no iOS não vira contagem silenciosa', async () => {
  const { janela } = fabricarJanela({ comPermissao: 'denied' });
  const sensor = criarSensorDePassos({ janela, armazenamento: armazenamentoFalso() });
  assert.equal(await sensor.iniciar(), ESTADOS_PASSOS.NEGADO);
  assert.equal(sensor.resumo().passos, 0);
});

test('andar com o app em segundo plano continua contando passos', async () => {
  const { janela, emitir } = fabricarJanela();
  const atualizacoes = [];
  const sensor = criarSensorDePassos({ janela, armazenamento: armazenamentoFalso(), aoAtualizar: (r) => atualizacoes.push(r) });
  assert.equal(await sensor.iniciar(), ESTADOS_PASSOS.CONTANDO);
  andar(emitir, { passos: 100 });
  const resumo = sensor.resumo();
  assert.ok(Math.abs(resumo.passos - 100) <= 4, `contou ${resumo.passos}`);
  assert.ok(atualizacoes.length > 0, 'a tela precisa ser avisada a cada passo');
  // Sem calibração, a distância existe mas é declarada estimativa.
  assert.equal(resumo.calibrada, false);
  assert.ok(resumo.distanciaM > 0);
});

test('parar solta o ouvinte do acelerômetro', async () => {
  const { janela, emitir, ouvintes } = fabricarJanela();
  const sensor = criarSensorDePassos({ janela, armazenamento: armazenamentoFalso() });
  await sensor.iniciar();
  assert.equal(ouvintes.size, 1);
  sensor.parar();
  assert.equal(ouvintes.size, 0);
  const antes = sensor.resumo().passos;
  andar(emitir, { passos: 50 });
  assert.equal(sensor.resumo().passos, antes, 'depois de parar não pode contar mais nada');
});

test('a passada é calibrada contra um trecho de GPS bom e passa a ser usada', async () => {
  const { janela, emitir } = fabricarJanela();
  const guardado = armazenamentoFalso();
  const sensor = criarSensorDePassos({ janela, armazenamento: guardado });
  await sensor.iniciar();

  sensor.observarGps({ accuracy: 6 }, 0);          // âncora do trecho
  andar(emitir, { passos: 150 });                   // ~150 passos
  const passosAgora = sensor.resumo().passos;
  // 150 passos em 120 m dá 0,80 m por passo — dentro da faixa humana.
  const resultado = sensor.observarGps({ accuracy: 6 }, passosAgora * 0.8);
  assert.equal(resultado.aceita, true);
  assert.ok(Math.abs(resultado.passadaM - 0.8) < 0.02, `passada ${resultado.passadaM}`);
  assert.equal(sensor.resumo().calibrada, true);
  assert.ok(Math.abs(guardado.lido().passadaM - 0.8) < 0.02, 'a calibração tem de sobreviver ao app fechar');
});

test('trecho com GPS ruim não calibra — deriva viraria passada de dois metros', async () => {
  const { janela, emitir } = fabricarJanela();
  const sensor = criarSensorDePassos({ janela, armazenamento: armazenamentoFalso() });
  await sensor.iniciar();
  sensor.observarGps({ accuracy: 6 }, 0);
  andar(emitir, { passos: 150 });
  // Mesmo trecho, mas o fixo chegou com ±80 m: a âncora é descartada.
  assert.equal(sensor.observarGps({ accuracy: 80 }, 500), null);
  assert.equal(sensor.resumo().calibrada, false);
});

test('passada guardada é recuperada ao abrir o app', () => {
  const sensor = criarSensorDePassos({
    janela: fabricarJanela().janela,
    armazenamento: armazenamentoFalso({ passadaM: 0.85 }),
  });
  const resumo = sensor.resumo();
  assert.equal(resumo.calibrada, true);
  assert.ok(Math.abs(resumo.passadaUsadaM - 0.85) < 1e-9);
});

test('passada guardada absurda é ignorada em vez de estragar a contagem', () => {
  const sensor = criarSensorDePassos({
    janela: fabricarJanela().janela,
    armazenamento: armazenamentoFalso({ passadaM: 7 }),
  });
  assert.equal(sensor.resumo().calibrada, false);
});
