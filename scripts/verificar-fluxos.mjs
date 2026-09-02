/**
 * Fluxos funcionais num navegador de verdade.
 *
 * `npm test` prova que o motor calcula certo. Isto prova outra coisa, que
 * nenhum teste de unidade alcança: que **apertar o botão faz o que ele diz**.
 * Cada fluxo aqui é uma ação real de ponta a ponta, e vários existem porque o
 * defeito correspondente já aconteceu:
 *
 * - campo de waypoint VAZIO produzia distância e rumo para a coordenada (0, 0);
 * - campo de declinação VAZIO aplicava 0° como se fosse correção medida;
 * - a tela legada de tiro não se declarava legada em lugar nenhum;
 * - a tela "Sobre" mostrava a palavra PROTÓTIPO no lugar da versão.
 *
 * Não faz parte de `npm test`: exige Playwright e Chromium, que não são
 * dependências deste repositório. Ver `scripts/verificar-rotas.mjs`.
 *
 * Como rodar:
 *   npm run build && npx vite preview --port 4319 &
 *   CHROMIUM=<caminho do chrome> node scripts/verificar-fluxos.mjs
 */

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

/* A versão esperada vem do `package.json`, nunca de um literal aqui: um número
 * cravado num teste envelhece exatamente como envelheceu o `'1.3.1'` que a
 * configuração do app carregava — e aí o teste passa a mentir junto. */
const { version: VERSAO } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const BASE = process.env.BASE ?? 'http://localhost:4319';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, permissions: ['geolocation'], geolocation: { latitude: -23.5505, longitude: -46.6333, accuracy: 12 } });
const p = await ctx.newPage();
let falhas = 0;
const conferir = (nome, ok, detalhe = '') => { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome}${detalhe ? ' → ' + detalhe : ''}`); };

// ── FLUXO 1: navegação com campo vazio NÃO pode produzir rumo ────────────────
await p.goto(`${BASE}/#/navegacao`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.getByRole('button', { name: 'CALCULAR RUMO' }).click();
await p.waitForTimeout(200);
let txt = await p.locator('.navegacao__estado').nth(1).textContent();
conferir('campo vazio não vira coordenada (0,0)', !/DIST[ÂA]NCIA\s+[\d.,]/i.test(txt), txt.trim().slice(0, 70));

// ── FLUXO 2: destino real produz distância e rumo ────────────────────────────
await p.getByLabel('Latitude do waypoint').fill('-23.5605');
await p.getByLabel('Longitude do waypoint').fill('-46.6433');
await p.getByRole('button', { name: 'CALCULAR RUMO' }).click();
await p.waitForTimeout(200);
txt = await p.locator('.navegacao__estado').nth(1).textContent();
conferir('destino informado produz distância e rumo', /DIST[ÂA]NCIA.*RUMO/i.test(txt), txt.trim().slice(0, 70));

// ── FLUXO 3: coordenada fora de faixa é recusada ─────────────────────────────
await p.getByLabel('Latitude do waypoint').fill('999');
await p.getByRole('button', { name: 'CALCULAR RUMO' }).click();
await p.waitForTimeout(200);
txt = await p.locator('.navegacao__estado').nth(1).textContent();
conferir('latitude fora de faixa é recusada', /inv[áa]lido/i.test(txt), txt.trim().slice(0, 70));

// ── FLUXO 4: conversor MGRS ──────────────────────────────────────────────────
await p.getByLabel('Coordenada MGRS para converter').fill('23K LP 33287 94588');
await p.getByRole('button', { name: 'CONVERTER MGRS' }).click();
await p.waitForTimeout(200);
txt = await p.locator('.navegacao__estado').last().textContent();
conferir('conversor MGRS devolve lat/lon', /LAT\/LON\s*-2[0-9]/.test(txt), txt.trim().slice(0, 60));

// ── FLUXO 5: bússola com declinação vazia NÃO aplica correção ────────────────
await p.goto(`${BASE}/#/bussola`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
await p.getByRole('button', { name: /USAR ESTA DECLINA/i }).click();
await p.waitForTimeout(300);
const status = await p.locator('.bussola__status-texto').textContent();
conferir('declinação vazia não vira correção de 0°', /Informe a declina/i.test(status), status.trim().slice(0, 70));

// ── FLUXO 6: declinação válida aplica ────────────────────────────────────────
await p.getByLabel(/Declina/i).fill('-20.5');
await p.getByRole('button', { name: /USAR ESTA DECLINA/i }).click();
await p.waitForTimeout(300);
const status2 = await p.locator('.bussola__status-texto').textContent();
conferir('declinação informada é aplicada', /-20\.5/.test(status2), status2.trim().slice(0, 70));

// ── FLUXO 7: doar não promete pagamento ──────────────────────────────────────
await p.goto(`${BASE}/#/doar`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.locator('.doar__checkout').click();
await p.waitForTimeout(200);
const doar = await p.locator('.doar__status').textContent();
conferir('checkout diz que não está configurado', /CHECKOUT N[ÃA]O CONFIGURADO/i.test(doar) && !/ASAAS_API_KEY/.test(doar), doar.trim().slice(0, 60));

// ── FLUXO 8: tela legada se declara legada ───────────────────────────────────
await p.goto(`${BASE}/#/tiro`, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const legado = await p.locator('.tiro__legado').textContent().catch(() => '');
conferir('tela legada mostra o aviso', /LEGADA/.test(legado) && /Arma 3/.test(legado), legado.trim().slice(0, 60));

// ── FLUXO 9: sobre mostra a versão real ──────────────────────────────────────
await p.goto(`${BASE}/#/sobre`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const versao = await p.locator('.sobre__version').textContent();
conferir('sobre mostra a versão real do app', versao.includes(`v${VERSAO}`), versao.trim().slice(0, 40));

await b.close();
console.log(falhas ? `\n${falhas} fluxo(s) com falha` : '\ntodos os fluxos passaram');
process.exit(falhas ? 1 : 0);
