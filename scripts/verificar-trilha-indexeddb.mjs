#!/usr/bin/env node
/**
 * O Track Store contra IndexedDB de verdade, num navegador de verdade.
 *
 * `npm test` prova a REGRA do store (ele roda com persistência em memória, e é
 * assim que a regra pôde ser testada inteira sem navegador). Isto prova a outra
 * metade: que o adaptador de IndexedDB honra essa regra num motor real —
 * acréscimo sem reescrita, leitura por faixa de chave composta, e reabertura do
 * banco sem perder nada.
 *
 * Não faz parte de `npm test`: exige Playwright e Chromium, que **não** são
 * dependências deste repositório (o postinstall baixaria um navegador em todo
 * `npm ci`). Mesma regra de `scripts/verificar-rotas.mjs`.
 *
 * Como rodar:
 *   npx vite --port 4320 &
 *   BASE=http://127.0.0.1:4320 node scripts/verificar-trilha-indexeddb.mjs
 */

import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4320';
const PONTOS = Number(process.env.PONTOS ?? 20_000);

let falhas = 0;
const conferir = (nome, ok, detalhe = '') => {
  if (!ok) falhas += 1;
  console.log(`${ok ? '✓' : '✗'} ${nome}${detalhe ? ' → ' + detalhe : ''}`);
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
const contexto = await navegador.newContext();
const pagina = await contexto.newPage();
pagina.on('pageerror', (e) => { falhas += 1; console.log('✗ erro de página:', e.message); });

await pagina.goto(`${BASE}/#/inicio`, { waitUntil: 'networkidle' });

const resultado = await pagina.evaluate(async (quantos) => {
  const { criarTrackStore } = await import('/src/core/dados/track-store.js');
  const { persistenciaIndexedDB, DB_TRILHAS, STORE_PONTOS } = await import('/src/core/dados/track-store-indexeddb.js');

  // Ambiente limpo: este banco é criado pelo próprio teste.
  await new Promise((resolve) => {
    const pedido = indexedDB.deleteDatabase(DB_TRILHAS);
    pedido.onsuccess = pedido.onerror = pedido.onblocked = () => resolve();
  });

  const T0 = 1_700_000_000_000;
  const ponto = (i) => ({
    lat: -23.3103 + (i * 14) / 111_320, lon: -51.1628,
    timestamp: T0 + i * 10_000, accuracy: 6, altitude: 550 + i * 0.1, speed: 1.4,
  });

  const persistencia = persistenciaIndexedDB();
  const store = criarTrackStore({ persistencia });

  const t0 = performance.now();
  const sessao = await store.iniciar({ nome: 'IndexedDB real' });
  for (let i = 0; i < quantos; i += 1) await store.registrar(ponto(i));
  const msGravando = performance.now() - t0;

  const contagem = await store.contar(sessao.id);
  const primeiros = await store.pontos(sessao.id, { desde: 0, ate: 2 });
  const todos = await store.pontos(sessao.id);

  // Fecha e reabre: é o que acontece quando o aplicativo é morto e volta.
  persistencia.fechar();
  const persistencia2 = persistenciaIndexedDB();
  const store2 = criarTrackStore({ persistencia: persistencia2 });
  const recuperada = await store2.recuperar();
  const contagemDepois = recuperada ? await store2.contar(recuperada.id) : 0;

  // E a gravação continua de onde parou, sem colidir.
  let seqSeguinte = null;
  if (recuperada) {
    const r = await store2.registrar(ponto(quantos));
    seqSeguinte = r.seq;
  }

  // Quantos registros existem no store bruto — prova que é um registro por
  // ponto, e não um blob reescrito.
  const banco = await new Promise((resolve, reject) => {
    const p = indexedDB.open(DB_TRILHAS);
    p.onsuccess = () => resolve(p.result);
    p.onerror = () => reject(p.error);
  });
  const registrosCrus = await new Promise((resolve, reject) => {
    const tx = banco.transaction(STORE_PONTOS, 'readonly');
    const c = tx.objectStore(STORE_PONTOS).count();
    c.onsuccess = () => resolve(c.result);
    c.onerror = () => reject(c.error);
  });
  banco.close();

  return {
    quantos,
    contagem,
    contagemDepois,
    registrosCrus,
    seqSeguinte,
    msGravando,
    msPorPonto: msGravando / quantos,
    primeiroSeq: todos[0]?.seq ?? null,
    primeiroTimestamp: todos[0]?.timestamp ?? null,
    ultimoSeq: todos.at(-1)?.seq ?? null,
    faixaLida: primeiros.map((p) => p.seq),
    precisaoPreservada: todos[0]?.accuracy ?? null,
    altitudePreservada: todos[0]?.altitude ?? null,
    sessaoRecuperada: recuperada?.nome ?? null,
  };
}, PONTOS);

console.log(`\n── ${PONTOS.toLocaleString('pt-BR')} pontos em IndexedDB real ──`);
console.log(`   ${resultado.msGravando.toFixed(0)} ms · ${resultado.msPorPonto.toFixed(3)} ms por ponto\n`);

conferir('nenhum teto: todos os pontos entraram', resultado.contagem === PONTOS, `${resultado.contagem} de ${PONTOS}`);
conferir('um registro por ponto (acréscimo, não blob reescrito)', resultado.registrosCrus === PONTOS + 1, `${resultado.registrosCrus} registros crus`);
conferir('o primeiro ponto da caminhada continua lá', resultado.primeiroSeq === 0 && resultado.primeiroTimestamp === 1_700_000_000_000, `seq ${resultado.primeiroSeq}`);
conferir('leitura por faixa devolve só a faixa pedida', JSON.stringify(resultado.faixaLida) === '[0,1,2]', JSON.stringify(resultado.faixaLida));
conferir('precisão e altitude atravessam a persistência', resultado.precisaoPreservada === 6 && resultado.altitudePreservada === 550, `accuracy ${resultado.precisaoPreservada}, altitude ${resultado.altitudePreservada}`);
conferir('reabrir o banco não perde nada', resultado.contagemDepois === PONTOS, `${resultado.contagemDepois} depois de fechar e reabrir`);
conferir('a sessão aberta é recuperada pelo nome', resultado.sessaoRecuperada === 'IndexedDB real', String(resultado.sessaoRecuperada));
conferir('a sequência continua em vez de reiniciar', resultado.seqSeguinte === PONTOS, `próximo seq ${resultado.seqSeguinte}`);
conferir('custo por ponto abaixo de 1 ms', resultado.msPorPonto < 1, `${resultado.msPorPonto.toFixed(3)} ms`);

await navegador.close();
console.log(falhas ? `\n${falhas} verificação(ões) com falha` : '\nIndexedDB real: tudo conferido');
process.exit(falhas ? 1 : 0);
