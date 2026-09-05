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

// ── FLUXO 7: o modelo magnético dá a declinação e diz que é PREVISÃO ─────────
// Precisa de posição: o modelo calcula para um lugar, e sem lugar não há o que
// calcular. Semear aqui é o que permite conferir o cartão sem GPS no runner.
await p.evaluate(() => {
  localStorage.setItem('vanguard:local', JSON.stringify({ lat: -23.3103, lon: -51.1628, accuracy: 12, heading: 90, ts: Date.now() }));
  localStorage.removeItem('vanguard:bussola');
});
// `goto` para a MESMA URL não recarrega o documento, e o `estado` mantém cópia
// em memória: sem o reload, a correção de -20,5° do fluxo 6 continuaria viva e
// o botão do modelo apareceria (corretamente) desabilitado.
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const cartaoModelo = () => p.locator('.bussola__card', { hasText: 'MODELO MAGNÉTICO' });
const textoModelo = await cartaoModelo().innerText();
conferir(
  'modelo magnético mostra a declinação do lugar',
  /DECLINAÇÃO AQUI/.test(textoModelo) && /-\d+[.,]\d°/.test(textoModelo) && /WMM-\d{4}/.test(textoModelo),
  textoModelo.replace(/\n+/g, ' · ').slice(0, 70)
);

await cartaoModelo().getByRole('button').click();
await p.waitForTimeout(300);
const origemPrevista = await p.locator('.bussola__origem').textContent();
const correcaoPrevista = await p.locator('.bussola__linha', { hasText: 'CORREÇÃO APLICADA' }).first().innerText();
conferir(
  'ligar o modelo dá azimute PREVISTO, não CORRIGIDO',
  /PREVISTO/.test(origemPrevista) && !/CORRIGIDO/.test(origemPrevista) && /prevista pelo WMM/.test(correcaoPrevista),
  `${origemPrevista.trim()} · ${correcaoPrevista.replace(/\n+/g, ' ').slice(0, 40)}`
);

// ── FLUXO 8: medida ganha de prevista ────────────────────────────────────────
// Com o modelo LIGADO, informar uma declinação tem de tomar a frente: o modelo
// prevê o campo da Terra e não sabe nada sobre este aparelho.
await p.getByLabel(/Declina/i).fill('-18.2');
await p.getByRole('button', { name: /USAR ESTA DECLINA/i }).click();
await p.waitForTimeout(300);
const origemMedida = await p.locator('.bussola__origem').textContent();
const correcaoMedida = await p.locator('.bussola__linha', { hasText: 'CORREÇÃO APLICADA' }).first().innerText();
conferir(
  'medida ganha de prevista mesmo com o modelo ligado',
  /CORRIGIDO/.test(origemMedida) && /-18[.,]2/.test(correcaoMedida) && /informada por você/.test(correcaoMedida),
  `${origemMedida.trim()} · ${correcaoMedida.replace(/\n+/g, ' ').slice(0, 45)}`
);

// ── FLUXO 9: doar não promete pagamento ──────────────────────────────────────
await p.goto(`${BASE}/#/doar`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.locator('.doar__checkout').click();
await p.waitForTimeout(200);
const doar = await p.locator('.doar__status').textContent();
conferir('checkout diz que não está configurado', /CHECKOUT N[ÃA]O CONFIGURADO/i.test(doar) && !/ASAAS_API_KEY/.test(doar), doar.trim().slice(0, 60));

// ── FLUXO 10: tela legada se declara legada ───────────────────────────────────
await p.goto(`${BASE}/#/tiro`, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const legado = await p.locator('.tiro__legado').textContent().catch(() => '');
conferir('tela legada mostra o aviso', /LEGADA/.test(legado) && /Arma 3/.test(legado), legado.trim().slice(0, 60));

// ── FLUXO 12: trocar de tela NÃO encerra a gravação ───────────────────────────
// Este é o fluxo do defeito medido na 1.6.0: o `desmontar()` de `mapa.js`
// chamava `pararGps()`, então conferir a bússola no meio de uma caminhada
// parava a trilha em silêncio. Aqui a pessoa anda, sai do mapa, continua
// andando, e a contagem tem de continuar subindo.
// `.mapa__route-button` veste dois botões (TRAJETO e ROTA); mirar pelo nome.
const botaoRota = p.getByRole('button', { name: /^(INICIAR|PAUSAR|RETOMAR) ROTA$/ });
const pontosGravados = () => p.evaluate(() => {
  // `estado.js` grava envelopado: { schema, version, value }.
  try {
    const bruto = localStorage.getItem('vanguard:trilha');
    if (!bruto) return 0;
    const lido = JSON.parse(bruto);
    const lista = Array.isArray(lido) ? lido : lido?.value;
    return Array.isArray(lista) ? lista.length : -1;
  } catch { return -1; }
});
/** Anda `passos` vezes ~40 m para o norte, esperando o watcher a cada passo. */
const caminhar = async (passos, partida = 0) => {
  for (let i = 1; i <= passos; i += 1) {
    await ctx.setGeolocation({ latitude: -23.5505 + (partida + i) * 0.00036, longitude: -46.6333, accuracy: 8 });
    await p.waitForTimeout(400);
  }
};

await p.goto(`${BASE}/#/mapa`, { waitUntil: 'domcontentloaded' });
await botaoRota.waitFor({ timeout: 15_000 });
await p.evaluate(() => { localStorage.removeItem('vanguard:trilha'); });
await p.reload({ waitUntil: 'domcontentloaded' });
await botaoRota.waitFor({ timeout: 15_000 });
await p.waitForTimeout(1200);
await botaoRota.click();
await p.waitForTimeout(400);
await caminhar(3);
const noMapa = await pontosGravados();
conferir('gravar no mapa acumula pontos', noMapa >= 2, `${noMapa} pontos`);

// A pessoa vai conferir a bússola. A página do mapa é desmontada aqui.
await p.goto(`${BASE}/#/bussola`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
const mapaMontado = await botaoRota.count();
await caminhar(3, 3);
const foraDoMapa = await pontosGravados();
conferir(
  'sair do mapa NÃO encerra a gravação',
  mapaMontado === 0 && foraDoMapa > noMapa,
  `mapa desmontado · ${noMapa} → ${foraDoMapa} pontos`
);

// E o registro continua inteiro ao voltar: nada foi reiniciado.
await p.goto(`${BASE}/#/mapa`, { waitUntil: 'domcontentloaded' });
await botaoRota.waitFor({ timeout: 15_000 });
await p.waitForTimeout(800);
const aoVoltar = await pontosGravados();
conferir('voltar ao mapa reencontra a mesma trilha', aoVoltar >= foraDoMapa, `${aoVoltar} pontos`);

// ── FLUXO 13: o contador de trajeto conta, e conta SEM MAPA ───────────────────
// A pergunta "quantos metros eu andei" não deve exigir o MapLibre (802 kB) nem
// um único tile pela rede. Aqui se cobra as duas coisas: o número sobe, e
// nenhuma requisição de tile sai enquanto a tela está aberta.
const tilesPedidos = [];
const espiao = (req) => {
  const u = req.url();
  if (/tile|\.png|\.jpg|\.pbf|maplibre/i.test(u) && !u.startsWith(BASE)) tilesPedidos.push(u);
};
p.on('request', espiao);

await p.goto(`${BASE}/#/odometro`, { waitUntil: 'domcontentloaded' });
const botaoContador = p.getByRole('button', { name: /^(INICIAR|PAUSAR|RETOMAR)$/ });
await botaoContador.waitFor({ timeout: 15_000 });
// Estado limpo de verdade: o fluxo anterior deixou uma rota ATIVA, e o botão
// deste contador é o mesmo estado — com rota ativa ele diz PAUSAR, e clicar
// pausaria em vez de iniciar. Apagar a trilha sem apagar a rota é um estado
// pela metade.
await p.evaluate(() => {
  for (const k of ['vanguard:trilha', 'vanguard:rotaAtiva', 'vanguard:rotaPausada']) localStorage.removeItem(k);
});
await p.reload({ waitUntil: 'domcontentloaded' });
await botaoContador.waitFor({ timeout: 15_000 });
await p.waitForTimeout(600);
const rotuloInicial = await botaoContador.innerText();
conferir('sem rota, o botão convida a INICIAR', /INICIAR/.test(rotuloInicial), rotuloInicial.trim());

const lerContador = () => p.locator('.odometro__numero').innerText();
const zerado = await lerContador();
conferir('contador começa em zero, não em lixo', zerado.trim() === '0', `"${zerado.trim()}"`);

await botaoContador.click();
await p.waitForTimeout(300);
await caminhar(4, 40);
const andou = await lerContador();
const unidade = await p.locator('.odometro__unidade').innerText();
conferir(
  'o contador SOBE conforme se anda',
  Number(andou.replace(',', '.')) > 0,
  `${andou.trim()} ${unidade.trim()}`
);

const tempo = await p.locator('.odometro__campo', { hasText: 'TEMPO' }).locator('.odometro__campo-valor').innerText();
conferir('o tempo decorrido aparece como tempo, não como segundos crus', /^\d+:\d{2}/.test(tempo.trim()), tempo.trim());

conferir('a tela do contador NÃO pede tile nenhum', tilesPedidos.length === 0, `${tilesPedidos.length} requisição(ões) externas`);
p.off('request', espiao);

// E a contagem é a MESMA rota do mapa: um gravador, nunca dois números.
await p.goto(`${BASE}/#/mapa`, { waitUntil: 'domcontentloaded' });
await botaoRota.waitFor({ timeout: 15_000 });
await p.waitForTimeout(900);
const rotuloNoMapa = await botaoRota.innerText();
conferir(
  'iniciar no contador deixa o mapa já gravando — um gravador só',
  /PAUSAR ROTA/.test(rotuloNoMapa),
  rotuloNoMapa.trim()
);

// ── FLUXO 14: a região offline diz o tamanho ANTES de baixar ─────────────────
// Ninguém aceita 400 MB às cegas, e um app que promete "mapa offline" sem
// dizer o preço mente por omissão. Aqui se cobra que o número apareça sozinho
// ao escolher o raio, e que a nota traga a aritmética do planeta — a recusa
// tem de ser verificável, não uma opinião do desenvolvedor.
await p.goto(`${BASE}/#/mapa`, { waitUntil: 'domcontentloaded' });
await botaoRota.waitFor({ timeout: 15_000 });
await p.waitForTimeout(1500);

const seletorRaio = p.locator('.mapa__regiao-raio');
const statusRegiao = p.locator('.mapa__offline-status').nth(1);
await seletorRaio.selectOption('5');
await p.waitForTimeout(250);
const pequena = await statusRegiao.innerText();
conferir('região pequena mostra tiles e tamanho antes de baixar', /tiles/.test(pequena) && /(MB|kB)/.test(pequena), pequena.trim().slice(0, 72));

await seletorRaio.selectOption('30');
await p.waitForTimeout(250);
const grande = await statusRegiao.innerText();
const mb = (t) => Number((t.match(/([\d.,]+)\s*MB/) ?? [])[1]?.replace(',', '.') ?? 0);
conferir(
  'raio maior custa mais, e TODA opção oferecida cabe de verdade',
  mb(grande) > mb(pequena) && !/grande demais/i.test(grande),
  `5 km: ${mb(pequena)} MB → 30 km: ${mb(grande)} MB`
);

// A recusa também precisa funcionar: a MESMA caixa alarga com o cosseno da
// latitude, então 30 km na Escandinávia custa 3× o que custa em São Paulo.
// Um app que aceitasse os dois estaria mentindo em um deles.
await ctx.setGeolocation({ latitude: 60.2, longitude: 10.5, accuracy: 8 });
await p.reload({ waitUntil: 'domcontentloaded' });
await botaoRota.waitFor({ timeout: 15_000 });
await p.waitForTimeout(1800);
await p.locator('.mapa__regiao-raio').selectOption('30');
await p.waitForTimeout(300);
const noNorte = await p.locator('.mapa__offline-status').nth(1).innerText();
conferir(
  'longe do equador o mesmo raio é recusado, com um raio menor sugerido',
  /grande demais/i.test(noNorte) && /Tente \d+ km/.test(noNorte),
  noNorte.trim().slice(0, 70)
);
await ctx.setGeolocation({ latitude: -23.5505, longitude: -46.6333, accuracy: 12 });

const nota = await p.locator('.mapa__offline-nota').innerText();
conferir(
  'a nota traz a aritmética que explica por que não existe mapa-múndi',
  /268\.435\.456|268,435,456/.test(nota) && /TB/.test(nota),
  nota.trim().slice(0, 78)
);

// ── FLUXO 11: sobre mostra a versão real ──────────────────────────────────────
await p.goto(`${BASE}/#/sobre`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const versao = await p.locator('.sobre__version').textContent();
conferir('sobre mostra a versão real do app', versao.includes(`v${VERSAO}`), versao.trim().slice(0, 40));

await b.close();
console.log(falhas ? `\n${falhas} fluxo(s) com falha` : '\ntodos os fluxos passaram');
process.exit(falhas ? 1 : 0);
