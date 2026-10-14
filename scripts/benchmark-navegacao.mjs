#!/usr/bin/env node
/**
 * Baseline 1.6.0 × V3 — o §27 com número em vez de adjetivo.
 *
 * A meta de "3× melhor" só significa alguma coisa se cada eixo for medido
 * separadamente e a conta aparecer. Um número único e redondo escondendo sete
 * medições diferentes é adjetivo com cara de métrica.
 *
 * Onde a V3 não alcança 3×, isto **diz que não alcança**. Onde o ganho é
 * categórico (deixar de perder dado não tem fator), isto diz isso também, em
 * vez de inventar uma razão para caber na meta.
 *
 * Uso: node scripts/benchmark-navegacao.mjs
 */

import { trilhasDouradas } from '../test/dados/trilhas-douradas.js';
import { medirTrilha } from '../src/engine/odometro.js';
import { medirDistancia } from '../src/engine/distancia.js';
import { exportarRegistroLocal, LIMITE_TRILHA } from '../src/core/registro-offline.js';

const linha = (n = 78) => '─'.repeat(n);
const pct = (v) => `${(v * 100).toFixed(1)}%`;

console.log(`\n${linha()}\nPROJECT VANGUARD · BASELINE 1.6.0 × V3\n${linha()}\n`);

/* ── 1. Erro de distância contra a verdade construída ───────────────────── */
console.log('1. ERRO DE DISTÂNCIA (contra a geometria que gerou cada trilha)\n');
console.log('   trilha                  verdade    1.6.0        V3     erro 1.6.0   erro V3   fator');
console.log(`   ${linha(72)}`);

let somaErroAntigo = 0;
let somaErroNovo = 0;
let somaVerdade = 0;
const trilhas = [];

for (const trilha of trilhasDouradas()) {
  const antigo = medirTrilha(trilha.pontos).distanciaM;
  const novo = medirDistancia(trilha.pontos).observadaM;
  const erroAntigo = Math.abs(antigo - trilha.verdadeM);
  const erroNovo = Math.abs(novo - trilha.verdadeM);
  somaErroAntigo += erroAntigo;
  somaErroNovo += erroNovo;
  somaVerdade += trilha.verdadeM;

  trilhas.push({ id: trilha.id, erroAntigo, erroNovo });
  const fator = erroNovo === 0 ? (erroAntigo === 0 ? '—' : '∞') : (erroAntigo / erroNovo).toFixed(2) + '×';
  console.log(
    `   ${trilha.id.padEnd(20)} ${trilha.verdadeM.toFixed(0).padStart(7)} ${antigo.toFixed(0).padStart(9)} ${novo.toFixed(0).padStart(9)}`
    + ` ${erroAntigo.toFixed(0).padStart(11)} ${erroNovo.toFixed(0).padStart(9)}   ${fator.padStart(6)}`
  );
}

const fatorGlobal = somaErroNovo === 0 ? Infinity : somaErroAntigo / somaErroNovo;
console.log(`   ${linha(72)}`);
console.log(`   erro total: ${somaErroAntigo.toFixed(0)} m → ${somaErroNovo.toFixed(0)} m sobre ${somaVerdade.toFixed(0)} m percorridos`);
console.log(`   erro relativo: ${pct(somaErroAntigo / somaVerdade)} → ${pct(somaErroNovo / somaVerdade)}`);
console.log(`   FATOR AGREGADO: ${Number.isFinite(fatorGlobal) ? fatorGlobal.toFixed(2) + '×' : '∞'}   ${fatorGlobal >= 3 ? '✓ acima de 3×' : '✗ abaixo de 3×'}`);

// Um número agregado que esconde de onde ele veio é adjetivo com cara de
// métrica. Aqui o ganho está concentrado num caso só, e isso precisa aparecer.
const melhoraram = trilhas.filter((t) => t.erroAntigo > t.erroNovo + 0.5);
const iguais = trilhas.filter((t) => Math.abs(t.erroAntigo - t.erroNovo) <= 0.5);
console.log(`\n   ⚠ LEIA O AGREGADO COM CUIDADO: ${melhoraram.length} de ${trilhas.length} trilhas melhoraram;`);
console.log(`     ${iguais.length} medem EXATAMENTE igual à 1.6.0.`);
if (melhoraram.length) {
  const maior = melhoraram.sort((a, b) => (b.erroAntigo - b.erroNovo) - (a.erroAntigo - a.erroNovo))[0];
  const parcela = (maior.erroAntigo - maior.erroNovo) / Math.max(1, somaErroAntigo - somaErroNovo);
  console.log(`     '${maior.id}' sozinha responde por ${pct(parcela)} da redução de erro.`);
}
console.log('     O odômetro da 1.6.0 já era bom: soma por segmento, desnível e peneira pela');
console.log('     precisão do fixo. O que a V3 acrescenta é o VÃO — então onde não há perda');
console.log('     de sinal, as duas medidas coincidem, e é isso mesmo que se espera.\n');

/* ── 2. Capacidade de gravação ──────────────────────────────────────────── */
console.log('2. CAPACIDADE DE GRAVAÇÃO\n');
const TETO_ANTIGO = 12_000;
console.log(`   1.6.0: teto de ${TETO_ANTIGO.toLocaleString('pt-BR')} pontos, com DESCARTE SILENCIOSO dos mais antigos`);
console.log(`          ≈ ${((TETO_ANTIGO * 2) / 1000).toFixed(0)} km na regra de ≥2 m entre pontos`);
console.log('   V3:    sem teto (append-only em IndexedDB); 20 000 verificados no navegador');
console.log('   FATOR: não é multiplicativo — deixar de perder dado não tem fator.');
console.log('          O ganho é categórico: de "perde em silêncio" para "não perde".\n');

/* ── 3. Extração ────────────────────────────────────────────────────────── */
console.log('3. EXTRAÇÃO (a trilha consegue sair do aparelho?)\n');
const p = (i) => ({ lat: -23.31 + i * 1e-5, lon: -51.16 + i * 1e-5, accuracy: 8, altitude: 550 });
for (const n of [4_000, 4_001, 12_000]) {
  const trilha = Array.from({ length: n }, (_, i) => p(i));
  let v3;
  try { v3 = `${(exportarRegistroLocal({ trilha, waypoints: [] }).length / 1024 / 1024).toFixed(2)} MB`; }
  catch (e) { v3 = `RECUSOU (${e.message})`; }
  const antigo = n > 4_000 ? 'RECUSAVA a exportação inteira' : 'exportava';
  console.log(`   ${String(n).padStart(6)} pontos · 1.6.0: ${antigo.padEnd(30)} · V3: ${v3}`);
}
console.log(`   Teto de importação: 4 000 → ${LIMITE_TRILHA.toLocaleString('pt-BR')} (backup que não volta não é backup)`);
console.log('   FATOR: de "não sai do aparelho acima de 4 000" para "sai em qualquer tamanho".\n');

/* ── 4. Continuidade do rastreamento ────────────────────────────────────── */
console.log('4. CONTINUIDADE DO RASTREAMENTO\n');
console.log('   1.6.0: o gravador vivia em src/pages/mapa.js; desmontar() derrubava');
console.log('          watcher e background. Trocar de #/mapa para #/bussola ENCERRAVA a gravação.');
console.log('   V3:    serviço fora das páginas; deixar de observar não para nada.');
console.log('   FATOR: booleano. Antes: parava. Agora: não para.\n');

/* ── 5. Custo de gravação por ponto (medido em IndexedDB real) ──────────── */
console.log('5. CUSTO DE GRAVAÇÃO POR PONTO\n');
console.log('   Medido por npm run verificar:trilha, Chromium, 20 000 pontos:');
console.log('     sem checkpoint (ponto + sessão por fixo): 1,182 ms/ponto');
console.log('     com checkpoint a cada 25 pontos:          0,600 ms/ponto');
console.log('   FATOR: 1,97×   ✗ ABAIXO da meta de 3× — dito porque é o que a medida diz.');
console.log('          O gargalo restante é a transação do IndexedDB por ponto; agrupar');
console.log('          pontos em lote reduziria mais, ao custo de perder o último lote');
console.log('          numa morte súbita. Não foi feito: perder ponto é pior que ser lento.\n');

/* ── Resumo ─────────────────────────────────────────────────────────────── */
console.log(linha());
console.log('RESUMO — onde a meta de 3× foi atingida, e onde não foi\n');
console.log(`   erro de distância ......... ${Number.isFinite(fatorGlobal) ? fatorGlobal.toFixed(2) + '×' : '∞'} agregado — mas concentrado na perda de sinal;`);
console.log('                               sem vão, V3 e 1.6.0 medem igual');
console.log('   capacidade de gravação .... categórico (perdia → não perde)');
console.log('   extração .................. categórico (não saía → sai)');
console.log('   continuidade .............. categórico (parava → não para)');
console.log('   custo por ponto ........... 1,97×  ✗');
console.log(`\n${linha()}\n`);
