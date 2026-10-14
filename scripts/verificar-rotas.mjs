/**
 * Varredura de rotas num navegador de verdade.
 *
 * Existe porque `npm test` NÃO responde "a interface funciona". Os testes de
 * `node --test` cobrem motor e contrato; esta varredura abre cada rota num
 * Chromium, coleta exceção de página e erro de console, e confere que a tela
 * renderizou conteúdo — que é a única evidência aceitável de que a rota abre.
 *
 * NÃO faz parte de `npm test` de propósito: exige Playwright e um Chromium
 * instalados, que não são dependências deste repositório (o postinstall do
 * Playwright baixa navegador em todo `npm ci` e não vale o preço no CI).
 *
 * Como rodar:
 *   npm run build
 *   npx vite preview --port 4319 &
 *   node scripts/verificar-rotas.mjs
 *
 * Variáveis: BASE (padrão http://localhost:4319), CHROMIUM (caminho do binário),
 * LARGURAS (lista separada por vírgula, padrão 320,390).
 */

import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4319';
const LARGURAS = (process.env.LARGURAS ?? '320,390').split(',').map(Number);

/** As rotas são lidas do próprio `main.js`, não decoradas aqui. */
async function rotasDoApp(pagina) {
  return pagina.evaluate(() => [...document.querySelectorAll('.vg-aba')].map((b) => b.dataset.hash));
}

async function medirRota(pagina, hash) {
  const erros = [];
  const aoErro = (e) => erros.push(`pageerror: ${e?.message ?? e}`);
  const aoConsole = (m) => { if (m.type() === 'error') erros.push(`console: ${m.text()}`); };
  pagina.on('pageerror', aoErro);
  pagina.on('console', aoConsole);

  await pagina.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  // As páginas carregam por import dinâmico; sem esta folga a medição pega a
  // tela antes do módulo chegar e acusa vazio onde há conteúdo.
  await pagina.waitForTimeout(900);

  const medida = await pagina.evaluate(() => {
    // O contêiner do shell, não a classe da página: uma tela que esquecesse
    // `.vg-pagina` some da medição e o defeito passa por "rota quebrada".
    const raiz = document.querySelector('.vg-main');
    const texto = (raiz?.innerText ?? '').trim();
    const doc = document.documentElement;
    return {
      renderizou: Boolean(raiz && raiz.children.length),
      classeRaiz: raiz?.firstElementChild?.className ?? null,
      mainsAninhados: document.querySelectorAll('main main').length,
      caracteres: texto.length,
      botoes: raiz ? raiz.querySelectorAll('button').length : 0,
      entradas: raiz ? raiz.querySelectorAll('input, select, textarea').length : 0,
      titulo: raiz?.querySelector('h1')?.textContent?.trim() ?? null,
      overflowPx: doc.scrollWidth - doc.clientWidth,
      vazando: [...(raiz?.querySelectorAll('*') ?? [])]
        .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 2)
        .map((e) => `${e.tagName}.${e.className}`.slice(0, 50)),
    };
  });

  pagina.off('pageerror', aoErro);
  pagina.off('console', aoConsole);
  // Certificado do proxy do ambiente de build não é defeito do app.
  return { hash, ...medida, erros: erros.filter((e) => !e.includes('ERR_CERT_AUTHORITY_INVALID')) };
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

let falhas = 0;
for (const largura of LARGURAS) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 780 },
    permissions: ['geolocation', 'camera', 'microphone'],
    geolocation: { latitude: -23.5505, longitude: -46.6333, accuracy: 12 },
  });
  const pagina = await ctx.newPage();
  await pagina.goto(`${BASE}/#/inicio`, { waitUntil: 'networkidle' });
  const rotas = [...(await rotasDoApp(pagina)), '#/tiro'];

  console.log(`\n═══ ${largura} px ═══`);
  for (const hash of rotas) {
    const r = await medirRota(pagina, hash);
    const problemas = [];
    if (!r.renderizou) problemas.push('NÃO RENDERIZOU');
    if (r.caracteres < 40) problemas.push(`texto ${r.caracteres} car.`);
    if (r.erros.length) problemas.push(`${r.erros.length} erro(s)`);
    if (r.overflowPx > 0 || r.vazando.length) problemas.push(`vaza ${r.overflowPx}px ${r.vazando.join(' ')}`);
    if (problemas.length) falhas += 1;
    console.log(
      `${(problemas.length ? '✗' : '✓')} ${hash.padEnd(16)} ` +
      `${String(r.caracteres).padStart(5)} car · ${String(r.botoes).padStart(2)} bot · ${String(r.entradas).padStart(2)} campo · ` +
      `h1=${r.titulo ?? '—'}` + (problemas.length ? `  →  ${problemas.join(' | ')}` : ''),
    );
    for (const erro of r.erros.slice(0, 3)) console.log(`    ${erro.slice(0, 160)}`);
  }
  await ctx.close();
}

await navegador.close();
console.log(falhas ? `\n${falhas} rota(s) com problema` : '\nnenhuma rota com problema');
process.exit(falhas ? 1 : 0);
