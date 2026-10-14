import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES_PASSOS,
  calibrarPassada,
  criarContadorDePassos,
  distanciaPorPassos,
} from '../src/engine/passos.js';

const G = 9.81;

/**
 * Caminhada sintética: gravidade constante mais uma oscilação periódica no
 * eixo vertical, que é a assinatura do corpo subindo e descendo a cada passada.
 * `amplitude` em m/s², `cadenciaPpm` em passos por minuto.
 */
function caminhada({ passos, cadenciaPpm = 110, amplitude = 2.2, hz = 50, ruido = 0 }) {
  const periodoMs = 60_000 / cadenciaPpm;
  const duracaoMs = passos * periodoMs;
  const amostras = [];
  let semente = 11;
  const tremor = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return (semente / 2147483648 - 0.5) * ruido; };
  for (let t = 0; t <= duracaoMs; t += 1000 / hz) {
    const fase = (2 * Math.PI * t) / periodoMs;
    amostras.push({ instante: t, x: tremor(), y: tremor(), z: G + amplitude * Math.sin(fase) + tremor() });
  }
  return amostras;
}

function contar(amostras, opcoes) {
  const contador = criarContadorDePassos(opcoes);
  for (const amostra of amostras) contador.observar(amostra);
  return contador;
}

test('uma caminhada periódica é contada com erro pequeno', () => {
  // Propriedade estrutural: um sinal com N ciclos tem de produzir ~N passos.
  // O número não vem de memória — vem da própria construção do sinal.
  const contador = contar(caminhada({ passos: 100 }));
  assert.ok(Math.abs(contador.passos() - 100) <= 3, `contou ${contador.passos()} de 100`);
});

test('a contagem acompanha a cadência, não o tempo', () => {
  const devagar = contar(caminhada({ passos: 60, cadenciaPpm: 70 }));
  const rapido = contar(caminhada({ passos: 60, cadenciaPpm: 150 }));
  assert.ok(Math.abs(devagar.passos() - 60) <= 3, `devagar: ${devagar.passos()}`);
  assert.ok(Math.abs(rapido.passos() - 60) <= 3, `rápido: ${rapido.passos()}`);
  assert.ok(rapido.cadenciaPpm() > devagar.cadenciaPpm());
});

test('aparelho parado não conta passo, por mais tempo que fique parado', () => {
  const parado = Array.from({ length: 3000 }, (_, i) => ({ instante: i * 20, x: 0.02, y: -0.01, z: G + 0.03 }));
  assert.equal(contar(parado).passos(), 0);
});

test('tremor de veículo não vira caminhada', () => {
  // Vibração de motor: amplitude parecida, mas frequência muito acima da
  // cadência humana. A janela de cadência é o que separa os dois.
  const vibracao = [];
  for (let t = 0; t <= 30_000; t += 5) {
    vibracao.push({ instante: t, x: 0, y: 0, z: G + 2.5 * Math.sin((2 * Math.PI * t) / 40) });
  }
  const contador = contar(vibracao);
  // 30 s de vibração a 25 Hz seriam 750 "passos" sem a janela de cadência.
  assert.ok(contador.passos() < 130, `vibração virou ${contador.passos()} passos`);
});

test('a contagem sobrevive a ruído no sinal', () => {
  const contador = contar(caminhada({ passos: 80, ruido: 0.6 }));
  assert.ok(Math.abs(contador.passos() - 80) <= 6, `contou ${contador.passos()} de 80`);
});

test('leitura inválida é recusada em vez de virar passo', () => {
  const contador = criarContadorDePassos();
  assert.equal(contador.observar({}).motivo, 'LEITURA_INVALIDA');
  assert.equal(contador.observar({ instante: 0, x: NaN, y: 0, z: G }).motivo, 'LEITURA_INVALIDA');
  assert.equal(contador.passos(), 0);
});

test('reiniciar zera a contagem e o estado do detector', () => {
  const contador = contar(caminhada({ passos: 30 }));
  assert.ok(contador.passos() > 0);
  contador.reiniciar();
  assert.equal(contador.passos(), 0);
  assert.equal(contador.cadenciaPpm(), null);
});

test('a passada só é calibrada quando o resultado é humanamente possível', () => {
  // 700 m em 1000 passos = 0,70 m: passada de adulto, aceita.
  const boa = calibrarPassada({ distanciaM: 700, passos: 1000 });
  assert.equal(boa.aceita, true);
  assert.ok(Math.abs(boa.passadaM - 0.7) < 1e-9);

  // 2000 m em 1000 passos = 2 m por passo: foi deriva de GPS, não caminhada.
  const deriva = calibrarPassada({ distanciaM: 2000, passos: 1000 });
  assert.equal(deriva.aceita, false);
  assert.equal(deriva.motivo, 'FORA_DA_FAIXA_HUMANA');

  // Amostra curta demais não calibra nada.
  assert.equal(calibrarPassada({ distanciaM: 5, passos: 7 }).aceita, false);
  assert.equal(calibrarPassada({}).aceita, false);
});

test('a distância por passos declara se a passada foi calibrada ou é estimativa', () => {
  const estimada = distanciaPorPassos({ passos: 1000 });
  assert.equal(estimada.calibrada, false);
  assert.equal(estimada.passadaUsadaM, LIMITES_PASSOS.passadaPadraoM);
  assert.ok(Math.abs(estimada.distanciaM - 1000 * LIMITES_PASSOS.passadaPadraoM) < 1e-9);

  const medida = distanciaPorPassos({ passos: 1000, passadaM: 0.8 });
  assert.equal(medida.calibrada, true);
  assert.ok(Math.abs(medida.distanciaM - 800) < 1e-9);

  // Passada impossível não é aceita nem em silêncio: cai para o padrão e diz.
  const absurda = distanciaPorPassos({ passos: 100, passadaM: 5 });
  assert.equal(absurda.calibrada, false);
  assert.equal(absurda.passadaUsadaM, LIMITES_PASSOS.passadaPadraoM);
});
