/**
 * Rotas na WebView: testa **os bytes que o APK empacota**, na origem que a
 * WebView usa.
 *
 * "Funciona no Chrome" não é evidência de que funciona no aplicativo. Este
 * script fecha essa lacuna sem precisar de um aparelho:
 *
 * - serve `android/app/src/main/assets/public` — o bundle que vai dentro do
 *   APK, não o `dist` da máquina;
 * - serve em **`http://localhost`**, que é o que a WebView do Capacitor com
 *   `useLegacyBridge: true` entrega. O protocolo importa: era ele que fazia o
 *   registro do service worker (`location.protocol === 'https:'`) falhar
 *   silenciosamente dentro do aplicativo;
 * - usa user agent de Android e viewport de celular;
 * - abre cada rota, navega pelo menu, volta, retorna, e classifica todo erro.
 *
 * O que ele NÃO substitui: instalar o APK num aparelho. WebView do sistema,
 * permissões e plugins nativos só existem lá.
 *
 * Uso:
 *   npm run mobile:sync:android
 *   CHROMIUM=<caminho do chrome> node scripts/verificar-webview.mjs
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const PUBLICO = process.env.ASSETS ?? path.join(RAIZ, 'android/app/src/main/assets/public');
const PORTA = Number(process.env.PORTA ?? 4407);
const BASE = `http://localhost:${PORTA}`;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
};

if (!fs.existsSync(PUBLICO)) {
  console.error(`✗ assets não encontrados em ${PUBLICO} — rode \`npm run mobile:sync:android\` antes.`);
  process.exit(1);
}

const servidor = http.createServer((req, res) => {
  const limpa = decodeURIComponent(req.url.split('?')[0]);
  let arquivo = path.join(PUBLICO, limpa === '/' ? 'index.html' : limpa);
  if (!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) arquivo = path.join(PUBLICO, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(arquivo)] ?? 'application/octet-stream' });
  fs.createReadStream(arquivo).pipe(res);
});
await new Promise((r) => servidor.listen(PORTA, r));

/** Erro do ambiente de build (proxy sem certificado, host bloqueado) não é defeito do app. */
const RUIDO = [/ERR_CERT_AUTHORITY_INVALID/, /ERR_ABORTED/, /ERR_NAME_NOT_RESOLVED/, /ERR_CONNECTION/, /ERR_PROXY/];
function classificar(texto) {
  if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(texto)) return 'ROUTER_ERROR';
  if (/Unexpected token|SyntaxError|is not defined|is not a function/i.test(texto)) return 'BUNDLE_ERROR';
  if (/Content Security Policy|Refused to/i.test(texto)) return 'WEBVIEW_ERROR';
  if (/Capacitor|plugin|cordova/i.test(texto)) return 'NATIVE_BRIDGE_ERROR';
  if (/404|MIME|net::/i.test(texto)) return 'ASSET_ERROR';
  return 'FEATURE_ERROR';
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 780 },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  permissions: ['geolocation'],
  geolocation: { latitude: -23.5505, longitude: -46.6333, accuracy: 12 },
});
const pagina = await ctx.newPage();

const erros = [];
pagina.on('pageerror', (e) => erros.push(String(e?.message ?? e)));
pagina.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
pagina.on('requestfailed', (r) => erros.push(`${r.failure()?.errorText} ${r.url()}`));
pagina.on('response', (r) => { if (r.status() >= 400) erros.push(`HTTP ${r.status()} ${r.url()}`); });
const novosErros = (desde) => erros.slice(desde).filter((e) => !RUIDO.some((re) => re.test(e)));

await pagina.goto(`${BASE}/#/inicio`, { waitUntil: 'networkidle' });
await pagina.waitForTimeout(1800);

const ambiente = await pagina.evaluate(async () => ({
  origem: location.origin,
  contextoSeguro: window.isSecureContext,
  sw: Boolean(await navigator.serviceWorker?.getRegistration()),
  caches: await caches.keys(),
  rotas: [...document.querySelectorAll('.vg-aba')].map((b) => b.dataset.hash),
}));
console.log(`origem ${ambiente.origem} · contexto seguro: ${ambiente.contextoSeguro} · service worker: ${ambiente.sw ? 'REGISTRADO' : 'não registrado'}`);
console.log(`caches: ${ambiente.caches.join(', ') || '(nenhum)'}`);
console.log(`abas no menu: ${ambiente.rotas.length}\n`);

const linhas = [];
let falhas = 0;
for (const hash of [...ambiente.rotas, '#/tiro']) {
  const desde = erros.length;
  // Abertura direta pela URL — é assim que um atalho ou um link externo entra.
  await pagina.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(800);
  const aberta = await pagina.evaluate(() => {
    const raiz = document.querySelector('.vg-main');
    return { car: (raiz?.innerText ?? '').trim().length, bot: raiz?.querySelectorAll('button').length ?? 0 };
  });

  // Ida e volta: sair para outra rota e voltar exercita desmontagem e remontagem.
  await pagina.goto(`${BASE}/#/inicio`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(400);
  await pagina.goBack({ waitUntil: 'networkidle' }).catch(() => {});
  await pagina.waitForTimeout(600);
  const voltou = await pagina.evaluate(() => (document.querySelector('.vg-main')?.innerText ?? '').trim().length);

  const problemas = novosErros(desde);
  const ok = aberta.car > 40 && voltou > 40 && problemas.length === 0;
  if (!ok) falhas += 1;
  linhas.push({ hash, ...aberta, voltou, problemas });
  console.log(
    `${ok ? '✓' : '✗'} ${hash.padEnd(16)} abriu ${String(aberta.car).padStart(5)} car · ${String(aberta.bot).padStart(2)} bot · voltou ${String(voltou).padStart(5)} car`
    + (problemas.length ? `  → ${problemas.length} erro(s)` : ''),
  );
  for (const p of problemas.slice(0, 2)) console.log(`      [${classificar(p)}] ${p.slice(0, 140)}`);
}

await navegador.close();
servidor.close();
console.log(falhas ? `\n${falhas} rota(s) com problema na WebView` : '\nnenhuma rota com problema na WebView');
process.exit(falhas ? 1 : 0);
