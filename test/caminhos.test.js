import test from 'node:test';
import assert from 'node:assert/strict';

import { CAMINHOS, TIPOS_CAMINHO, caminhoPorId, avisoDoCaminho } from '../src/data/caminhos.js';
import { planejarCorredor, comprimentoDaRota, formatarBytes } from '../src/core/mapa-regiao.js';

const anjos = caminhoPorId('caminhos-dos-anjos');

test('todo ponto de todo caminho traz identificador OSM — procedência, não memória', () => {
  // Coordenada sem procedência é chute com aparência de dado. É a mesma regra
  // dos coeficientes do WMM e do tamanho de tile medido.
  for (const caminho of CAMINHOS) {
    assert.ok(caminho.procedencia?.coordenadas, `${caminho.id} sem fonte de coordenada`);
    assert.match(caminho.procedencia.geocodificadoEm, /^\d{4}-\d{2}-\d{2}$/);
    for (const p of caminho.pontos) {
      assert.match(p.osm, /^(node|way|relation)\/\d+$/, `${caminho.id}/${p.nome} sem OSM id`);
      assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lon));
      assert.ok(p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180);
    }
  }
});

test('o caminho se declara SEQUÊNCIA DE MUNICÍPIOS, não traçado', () => {
  assert.equal(anjos.tipo, TIPOS_CAMINHO.SEQUENCIA_DE_MUNICIPIOS);
  const aviso = avisoDoCaminho(anjos);
  assert.match(aviso, /RETA/);
  assert.match(aviso, /não o traçado/i);
  assert.match(aviso, /GPX/);
});

test('a reta é MENOR que a trilha divulgada, e a diferença é a sinuosidade', () => {
  // Se um dia a reta passar a medir o mesmo que a trilha, ou mais, algum ponto
  // entrou errado — e o corredor deixaria de conter o caminho real.
  const reta = comprimentoDaRota(anjos.pontos);
  assert.ok(reta > 70 && reta < 95, `${reta.toFixed(1)} km`);
  assert.ok(reta < anjos.comprimentoDivulgadoKm, `reta ${reta.toFixed(1)} ≥ trilha ${anjos.comprimentoDivulgadoKm}`);
  const sinuosidade = anjos.comprimentoDivulgadoKm - reta;
  assert.ok(sinuosidade > 15, `só ${sinuosidade.toFixed(0)} km de folga`);
  // A largura sugerida tem de cobrir a sinuosidade com margem.
  assert.ok(anjos.raioSugeridoKm * 2 >= sinuosidade * 0.8, 'corredor estreito demais para conter a trilha');
});

test('os municípios estão em ordem, de Londrina a Bandeirantes', () => {
  // Fora de ordem, a polilinha faria ziguezague e o corredor cobriria o dobro
  // de área — e ainda por cima na direção errada.
  const lons = anjos.pontos.map((p) => p.lon);
  for (let i = 1; i < lons.length; i += 1) {
    assert.ok(lons[i] > lons[i - 1], `${anjos.pontos[i].nome} não segue para leste`);
  }
  assert.match(anjos.pontos[0].nome, /Londrina/);
  assert.match(anjos.pontos.at(-1).nome, /Bandeirantes/);
});

test('o corredor sugerido cabe num pacote, com detalhe útil a pé', () => {
  const base = { tiles: ['https://a/{z}/{x}/{y}.png', 'https://b/{z}/{x}/{y}.png'], maxzoom: 19 };
  const plano = planejarCorredor({ pontos: anjos.pontos, raioKm: anjos.raioSugeridoKm, zoomMaximo: 15, base });
  assert.equal(plano.cabe, true, `não coube: ${formatarBytes(plano.bytesEstimados)}`);
  assert.ok(plano.bytesEstimados < 250 * 1024 * 1024, formatarBytes(plano.bytesEstimados));
  // z15 é onde estrada rural e ferrovia já aparecem legíveis.
  assert.ok(plano.porZoom.some((z) => z.zoom === 15 && z.tiles > 0));
});

test('id desconhecido devolve null, e o aviso não explode', () => {
  assert.equal(caminhoPorId('não-existe'), null);
  assert.equal(avisoDoCaminho(null), '');
});
