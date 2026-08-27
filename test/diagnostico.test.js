import test from 'node:test';
import assert from 'node:assert/strict';
import {
  desempenhoResumo,
  diagnosticoResumo,
  formatarBateria,
  formatarMilissegundos,
  formatarBytes,
  statusPosicao,
  statusRede,
  statusServiceWorker,
} from '../src/core/diagnostico.js';

test('formatarBytes cobre valores pequenos, KiB, MiB e inválidos', () => {
  assert.equal(formatarBytes(12), '12 B');
  assert.equal(formatarBytes(2048), '2.0 KiB');
  assert.equal(formatarBytes(2 * 1024 ** 2), '2.0 MiB');
  assert.equal(formatarBytes(Number.NaN), 'INDISPONÍVEL');
});

test('formatarMilissegundos rejeita valores ausentes ou negativos', () => {
  assert.equal(formatarMilissegundos(1234.6), '1235 ms');
  assert.equal(formatarMilissegundos(0), '0 ms');
  assert.equal(formatarMilissegundos(-1), 'INDISPONÍVEL');
  assert.equal(formatarMilissegundos(Number.NaN), 'INDISPONÍVEL');
});

test('desempenhoResumo expõe Navigation Timing e memória somente quando disponíveis', () => {
  const resumo = desempenhoResumo({
    getEntriesByType: () => ({ 0: { domContentLoadedEventEnd: 1234.6, loadEventEnd: 2345.4 }, length: 1 }),
    memory: { usedJSHeapSize: 2 * 1024 ** 2, jsHeapSizeLimit: 64 * 1024 ** 2 },
  });
  assert.deepEqual(resumo, {
    navegacao: '1235 ms',
    carga: '2345 ms',
    memoria: '2.0 MiB usados · 64.0 MiB limite reportado',
    fonte: 'NAVIGATION TIMING',
  });
  assert.deepEqual(desempenhoResumo({ getEntriesByType: () => [] }), {
    navegacao: 'INDISPONÍVEL',
    carga: 'INDISPONÍVEL',
    memoria: 'INDISPONÍVEL',
    fonte: 'INDISPONÍVEL',
  });
  assert.equal(desempenhoResumo({ getEntriesByType: () => { throw new Error('indisponível'); } }).fonte, 'INDISPONÍVEL');
});

test('formatarBateria não inventa nível quando a API não existe', () => {
  assert.equal(formatarBateria(null), 'INDISPONÍVEL');
  assert.equal(formatarBateria({ level: 0.753, charging: true }), '75% · carregando');
  assert.equal(formatarBateria({ level: 2, charging: false }), 'INDISPONÍVEL · não carregando');
});

test('statusPosicao diferencia indisponível, idade desconhecida, recente e antigo', () => {
  const agora = 1_700_000_000_000;
  assert.equal(statusPosicao(null, agora).estado, 'UNAVAILABLE');
  assert.equal(statusPosicao({ latitude: -23, longitude: -51, timestamp: 'x' }, agora).estado, 'STALE');
  assert.equal(statusPosicao({ latitude: -23, longitude: -51, timestamp: agora - 20_000 }, agora).estado, 'AVAILABLE');
  assert.equal(statusPosicao({ latitude: -23, longitude: -51, timestamp: agora - 5 * 60_000 }, agora).estado, 'STALE');
});

test('statusRede e statusServiceWorker mantêm estados explícitos', () => {
  assert.equal(statusRede(true), 'ONLINE');
  assert.equal(statusRede(false), 'OFFLINE');
  assert.equal(statusRede(undefined), 'INDISPONÍVEL');
  assert.equal(statusServiceWorker({ controller: true }), 'ATIVO');
  assert.equal(statusServiceWorker({ controller: true, waiting: true }), 'ATUALIZAÇÃO AGUARDANDO');
});

test('diagnosticoResumo expõe grupos locais sem telemetria', () => {
  const itens = diagnosticoResumo({
    versao: '1.0.0',
    plataforma: 'Android',
    rede: false,
    posicao: { latitude: -23, longitude: -51, timestamp: 1_699_999_999_000 },
    serviceWorker: { controller: false, waiting: false },
    armazenamento: 'localStorage disponível',
    bateria: null,
    bussola: 'INDISPONÍVEL',
  });
  assert.equal(itens.length, 9);
  assert.equal(itens.find((item) => item.nome === 'Rede').valor, 'OFFLINE');
  assert.equal(itens.find((item) => item.nome === 'Bateria').valor, 'INDISPONÍVEL');
});
