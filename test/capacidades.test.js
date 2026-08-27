import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarCapacidades, estadoCapacidade, ESTADOS_CAPACIDADE } from '../src/core/capacidades.js';

test('estadoCapacidade diferencia suporte, disponibilidade e permissão', () => {
  assert.equal(estadoCapacidade(), ESTADOS_CAPACIDADE.NOT_SUPPORTED);
  assert.equal(estadoCapacidade({ supported: true }), ESTADOS_CAPACIDADE.UNAVAILABLE);
  assert.equal(estadoCapacidade({ supported: true, denied: true, available: true }), ESTADOS_CAPACIDADE.DENIED);
  assert.equal(estadoCapacidade({ supported: true, available: true }), ESTADOS_CAPACIDADE.AVAILABLE);
});

test('detectarCapacidades preserva estados observáveis do ambiente', () => {
  const capacidades = detectarCapacidades({
    navigatorApi: {
      geolocation: {},
      onLine: false,
      getBattery: () => Promise.resolve(),
      share: () => Promise.resolve(),
    },
    capacitorApi: { isNativePlatform: () => false },
    storageApi: { getItem: () => null },
    orientationApi: {},
    gpsPermission: 'NEGADA',
  });
  assert.deepEqual(Object.fromEntries(capacidades.map(({ id, estado }) => [id, estado])), {
    gps: 'DENIED',
    compass: 'AVAILABLE',
    storage: 'AVAILABLE',
    network: 'UNAVAILABLE',
    battery: 'AVAILABLE',
    share: 'AVAILABLE',
  });
  assert.match(capacidades.find((item) => item.id === 'gps').detalhe, /permissão e sinal/);
  assert.match(capacidades.find((item) => item.id === 'share').detalhe, /ação exige confirmação/);
});

test('detectarCapacidades não inventa APIs ausentes', () => {
  const capacidades = detectarCapacidades({
    navigatorApi: {},
    capacitorApi: { isNativePlatform: () => false },
    storageApi: null,
    orientationApi: undefined,
  });
  assert.deepEqual(capacidades.map(({ estado }) => estado), [
    'NOT_SUPPORTED',
    'NOT_SUPPORTED',
    'NOT_SUPPORTED',
    'NOT_SUPPORTED',
    'NOT_SUPPORTED',
    'NOT_SUPPORTED',
  ]);
});

test('detectarCapacidades tolera bridge Capacitor que falha ao detectar plataforma', () => {
  const capacidades = detectarCapacidades({
    navigatorApi: {},
    capacitorApi: { isNativePlatform: () => { throw new Error('bridge indisponível'); } },
    storageApi: null,
    orientationApi: undefined,
  });
  assert.equal(capacidades.find((item) => item.id === 'gps').estado, 'NOT_SUPPORTED');
});
