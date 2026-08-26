import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizarAlertaOficial, prepararMensagemExterna, validarLeituraRadiacao } from '../src/core/equipamentos.js';

test('validarLeituraRadiacao aceita leitura externa identificada e rejeita valor inválido', () => {
  const leitura = validarLeituraRadiacao({
    valor: 0.14,
    unidade: 'µSv/h',
    timestamp: '2026-08-26T12:00:00Z',
    dispositivo: 'dosímetro-demo',
    confianca: 'alta',
  });
  assert.equal(leitura.valor, 0.14);
  assert.equal(leitura.confianca, 'alta');
  assert.equal(validarLeituraRadiacao({ valor: -1, unidade: 'µSv/h', timestamp: 'x', dispositivo: 'x' }), null);
  assert.equal(validarLeituraRadiacao({ valor: 1, unidade: 'unidade-inventada', timestamp: 'x', dispositivo: 'x' }), null);
});

test('prepararMensagemExterna nunca cria SOS sem uma posição válida', () => {
  assert.equal(prepararMensagemExterna({ posicao: null }), null);
  const mensagem = prepararMensagemExterna({ posicao: { lat: -22.9, lon: -43.2, accuracy: 9 }, tipo: 'sos' });
  assert.equal(mensagem.tipo, 'sos');
  assert.equal(mensagem.estado, 'preparada');
  assert.equal(mensagem.confirmadoPor, null);
});

test('normalizarAlertaOficial exige fonte, título e data publicada', () => {
  const alerta = normalizarAlertaOficial({
    id: 'a-1',
    tipo: 'desastre',
    titulo: 'Área interditada',
    fonte: 'Defesa Civil',
    severidade: 'perigo',
    publicadoEm: '2026-08-26T12:00:00Z',
    url: 'https://example.org/alerta',
  });
  assert.equal(alerta.severidade, 'perigo');
  assert.equal(alerta.fonte, 'Defesa Civil');
  assert.equal(normalizarAlertaOficial({ titulo: 'sem fonte', publicadoEm: '2026-08-26T12:00:00Z' }), null);
});
