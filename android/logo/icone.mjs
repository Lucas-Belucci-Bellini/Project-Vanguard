/**
 * Gera o conjunto de ícones do APK a partir de um desenho vetorial único.
 *
 * O ícone é a marca do app: o "V" de Vanguard desenhado como divisa de rumo,
 * dentro de um bezel de bússola com os quatro pontos cardeais, sobre a grade
 * e o verde-fósforo do próprio aplicativo (`--color-bg` e `--color-cyan` de
 * `src/styles/variables.css`).
 *
 * Regra do ícone adaptativo do Android: as camadas têm 108 dp, mas só o
 * círculo central de 66 dp é garantido — o resto pode ser cortado por
 * qualquer máscara de launcher. Por isso o V e o bezel vivem dentro desse
 * círculo, e só a grade e o brilho ocupam a borda.
 *
 * Uso: `npm i -D playwright && node android/logo/icone.mjs`
 *
 * O playwright NÃO é dependência do projeto de propósito: o `postinstall` dele
 * baixa navegadores, e o CI roda `npm ci` a cada release para montar o APK —
 * centenas de megabytes por build por causa de um gerador usado de vez em
 * quando. Instale só na hora de regerar os ícones, e desinstale depois.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FUNDO = '#0c0f0a';       // --color-bg
const FOSFORO = '#8bff3f';     // --color-cyan
const RES = 'android/app/src/main/res';

/** Grade de referência, a mesma ideia do fundo da tela inicial. */
function grade() {
  const linhas = [];
  for (let v = 18; v < 108; v += 18) {
    linhas.push(`<line x1="${v}" y1="0" x2="${v}" y2="108"/>`);
    linhas.push(`<line x1="0" y1="${v}" x2="108" y2="${v}"/>`);
  }
  return `<g stroke="${FOSFORO}" stroke-opacity=".11" stroke-width=".9">${linhas.join('')}</g>`;
}

const CAMADA_FUNDO = `
  <defs>
    <radialGradient id="brilho" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="${FOSFORO}" stop-opacity=".16"/>
      <stop offset="100%" stop-color="${FOSFORO}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="108" height="108" fill="${FUNDO}"/>
  ${grade()}
  <rect width="108" height="108" fill="url(#brilho)"/>`;

/**
 * O V e o bezel. Tudo dentro do círculo seguro de raio 33 centrado em 54,54:
 * a ponta mais distante do V fica a 25,5 do centro, contra 28,5 do anel; nada passa de 33, que é o
 * raio garantido pela máscara.
 */
const CAMADA_FRENTE = `
  <g fill="none" stroke="${FOSFORO}">
    <circle cx="54" cy="54" r="28.5" stroke-opacity=".45" stroke-width="2"/>
    <g stroke-width="2.6" stroke-linecap="round" stroke-opacity=".85">
      <line x1="54" y1="23" x2="54" y2="30"/>
      <line x1="54" y1="78" x2="54" y2="85"/>
      <line x1="23" y1="54" x2="30" y2="54"/>
      <line x1="78" y1="54" x2="85" y2="54"/>
    </g>
    <path d="M39.5 39.5 L54 66.5 L68.5 39.5" stroke-width="10" stroke-linecap="round" stroke-linejoin="miter"/>
  </g>`;

/** Uma página HTML com o SVG ocupando exatamente o viewport. */
function pagina(conteudo, { recorte = 'nenhum' } = {}) {
  const mascara = recorte === 'circulo'
    ? '<clipPath id="m"><circle cx="54" cy="54" r="54"/></clipPath>'
    : recorte === 'quadrado'
      ? '<clipPath id="m"><rect x="4" y="4" width="100" height="100" rx="22"/></clipPath>'
      : '';
  const abre = mascara ? '<g clip-path="url(#m)">' : '';
  const fecha = mascara ? '</g>' : '';
  return `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
  <defs>${mascara}</defs>${abre}${conteudo}${fecha}
</svg>`;
}

const DENSIDADES = [
  { dir: 'mipmap-mdpi', camada: 108, legado: 48 },
  { dir: 'mipmap-hdpi', camada: 162, legado: 72 },
  { dir: 'mipmap-xhdpi', camada: 216, legado: 96 },
  { dir: 'mipmap-xxhdpi', camada: 324, legado: 144 },
  { dir: 'mipmap-xxxhdpi', camada: 432, legado: 192 },
];

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function render(html, lado, destino, transparente, retangulo = null) {
  const viewport = retangulo
    ? { width: retangulo.largura, height: retangulo.altura }
    : { width: lado, height: lado };
  const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await mkdir(path.dirname(destino), { recursive: true });
  await p.screenshot({ path: destino, omitBackground: transparente });
  await ctx.close();
}

for (const { dir, camada, legado } of DENSIDADES) {
  const base = path.join(RES, dir);
  // Camadas do ícone adaptativo (Android 8+): 108 dp cada, sem recorte próprio.
  await render(pagina(CAMADA_FUNDO), camada, path.join(base, 'ic_launcher_background.png'), false);
  await render(pagina(CAMADA_FRENTE), camada, path.join(base, 'ic_launcher_foreground.png'), true);
  // Ícones legados (Android 7 e anteriores): o app desenha a própria forma,
  // porque nenhuma máscara é aplicada pelo sistema.
  const composto = CAMADA_FUNDO + CAMADA_FRENTE;
  await render(pagina(composto, { recorte: 'quadrado' }), legado, path.join(base, 'ic_launcher.png'), true);
  await render(pagina(composto, { recorte: 'circulo' }), legado, path.join(base, 'ic_launcher_round.png'), true);
  console.log(`${dir}: camadas ${camada}px, legado ${legado}px`);
}

// 512×512 para loja e para uso como logo do projeto.
await render(pagina(CAMADA_FUNDO + CAMADA_FRENTE, { recorte: 'quadrado' }), 512, 'android/logo/vanguard-icone-512.png', true);
console.log('android/logo/vanguard-icone-512.png: 512px');

await writeFile('android/logo/vanguard-icone.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="512" height="512">
  <defs><clipPath id="m"><rect x="4" y="4" width="100" height="100" rx="22"/></clipPath></defs>
  <g clip-path="url(#m)">${CAMADA_FUNDO}${CAMADA_FRENTE}</g>
</svg>\n`);
console.log('android/logo/vanguard-icone.svg: fonte vetorial');

// ── Splash ────────────────────────────────────────────────────────────────
// A padrão do Capacitor é um X azul sobre BRANCO: numa estrada à noite isso é
// um flash de tela branca antes de um app escuro abrir. Aqui ela usa o mesmo
// fundo do app, com a marca no centro e o nome embaixo.
const SPLASHS = [
  ['drawable', 480, 320], ['drawable-land-mdpi', 480, 320], ['drawable-land-hdpi', 800, 480],
  ['drawable-land-xhdpi', 1280, 720], ['drawable-land-xxhdpi', 1600, 960], ['drawable-land-xxxhdpi', 1920, 1280],
  ['drawable-port-mdpi', 320, 480], ['drawable-port-hdpi', 480, 800], ['drawable-port-xhdpi', 720, 1280],
  ['drawable-port-xxhdpi', 960, 1600], ['drawable-port-xxxhdpi', 1280, 1920],
];

function paginaSplash(largura, altura) {
  // A marca ocupa um terço do lado menor: grande o bastante para ser vista,
  // pequena o bastante para não encostar nas bordas em tela estreita.
  const lado = Math.round(Math.min(largura, altura) / 3);
  return `<!doctype html><meta charset="utf-8"><style>
   html,body{margin:0;height:100%}
   body{background:${FUNDO};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(lado * 0.14)}px}
   svg{width:${lado}px;height:${lado}px;display:block}
   p{margin:0;color:${FOSFORO};opacity:.72;font:700 ${Math.round(lado * 0.085)}px ui-monospace,"DejaVu Sans Mono",monospace;letter-spacing:${lado * 0.02}px}
  </style>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${CAMADA_FRENTE}</svg>
  <p>VANGUARD FIELD</p>`;
}

for (const [dir, largura, altura] of SPLASHS) {
  await render(paginaSplash(largura, altura), null, `${RES}/${dir}/splash.png`, false, { largura, altura });
  console.log(`${dir}: splash ${largura}x${altura}`);
}

await navegador.close();
