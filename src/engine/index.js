/**
 * Motor do Project Vanguard — ponto único de importação.
 *
 * Regra de ouro deste diretório: **zero dependências e zero DOM**. Tudo aqui
 * roda igual no navegador, no Node, num Web Worker e numa função serverless.
 * É o que permite a mesma física alimentar o app, o site e a API sem
 * ninguém reimplementar nada (e sem duas versões divergirem em silêncio).
 *
 * Se você for adicionar algo aqui e precisar de `window`, `document` ou de um
 * pacote npm: o lugar é `src/ui/`, não aqui.
 */

export * from './numero-seguro.js';
export * from './angles.js';
export * from './geo.js';
/* Posição do Sol: geometria pura, para avaliar exposição solar sem rede. */
export * from './sol.js';
/* Declinação magnética pelo WMM oficial: o terceiro caminho entre a leitura da
 * bússola e o norte do mapa, ao lado da calibração pelo Sol e da entrada manual.
 * Previsão do campo da Terra — não sabe nada sobre o aparelho. */
export * from './wmm.js';
/* O ponto de trilha e o que se pode afirmar sobre ele. Classificar não é
 * filtrar: o ponto suspeito é marcado, nunca apagado — quem decide o que fazer
 * com ele é o consumidor. */
export * from './trilha-ponto.js';
export * from './mgrs.js';
export * from './gridref.js';
/* Grade REAL dos terrenos do Arma 3 (offset e SINAL do passo por mundo).
 * Diferente do gridref.js, que e MGRS local: 30 dos 31 mundos do jogo contam
 * o northing de cima pra baixo, e assumir a convencao MGRS erra o eixo N-S. */
export * from './arma3-grid.js';
export * from './ballistics.js';
export * from './charges.js';
export * from './fire-mission.js';
