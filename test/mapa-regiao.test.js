import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BYTES_POR_TILE, PROCEDENCIA_BYTES_POR_TILE, TETO_TILES_REGIAO, MOTIVOS_REGIAO,
  boundsDoRaio, contarTiles, custoDoPlaneta, planejarRegiao, formatarBytes,
} from '../src/core/mapa-regiao.js';

const OSM = { tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], maxzoom: 19 };
const SP = { lat: -23.55, lon: -46.63 };
const plano = (opcoes) => planejarRegiao({ centro: SP, base: OSM, ...opcoes });

test('a estimativa de bytes por tile traz a procedência junto', () => {
  // Estimativa sem procedência é chute com aparência de dado. Se um dia o
  // número mudar, a origem tem de mudar junto.
  assert.equal(BYTES_POR_TILE, PROCEDENCIA_BYTES_POR_TILE.mediaBytes);
  assert.ok(PROCEDENCIA_BYTES_POR_TILE.amostra >= 10);
  assert.ok(PROCEDENCIA_BYTES_POR_TILE.fonte.includes('openstreetmap'));
  assert.match(PROCEDENCIA_BYTES_POR_TILE.medidoEm, /^\d{4}-\d{2}-\d{2}$/);
});

test('a caixa do raio encolhe em longitude conforme sobe a latitude', () => {
  // Um grau de longitude vale 111 km no equador e ~55 km a 60°. Ignorar o
  // cosseno faria a caixa ficar larga demais longe do equador, e o pacote
  // dobrar de tamanho sem ninguém entender por quê.
  const equador = boundsDoRaio({ lat: 0, lon: 0, raioKm: 100 });
  const norte = boundsDoRaio({ lat: 60, lon: 0, raioKm: 100 });
  const larguraEquador = equador.leste - equador.oeste;
  const larguraNorte = norte.leste - norte.oeste;
  assert.ok(larguraNorte > larguraEquador * 1.8, `${larguraNorte} vs ${larguraEquador}`);
  // A altura NÃO muda com a latitude: um grau de latitude é sempre ~111 km.
  assert.ok(Math.abs((equador.norte - equador.sul) - (norte.norte - norte.sul)) < 1e-9);
});

test('a caixa nunca sai da faixa que o Mercator projeta', () => {
  const polo = boundsDoRaio({ lat: 89.9, lon: 0, raioKm: 500 });
  assert.ok(polo.norte <= 85.0511);
  assert.ok(polo.sul >= -85.0511);
  assert.ok(Number.isFinite(polo.leste) && Number.isFinite(polo.oeste));
});

test('centro e raio inválidos têm motivos DIFERENTES', () => {
  // Três problemas com três respostas diferentes para quem está usando: lista
  // vazia sem motivo obriga a interface a adivinhar qual dos três aconteceu.
  assert.equal(planejarRegiao({ centro: null, base: OSM }).motivo, MOTIVOS_REGIAO.CENTRO_INVALIDO);
  assert.equal(planejarRegiao({ centro: { lat: 'x', lon: 'y' }, base: OSM }).motivo, MOTIVOS_REGIAO.CENTRO_INVALIDO);
  assert.equal(plano({ raioKm: 0 }).motivo, MOTIVOS_REGIAO.RAIO_INVALIDO);
  assert.equal(plano({ raioKm: -5 }).motivo, MOTIVOS_REGIAO.RAIO_INVALIDO);
  assert.equal(planejarRegiao({ centro: SP, base: {} }).motivo, MOTIVOS_REGIAO.SEM_FONTE);
});

test('região que cabe devolve URLs, e a contagem bate com as URLs geradas', () => {
  const p = plano({ raioKm: 5 });
  assert.equal(p.cabe, true);
  assert.equal(p.motivo, MOTIVOS_REGIAO.OK);
  assert.equal(p.urls.length, p.tiles, 'contagem prometida e URLs entregues divergiram');
  assert.equal(p.bytesEstimados, p.tiles * BYTES_POR_TILE);
  assert.ok(p.urls.every((u) => /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/.test(u)));
});

test('região grande demais é RECUSADA e sugere um raio que caberia', () => {
  const p = plano({ raioKm: 200 });
  assert.equal(p.cabe, false);
  assert.equal(p.motivo, MOTIVOS_REGIAO.GRANDE_DEMAIS);
  assert.equal(p.urls.length, 0, 'não gera milhões de strings só para recusar');
  assert.ok(p.tiles > TETO_TILES_REGIAO, 'mas ainda diz QUANTO seria');
  assert.ok(p.raioSugeridoKm > 0 && p.raioSugeridoKm < 200);
  // A sugestão tem de caber de verdade, senão é só um número simpático.
  assert.equal(plano({ raioKm: p.raioSugeridoKm }).cabe, true);
});

test('o plano cresce com o raio e com a faixa de zoom, sem surpresa', () => {
  const pequeno = plano({ raioKm: 5 }).tiles;
  const grande = plano({ raioKm: 10 }).tiles;
  assert.ok(grande > pequeno * 2, `${pequeno} → ${grande}`);
  const raso = plano({ raioKm: 5, zoomMaximo: 13 }).tiles;
  const fundo = plano({ raioKm: 5, zoomMaximo: 15 }).tiles;
  assert.ok(fundo > raso * 3, `cada zoom a mais quadruplica: ${raso} → ${fundo}`);
});

test('o zoom máximo respeita o que a fonte oferece', () => {
  // Pedir z18 de uma fonte que só vai até z9 baixaria 404 em massa.
  const p = planejarRegiao({ centro: SP, raioKm: 5, zoomMaximo: 18, base: { ...OSM, maxzoom: 12 } });
  assert.ok(p.porZoom.every((z) => z.zoom <= 12));
});

test('a conta do planeta é EXATA em tiles, e diz que os bytes são suposição', () => {
  // É a conta que explica por que o app não oferece o mundo inteiro. O número
  // de tiles é a definição da pirâmide; os bytes supõem terra em toda parte.
  assert.equal(custoDoPlaneta(0).tiles, 1);
  assert.equal(custoDoPlaneta(1).tiles, 4);
  assert.equal(custoDoPlaneta(14).tiles, 268_435_456);
  assert.equal(custoDoPlaneta(14).exato, 'tiles');
  // Mesmo supondo 1 kB por tile — oceano vazio — o planeta em z14 passa de
  // 250 GB. A conclusão não depende da estimativa de bytes.
  assert.ok(custoDoPlaneta(14).tiles * 1024 > 250e9);
});

test('o planeta em z14 é ordens de grandeza maior que o teto de uma região', () => {
  assert.ok(custoDoPlaneta(14).tiles / TETO_TILES_REGIAO > 20_000);
});

test('contarTiles não gera URL nenhuma — contar é barato, gerar não', () => {
  const bounds = boundsDoRaio({ lat: -23.55, lon: -46.63, raioKm: 10 });
  assert.ok(contarTiles(bounds, 15) > 0);
  assert.equal(contarTiles(null, 15), 0);
});

test('tamanho aparece em unidade legível, nunca como soma crua de bytes', () => {
  assert.equal(formatarBytes(0), '0 MB');
  assert.equal(formatarBytes(-1), '0 MB');
  assert.equal(formatarBytes(NaN), '0 MB');
  assert.match(formatarBytes(500_000), /kB$/);
  assert.match(formatarBytes(5 * 1024 * 1024), /^5\.0 MB$/);
  assert.match(formatarBytes(400 * 1024 * 1024), /MB$/);
  assert.match(formatarBytes(2 * 1024 ** 3), /GB$/);
  assert.match(formatarBytes(11 * 1024 ** 4), /TB$/);
});

/* ──────────────────────────── CORREDOR DE ROTA ──────────────────────────── */

const { planejarCorredor, comprimentoDaRota, ZOOM_CASAS } = await import('../src/core/mapa-regiao.js');

// Londrina → Bandeirantes (PR): o trecho que motivou o corredor.
const LONDRINA = { lat: -23.3103, lon: -51.1628 };
const BANDEIRANTES = { lat: -23.1103, lon: -50.3672 };
const CAMINHO = [LONDRINA, BANDEIRANTES];
const corredor = (opcoes = {}) => planejarCorredor({ pontos: CAMINHO, base: OSM, ...opcoes });

test('o comprimento da rota bate com a distância conhecida do trecho', () => {
  // Londrina a Bandeirantes são ~84 km em linha reta. Uma conta que ignorasse
  // o cosseno da latitude erraria a longitude em ~8 %.
  const km = comprimentoDaRota(CAMINHO);
  assert.ok(km > 82 && km < 87, `${km.toFixed(1)} km`);
  assert.equal(comprimentoDaRota([]), 0);
  assert.equal(comprimentoDaRota([LONDRINA]), 0, 'um ponto só não é caminho');
});

test('o comprimento soma os trechos, não a reta entre as pontas', () => {
  // Uma rota que sobe e volta tem comprimento; a reta ponta a ponta é zero.
  const idaEVolta = [LONDRINA, BANDEIRANTES, LONDRINA];
  assert.ok(comprimentoDaRota(idaEVolta) > comprimentoDaRota(CAMINHO) * 1.9);
});

test('CORREDOR É MUITO MAIS BARATO QUE A CAIXA que o contém', () => {
  // É a razão inteira de este planejador existir: um círculo que cobrisse as
  // duas pontas teria 42 km de raio e baixaria onde ninguém vai pisar.
  const c = corredor({ raioKm: 5, zoomMaximo: 15 });
  const circulo = planejarRegiao({
    centro: { lat: (LONDRINA.lat + BANDEIRANTES.lat) / 2, lon: (LONDRINA.lon + BANDEIRANTES.lon) / 2 },
    raioKm: 45, zoomMaximo: 15, base: OSM,
  });
  assert.ok(c.tiles * 3 < circulo.tiles, `corredor ${c.tiles} vs círculo ${circulo.tiles}`);
});

test('o corredor cabe até z15 e é recusado com casas, sugerindo o zoom que cabe', () => {
  const ate15 = corredor({ raioKm: 5, zoomMaximo: 15 });
  assert.equal(ate15.cabe, true);
  assert.ok(ate15.bytesEstimados < 60 * 1024 * 1024, formatarBytes(ate15.bytesEstimados));

  const comCasas = corredor({ raioKm: 5, zoomMaximo: ZOOM_CASAS });
  assert.equal(comCasas.cabe, false);
  assert.equal(comCasas.motivo, MOTIVOS_REGIAO.GRANDE_DEMAIS);
  assert.ok(comCasas.zoomSugerido !== null, 'diz até onde daria');
  // E o zoom sugerido tem de caber de verdade, senão é número simpático.
  assert.equal(corredor({ raioKm: 5, zoomMaximo: comCasas.zoomSugerido }).cabe, true);
});

test('mais raio custa mais, e a conta acompanha', () => {
  const estreito = corredor({ raioKm: 2, zoomMaximo: 15 }).tiles;
  const largo = corredor({ raioKm: 10, zoomMaximo: 15 }).tiles;
  assert.ok(largo > estreito * 2, `${estreito} → ${largo}`);
});

test('rota com menos de dois pontos é recusada com motivo próprio', () => {
  // Três problemas, três respostas: sem rota, sem raio, sem fonte.
  for (const p of [null, [], [LONDRINA], [{ lat: 'x', lon: 'y' }, { lat: 1 }]]) {
    assert.equal(planejarCorredor({ pontos: p, base: OSM }).motivo, MOTIVOS_REGIAO.ROTA_INVALIDA);
  }
  assert.equal(corredor({ raioKm: 0 }).motivo, MOTIVOS_REGIAO.RAIO_INVALIDO);
  assert.equal(planejarCorredor({ pontos: CAMINHO, base: {} }).motivo, MOTIVOS_REGIAO.SEM_FONTE);
});

test('coordenada inválida no meio da rota é descartada, sem derrubar o resto', () => {
  // Trilha importada de GPX alheio traz lixo. Descartar o ponto ruim é certo;
  // recusar o caminho inteiro por causa dele não é.
  const comLixo = [LONDRINA, { lat: null, lon: -50.9 }, { lat: 'abc', lon: 0 }, BANDEIRANTES];
  const c = planejarCorredor({ pontos: comLixo, raioKm: 5, zoomMaximo: 14, base: OSM });
  assert.equal(c.cabe, true);
  assert.ok(Math.abs(c.comprimentoKm - comprimentoDaRota(CAMINHO)) < 1);
});

test('as URLs entregues são exatamente as prometidas na contagem', () => {
  const c = corredor({ raioKm: 3, zoomMaximo: 14 });
  assert.equal(c.urls.length, c.tiles);
  assert.equal(new Set(c.urls).size, c.urls.length, 'sem tile repetido — seria download pago duas vezes');
});

test('rota parada no mesmo lugar não trava nem explode', () => {
  // Trilha de quem ficou sentado: todos os fixos praticamente iguais. O
  // segmento degenerado divide por zero se ninguém cuidar.
  const parado = Array.from({ length: 20 }, () => ({ ...LONDRINA }));
  const c = planejarCorredor({ pontos: parado, raioKm: 2, zoomMaximo: 14, base: OSM });
  assert.equal(c.cabe, true);
  assert.ok(c.tiles > 0 && c.tiles < 400, `${c.tiles} tiles`);
  assert.ok(c.comprimentoKm < 0.001);
});
